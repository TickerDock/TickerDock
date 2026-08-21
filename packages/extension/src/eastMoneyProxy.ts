import { createServer, IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Transform, TransformCallback } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

const EAST_MONEY_ORIGIN = 'https://quote.eastmoney.com';
const MAX_REWRITE_BYTES = 12 * 1024 * 1024;
const AUTH_QUERY = '__stock_fund_token';
const AUTH_COOKIE = 'stock_fund_proxy';
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 64;
const CACHE_MAX_BYTES = 8 * 1024 * 1024;
const CACHE_ENTRY_MAX_BYTES = 512 * 1024;
const STATIC_RESOURCE = /\.(?:css|js|mjs|json|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)(?:$|\/)/i;
const URL_REWRITES = [
  { source: 'https:\\/\\/quote.eastmoney.com', escaped: true },
  { source: 'http:\\/\\/quote.eastmoney.com', escaped: true },
  { source: 'https://quote.eastmoney.com', escaped: false },
  { source: 'http://quote.eastmoney.com', escaped: false },
  { source: '//quote.eastmoney.com', escaped: false },
] as const;
const MAX_REWRITE_SOURCE_LENGTH = Math.max(...URL_REWRITES.map(({ source }) => source.length), '<meta'.length);

interface CachedResponse {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
  expiresAt: number;
}

export interface EastMoneyProxy {
  origin: string;
  port: number;
  token: string;
}

let service: EastMoneyProxy | undefined;
let server: Server | undefined;
let starting: Promise<EastMoneyProxy> | undefined;
const responseCache = new Map<string, CachedResponse>();
let responseCacheBytes = 0;

export function getEastMoneyProxy(): Promise<EastMoneyProxy> {
  if (service) return Promise.resolve(service);
  if (starting) return starting;
  starting = startProxy().finally(() => { starting = undefined; });
  return starting;
}

export function stopEastMoneyProxy(): void {
  service = undefined;
  responseCache.clear();
  responseCacheBytes = 0;
  const active = server;
  server = undefined;
  active?.close();
}

export function authenticateProxyUrl(value: string, proxy: EastMoneyProxy): string {
  const url = new URL(value);
  if (url.origin !== proxy.origin) return value;
  url.searchParams.set(AUTH_QUERY, proxy.token);
  return url.toString();
}

export function rewriteEastMoneyText(body: string, proxyOrigin: string): string {
  const escapedOrigin = proxyOrigin.replace(/\//g, '\\/');
  return body
    .replace(/<meta\b[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/gi, '')
    .replace(/https?:\\\/\\\/quote\.eastmoney\.com/gi, escapedOrigin)
    .replace(/https?:\/\/quote\.eastmoney\.com/gi, proxyOrigin)
    .replace(/\/\/quote\.eastmoney\.com/gi, proxyOrigin);
}

function startProxy(): Promise<EastMoneyProxy> {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const created = createServer((request, response) => proxyRequest(request, response));
    created.once('error', reject);
    created.listen(0, '127.0.0.1', () => {
      created.removeListener('error', reject);
      created.on('error', (error) => console.error('[tickerdock] EastMoney proxy error', error));
      const address = created.address();
      if (!address || typeof address === 'string') {
        created.close();
        reject(new Error('Could not determine the EastMoney proxy port.'));
        return;
      }
      server = created;
      service = { port: address.port, origin: `http://localhost:${address.port}`, token: randomBytes(24).toString('base64url') };
      console.debug(`[tickerdock] EastMoney proxy listening in ${elapsed(startedAt)}ms`);
      resolve(service);
    });
  });
}

function proxyRequest(request: IncomingMessage, response: ServerResponse): void {
  const startedAt = performance.now();
  if (request.method === 'OPTIONS') {
    if (!isAllowedCorsOrigin(request.headers.origin)) {
      response.writeHead(403);
      response.end();
      return;
    }
    writeCorsHeaders(request, response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD, OPTIONS' });
    response.end();
    return;
  }

  const localUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
  const queryToken = localUrl.searchParams.get(AUTH_QUERY);
  localUrl.searchParams.delete(AUTH_QUERY);
  const cookieToken = readCookie(request.headers.cookie, AUTH_COOKIE);
  if (!service || (!safeTokenEqual(queryToken, service.token)
    && !safeTokenEqual(cookieToken, service.token)
    && !isTrustedProxySubresource(request.headers, service.origin))) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }
  const upstreamUrl = new URL(`${localUrl.pathname}${localUrl.search}`, EAST_MONEY_ORIGIN);
  const cacheKey = `${localUrl.pathname}${localUrl.search}`;
  const cached = request.method === 'GET' ? getCachedResponse(cacheKey) : undefined;
  if (cached) {
    const headers = { ...cached.headers, 'content-length': String(cached.body.length) };
    writeCorsHeaders(request, response, headers);
    response.writeHead(cached.statusCode, headers);
    response.end(cached.body);
    logProxyTiming(cacheKey, startedAt, startedAt, startedAt, cached.body.length, 'hit');
    return;
  }
  const headers: IncomingHttpHeaders = { ...request.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  headers.host = upstreamUrl.host;
  headers.referer = `${EAST_MONEY_ORIGIN}/`;
  if (headers.origin) headers.origin = EAST_MONEY_ORIGIN;
  headers['accept-encoding'] = 'identity';
  headers['user-agent'] ??= 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

  const upstream = httpsRequest(upstreamUrl, {
    method: request.method,
    headers,
  }, (upstreamResponse) => handleUpstreamResponse(
    request, response, upstreamResponse, cacheKey, startedAt, performance.now()
  ));
  upstream.on('error', (error) => {
    if (response.headersSent) return response.destroy(error);
    response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`EastMoney proxy request failed: ${error.message}`);
  });
  request.pipe(upstream);
}

function handleUpstreamResponse(
  request: IncomingMessage,
  response: ServerResponse,
  upstream: IncomingMessage,
  cacheKey: string,
  startedAt: number,
  upstreamAt: number
): void {
  const headers = sanitizeResponseHeaders(upstream.headers);
  const contentType = String(headers['content-type'] ?? '').toLowerCase();
  const rewrite = /(?:text\/(?:html|css)|javascript|json)/.test(contentType);
  const statusCode = upstream.statusCode ?? 502;
  const cacheable = request.method === 'GET' && statusCode === 200 && STATIC_RESOURCE.test(new URL(cacheKey, EAST_MONEY_ORIGIN).pathname)
    && !/(?:no-cache|no-store|private|max-age\s*=\s*0)/i.test(String(upstream.headers['cache-control'] ?? ''));
  const chunks: Buffer[] = [];
  let size = 0;
  let firstByteAt = 0;
  let cacheOverflow = false;
  const capture = (chunk: Buffer | string) => {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (!firstByteAt) firstByteAt = performance.now();
    size += value.length;
    if (cacheable && !cacheOverflow) {
      if (size <= CACHE_ENTRY_MAX_BYTES) chunks.push(value);
      else { cacheOverflow = true; chunks.length = 0; }
    }
  };
  const complete = () => {
    if (cacheable && !cacheOverflow) setCachedResponse(cacheKey, statusCode, headers, Buffer.concat(chunks));
    logProxyTiming(cacheKey, startedAt, upstreamAt, firstByteAt || performance.now(), size, cacheable ? 'miss' : 'skip');
  };

  if (!rewrite) {
    writeCorsHeaders(request, response, headers);
    response.writeHead(statusCode, headers);
    upstream.on('data', capture);
    upstream.on('end', complete);
    upstream.pipe(response);
    return;
  }

  delete headers['content-length'];
  delete headers['content-encoding'];
  writeCorsHeaders(request, response, headers);
  response.writeHead(statusCode, headers);
  const origin = service?.origin;
  if (!origin) {
    upstream.on('data', capture);
    upstream.on('end', complete);
    upstream.pipe(response);
    return;
  }
  const transform = createEastMoneyRewriteStream(origin, contentType.includes('text/html'));
  transform.on('data', capture);
  transform.on('end', complete);
  transform.on('error', (error) => {
    upstream.destroy();
    response.destroy(error);
  });
  upstream.on('error', (error) => response.destroy(error));
  upstream.pipe(transform).pipe(response);
}

export function createEastMoneyRewriteStream(proxyOrigin: string, stripCspMeta = false): Transform {
  return new EastMoneyRewriteTransform(proxyOrigin, stripCspMeta);
}

class EastMoneyRewriteTransform extends Transform {
  private readonly decoder = new StringDecoder('utf8');
  private pending = '';
  private size = 0;

  constructor(private readonly proxyOrigin: string, private readonly stripCspMeta: boolean) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.size += chunk.length;
    if (this.size > MAX_REWRITE_BYTES) {
      callback(new Error('EastMoney proxy response exceeded the rewrite limit.'));
      return;
    }
    this.pending += this.decoder.write(chunk);
    const processed = consumeRewrites(this.pending, this.proxyOrigin, this.stripCspMeta, false);
    this.pending = processed.pending;
    if (processed.output) this.push(processed.output);
    callback();
  }

  override _flush(callback: TransformCallback): void {
    this.pending += this.decoder.end();
    const processed = consumeRewrites(this.pending, this.proxyOrigin, this.stripCspMeta, true);
    if (processed.output) this.push(processed.output);
    callback();
  }
}

function consumeRewrites(
  value: string,
  proxyOrigin: string,
  stripCspMeta: boolean,
  flush: boolean
): { output: string; pending: string } {
  const lower = value.toLowerCase();
  const escapedOrigin = proxyOrigin.replace(/\//g, '\\/');
  let output = '';
  let index = 0;
  while (index < value.length) {
    if (stripCspMeta && lower.startsWith('<meta', index)) {
      const end = value.indexOf('>', index + 5);
      if (end < 0 && !flush) break;
      const tagEnd = end < 0 ? value.length : end + 1;
      const tag = value.slice(index, tagEnd);
      if (!/http-equiv=["']?content-security-policy["']?/i.test(tag)) output += rewriteEastMoneyOrigins(tag, proxyOrigin);
      index = tagEnd;
      continue;
    }
    const rewrite = URL_REWRITES.find(({ source }) => lower.startsWith(source.toLowerCase(), index));
    if (rewrite) {
      output += rewrite.escaped ? escapedOrigin : proxyOrigin;
      index += rewrite.source.length;
      continue;
    }
    if (!flush && value.length - index < MAX_REWRITE_SOURCE_LENGTH) {
      const suffix = lower.slice(index);
      const partialUrl = URL_REWRITES.some(({ source }) => source.toLowerCase().startsWith(suffix));
      const partialMeta = stripCspMeta && '<meta'.startsWith(suffix);
      if (partialUrl || partialMeta) break;
    }
    output += value[index];
    index += 1;
  }
  return { output, pending: value.slice(index) };
}

function rewriteEastMoneyOrigins(body: string, proxyOrigin: string): string {
  const escapedOrigin = proxyOrigin.replace(/\//g, '\\/');
  return body
    .replace(/https?:\\\/\\\/quote\.eastmoney\.com/gi, escapedOrigin)
    .replace(/https?:\/\/quote\.eastmoney\.com/gi, proxyOrigin)
    .replace(/\/\/quote\.eastmoney\.com/gi, proxyOrigin);
}

function getCachedResponse(key: string): CachedResponse | undefined {
  const cached = responseCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    responseCacheBytes -= cached.body.length;
    return undefined;
  }
  responseCache.delete(key);
  responseCache.set(key, cached);
  return cached;
}

function setCachedResponse(key: string, statusCode: number, headers: IncomingHttpHeaders, body: Buffer): void {
  if (!body.length || body.length > CACHE_ENTRY_MAX_BYTES) return;
  const existing = responseCache.get(key);
  if (existing) responseCacheBytes -= existing.body.length;
  const cachedHeaders = { ...headers };
  delete cachedHeaders['set-cookie'];
  delete cachedHeaders['transfer-encoding'];
  delete cachedHeaders.connection;
  delete cachedHeaders['content-length'];
  responseCache.set(key, { statusCode, headers: cachedHeaders, body, expiresAt: Date.now() + CACHE_TTL_MS });
  responseCacheBytes += body.length;
  while (responseCache.size > CACHE_MAX_ENTRIES || responseCacheBytes > CACHE_MAX_BYTES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const oldest = responseCache.get(oldestKey);
    responseCache.delete(oldestKey);
    responseCacheBytes -= oldest?.body.length ?? 0;
  }
}

function logProxyTiming(
  path: string,
  startedAt: number,
  upstreamAt: number,
  firstByteAt: number,
  bytes: number,
  cache: 'hit' | 'miss' | 'skip'
): void {
  const total = performance.now() - startedAt;
  if (total < 100 && cache !== 'hit') return;
  console.debug(
    `[tickerdock] EastMoney proxy ${path} cache=${cache} headers=${Math.round(upstreamAt - startedAt)}ms`
      + ` ttfb=${Math.round(firstByteAt - startedAt)}ms total=${Math.round(total)}ms bytes=${bytes}`
  );
}

function elapsed(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

function sanitizeResponseHeaders(source: IncomingHttpHeaders): IncomingHttpHeaders {
  const headers = { ...source };
  for (const name of [
    'content-security-policy',
    'content-security-policy-report-only',
    'x-frame-options',
    'cross-origin-embedder-policy',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
  ]) delete headers[name];

  const location = headers.location;
  if (typeof location === 'string' && service) {
    headers.location = rewriteEastMoneyText(location, service.origin);
  }
  const cookies = headers['set-cookie'];
  const upstreamCookies = cookies?.map(rewriteCookieForLocalhost) ?? [];
  if (service) headers['set-cookie'] = [
    ...upstreamCookies,
    `${AUTH_COOKIE}=${service.token}; Path=/; HttpOnly; SameSite=Strict`,
  ];
  return headers;
}

function rewriteCookieForLocalhost(cookie: string): string {
  return cookie
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*Secure/gi, '')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
}

function writeCorsHeaders(
  request: IncomingMessage,
  response: ServerResponse,
  headers: IncomingHttpHeaders = {}
): void {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : '*';
  if (isAllowedCorsOrigin(origin)) headers['access-control-allow-origin'] = origin === 'null' ? '*' : origin;
  headers['access-control-allow-methods'] = 'GET,HEAD,OPTIONS';
  headers['access-control-allow-headers'] = String(request.headers['access-control-request-headers'] ?? '*');
  if (isAllowedCorsOrigin(origin) && origin !== '*' && origin !== 'null') headers['access-control-allow-credentials'] = 'true';
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) response.setHeader(name, value);
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function safeTokenEqual(value: string | null | undefined, expected: string): boolean {
  if (!value) return false;
  const actualBytes = Buffer.from(value);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function isTrustedProxySubresource(headers: IncomingHttpHeaders, proxyOrigin: string): boolean {
  if (headers['sec-fetch-site'] !== 'same-origin' || typeof headers.referer !== 'string') return false;
  try {
    return new URL(headers.referer).origin === proxyOrigin;
  } catch {
    return false;
  }
}

function isAllowedCorsOrigin(value: string | string[] | undefined): boolean {
  if (value === undefined || value === 'null' || value === '*') return true;
  if (Array.isArray(value)) return false;
  try {
    const origin = new URL(value);
    return origin.protocol === 'vscode-webview:'
      || origin.hostname === 'localhost'
      || origin.hostname === '127.0.0.1'
      || (origin.protocol === 'https:' && origin.hostname.endsWith('.vscode-cdn.net'));
  } catch {
    return false;
  }
}

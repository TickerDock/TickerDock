import { createServer, IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';

const EAST_MONEY_ORIGIN = 'https://quote.eastmoney.com';
const MAX_REWRITE_BYTES = 12 * 1024 * 1024;

export interface EastMoneyProxy {
  origin: string;
  port: number;
}

let service: EastMoneyProxy | undefined;
let server: Server | undefined;
let starting: Promise<EastMoneyProxy> | undefined;

export function getEastMoneyProxy(): Promise<EastMoneyProxy> {
  if (service) return Promise.resolve(service);
  if (starting) return starting;
  starting = startProxy().finally(() => { starting = undefined; });
  return starting;
}

export function stopEastMoneyProxy(): void {
  service = undefined;
  const active = server;
  server = undefined;
  active?.close();
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
  return new Promise((resolve, reject) => {
    const created = createServer((request, response) => proxyRequest(request, response));
    created.once('error', reject);
    created.listen(0, '127.0.0.1', () => {
      created.removeListener('error', reject);
      created.on('error', (error) => console.error('[stock-fund] EastMoney proxy error', error));
      const address = created.address();
      if (!address || typeof address === 'string') {
        created.close();
        reject(new Error('Could not determine the EastMoney proxy port.'));
        return;
      }
      server = created;
      service = { port: address.port, origin: `http://localhost:${address.port}` };
      resolve(service);
    });
  });
}

function proxyRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.method === 'OPTIONS') {
    writeCorsHeaders(request, response);
    response.writeHead(204);
    response.end();
    return;
  }

  const localUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
  const upstreamUrl = new URL(`${localUrl.pathname}${localUrl.search}`, EAST_MONEY_ORIGIN);
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
  }, (upstreamResponse) => handleUpstreamResponse(request, response, upstreamResponse));
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
  upstream: IncomingMessage
): void {
  const headers = sanitizeResponseHeaders(upstream.headers);
  const contentType = String(headers['content-type'] ?? '').toLowerCase();
  const rewrite = /(?:text\/(?:html|css)|javascript|json)/.test(contentType);
  if (!rewrite) {
    writeCorsHeaders(request, response, headers);
    response.writeHead(upstream.statusCode ?? 502, headers);
    upstream.pipe(response);
    return;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  upstream.on('data', (chunk: Buffer | string) => {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size <= MAX_REWRITE_BYTES) chunks.push(value);
  });
  upstream.on('end', () => {
    delete headers['content-length'];
    delete headers['content-encoding'];
    writeCorsHeaders(request, response, headers);
    response.writeHead(upstream.statusCode ?? 502, headers);
    if (size > MAX_REWRITE_BYTES) {
      response.end('EastMoney proxy response exceeded the rewrite limit.');
      return;
    }
    const origin = service?.origin;
    const body = Buffer.concat(chunks).toString('utf8');
    response.end(origin ? rewriteEastMoneyText(body, origin) : body);
  });
  upstream.on('error', (error) => response.destroy(error));
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
  if (cookies) headers['set-cookie'] = cookies.map(rewriteCookieForLocalhost);
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
  headers['access-control-allow-origin'] = origin === 'null' ? '*' : origin;
  headers['access-control-allow-methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
  headers['access-control-allow-headers'] = String(request.headers['access-control-request-headers'] ?? '*');
  if (origin !== '*' && origin !== 'null') headers['access-control-allow-credentials'] = 'true';
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) response.setHeader(name, value);
  }
}

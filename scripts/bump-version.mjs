import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MANIFESTS = [
  new URL('../package.json', import.meta.url),
  new URL('../packages/extension/package.json', import.meta.url),
];
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function parseVersion(value) {
  const match = SEMVER.exec(value);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  };
}

export function nextVersion(current, requested) {
  const version = parseVersion(current);
  if (requested === 'major') return `${version.major + 1}.0.0`;
  if (requested === 'minor') return `${version.major}.${version.minor + 1}.0`;
  if (requested === 'patch') return `${version.major}.${version.minor}.${version.patch + 1}`;
  parseVersion(requested);
  if (compareVersions(requested, current) <= 0) {
    throw new Error(`New version ${requested} must be greater than current version ${current}.`);
  }
  return requested;
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length ? -1 : 1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const aPart = a.prerelease[index];
    const bPart = b.prerelease[index];
    if (aPart === undefined || bPart === undefined) return aPart === undefined ? -1 : 1;
    if (aPart === bPart) continue;
    const aNumber = /^\d+$/.test(aPart) ? Number(aPart) : undefined;
    const bNumber = /^\d+$/.test(bPart) ? Number(bPart) : undefined;
    if (aNumber !== undefined && bNumber !== undefined) return aNumber < bNumber ? -1 : 1;
    if (aNumber !== undefined || bNumber !== undefined) return aNumber !== undefined ? -1 : 1;
    return aPart < bPart ? -1 : 1;
  }
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((value) => value !== '--dry-run');
  const requested = positional[0] ?? 'patch';
  if (positional.length > 1 || !['patch', 'minor', 'major'].includes(requested) && !SEMVER.test(requested)) {
    throw new Error('Usage: pnpm bump-version [patch|minor|major|x.y.z] [--dry-run]');
  }

  const manifests = await Promise.all(MANIFESTS.map(async (url) => ({
    url,
    data: JSON.parse(await readFile(url, 'utf8')),
  })));
  const versions = new Set(manifests.map(({ data }) => data.version));
  if (versions.size !== 1) {
    throw new Error(`Release manifest versions do not match: ${[...versions].join(', ')}`);
  }
  const current = manifests[0].data.version;
  const next = nextVersion(current, requested);

  if (!dryRun) {
    await Promise.all(manifests.map(({ url, data }) => writeFile(
      url,
      `${JSON.stringify({ ...data, version: next }, null, 2)}\n`,
      'utf8'
    )));
  }
  const paths = manifests.map(({ url }) => fileURLToPath(url)).join(', ');
  console.log(`${dryRun ? 'Would update' : 'Updated'} TickerDock ${current} -> ${next}`);
  console.log(paths);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (entry === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

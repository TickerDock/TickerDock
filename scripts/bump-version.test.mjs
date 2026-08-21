import assert from 'node:assert/strict';
import test from 'node:test';
import { compareVersions, nextVersion, parseVersion } from './bump-version.mjs';

test('increments stable semantic versions', () => {
  assert.equal(nextVersion('0.1.5', 'patch'), '0.1.6');
  assert.equal(nextVersion('0.1.5', 'minor'), '0.2.0');
  assert.equal(nextVersion('0.1.5', 'major'), '1.0.0');
  assert.equal(nextVersion('0.1.5', '0.3.0'), '0.3.0');
});

test('validates explicit versions and prevents downgrades', () => {
  assert.throws(() => parseVersion('v1.2.3'), /Invalid semantic version/);
  assert.throws(() => nextVersion('1.2.3', '1.2.3'), /must be greater/);
  assert.throws(() => nextVersion('1.2.3', '1.1.9'), /must be greater/);
  assert.equal(compareVersions('1.2.3-beta.2', '1.2.3-beta.1'), 1);
  assert.equal(compareVersions('1.2.3', '1.2.3-beta.2'), 1);
});

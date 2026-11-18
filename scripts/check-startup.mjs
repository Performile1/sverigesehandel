import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Do not let a local Node version's require(ESM) support hide the production
// failure. Run the real API entrypoint in a fresh Node process, without secrets.
const entrypoint = new URL('../api/index.ts', import.meta.url).href;
const child = spawnSync(process.execPath, [
  '--no-experimental-require-module',
  '--experimental-strip-types',
  '--input-type=module',
  '-e', `
    import assert from 'node:assert/strict';
    const { default: app } = await import(${JSON.stringify(entrypoint)});
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/merchants', { method: 'POST' });
      assert.equal(response.status, 401);
      assert.match(response.headers.get('content-type'), /application\\/json/);
      assert.match((await response.json()).error, /CMS/);
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  `,
], { encoding: 'utf8', timeout: 30_000,
  env: Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !key.startsWith('FIREBASE_') && !key.startsWith('GOOGLE_') && key !== 'NODE_OPTIONS')),
});
assert.ifError(child.error);
assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
console.log('API startup passes without require(ESM); unauthenticated writes return JSON 401.');

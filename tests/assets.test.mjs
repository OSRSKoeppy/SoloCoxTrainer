import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {readAssetJson} from '../src/assets.mjs';

test('GitHub Pages raw gzip assets decode', async () => {
  const asset={name:'Olm',vertices:[1,2,3]};
  assert.deepEqual(await readAssetJson(new Response(gzipSync(JSON.stringify(asset)))),asset);
});
test('Content-Encoding decoded assets and ordinary JSON decode', async () => {
  assert.deepEqual(await readAssetJson(new Response('{"frames":[4,5]}')),{frames:[4,5]});
});
test('invalid asset payloads fail instead of silently loading', async () => {
  await assert.rejects(readAssetJson(new Response('<html>404</html>')),SyntaxError);
});

// Static hosts may serve .gz files as raw bytes; local servers may decompress
// them through Content-Encoding. Detect the payload so both paths work.
export async function readAssetJson(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

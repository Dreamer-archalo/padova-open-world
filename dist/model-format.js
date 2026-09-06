// Shared validation for the contributor import command and its regression checks.
export function inspectGLB(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0,true) !== 0x46546c67 || view.getUint32(4,true) !== 2) throw new Error('Expected a glTF 2.0 GLB file');
  if (buffer.byteLength > 20 * 1024 * 1024) throw new Error('Optimise the model below 20 MB first');
  if (view.getUint32(8,true) !== buffer.byteLength) throw new Error('Truncated GLB');
  const jsonLength = view.getUint32(12,true);
  if (view.getUint32(16,true) !== 0x4e4f534a || jsonLength > buffer.byteLength - 20) throw new Error('Invalid GLB JSON chunk');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
  if (json.asset?.version !== '2.0') throw new Error('Expected glTF 2.0');
  if (!(json.meshes?.length > 0)) throw new Error('The file contains no meshes');
  if ((json.buffers || []).some(b => b.uri) || (json.images || []).some(i => i.uri)) throw new Error('Embed all buffers and textures in one GLB');
  const supported = new Set(['KHR_materials_unlit','KHR_texture_transform','KHR_materials_emissive_strength','KHR_materials_ior','KHR_materials_specular','KHR_materials_clearcoat','KHR_materials_transmission','KHR_materials_volume','KHR_materials_sheen','KHR_materials_iridescence','KHR_materials_anisotropy','KHR_mesh_quantization']);
  for (const extension of json.extensionsRequired || []) if (!supported.has(extension)) throw new Error('Export without ' + extension + ' compression/extensions');
  let triangles = 0;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives || []) {
    if ((primitive.mode ?? 4) !== 4) throw new Error('Export triangulated meshes');
    const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
    if (!accessor || !Number.isInteger(accessor.count) || accessor.count <= 0) throw new Error('Invalid mesh accessor');
    triangles += accessor.count / 3;
  }
  if (triangles > 250000) throw new Error('Decimate to at most 250,000 triangles per building');
  return {triangles:Math.ceil(triangles),bytes:buffer.byteLength,meshes:json.meshes.length,json};
}

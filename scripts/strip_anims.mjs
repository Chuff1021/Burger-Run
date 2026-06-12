// Strips meshes/materials/textures/skins from a GLB, keeping only the node
// hierarchy + animation tracks — tiny clip files that retarget onto the rig.
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

const [src, out] = process.argv.slice(2);
const io = new NodeIO();
const doc = await io.read(src);
const root = doc.getRoot();
for (const m of root.listMeshes()) m.dispose();
for (const s of root.listSkins()) s.dispose();
for (const m of root.listMaterials()) m.dispose();
for (const t of root.listTextures()) t.dispose();
await doc.transform(prune());
await io.write(out, doc);
const { statSync } = await import('fs');
console.log(out.split('/').pop(), Math.round(statSync(out).size / 1024) + 'KB');

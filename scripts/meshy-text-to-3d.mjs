import { resolve } from 'node:path';
import { downloadFile, meshyJson, parseArgs, pollTask, slugify } from './meshy-utils.mjs';

const args = parseArgs(process.argv.slice(2));
const prompt = args.prompt;
if (!prompt || typeof prompt !== 'string') {
  throw new Error('Usage: npm run meshy:text-to-3d -- --prompt "asset description" [--name asset-name] [--preview-only]');
}

const name = slugify(args.name || prompt);
const outDir = resolve(process.cwd(), 'public/models/generated', name);
const targetPolycount = Number(args.polycount ?? 18000);
const shouldRefine = !args['preview-only'];

const previewRequest = {
  mode: 'preview',
  prompt,
  ai_model: 'latest',
  should_remesh: true,
  topology: 'triangle',
  target_polycount: targetPolycount,
  target_formats: ['glb'],
  moderation: true
};

console.log(`Creating Meshy preview task for ${name}...`);
const previewResponse = await meshyJson('/openapi/v2/text-to-3d', {
  method: 'POST',
  body: JSON.stringify(previewRequest)
});
const previewTaskId = previewResponse.result;
console.log(`Preview task: ${previewTaskId}`);

const previewTask = await pollTask(`/openapi/v2/text-to-3d/${previewTaskId}`, { label: 'preview' });
if (!previewTask.model_urls?.glb) throw new Error('Preview task succeeded but did not return a GLB URL.');

const previewPath = resolve(outDir, `${name}.preview.glb`);
const previewBytes = await downloadFile(previewTask.model_urls.glb, previewPath);
console.log(`Saved preview GLB: ${previewPath} (${previewBytes} bytes)`);

if (!shouldRefine) {
  console.log('Preview-only mode complete.');
  process.exit(0);
}

const refineRequest = {
  mode: 'refine',
  preview_task_id: previewTaskId,
  ai_model: 'latest',
  enable_pbr: true,
  target_formats: ['glb'],
  moderation: true,
  texture_prompt: args.texture || 'premium mobile game asset, cyberpunk burger factory, gunmetal, glowing red orange gold and electric blue accents, clean PBR texture, readable silhouette'
};

console.log('Creating Meshy refine task...');
const refineResponse = await meshyJson('/openapi/v2/text-to-3d', {
  method: 'POST',
  body: JSON.stringify(refineRequest)
});
const refineTaskId = refineResponse.result;
console.log(`Refine task: ${refineTaskId}`);

const refineTask = await pollTask(`/openapi/v2/text-to-3d/${refineTaskId}`, { label: 'refine' });
if (!refineTask.model_urls?.glb) throw new Error('Refine task succeeded but did not return a GLB URL.');

const refinedPath = resolve(outDir, `${name}.glb`);
const refinedBytes = await downloadFile(refineTask.model_urls.glb, refinedPath);
console.log(`Saved refined GLB: ${refinedPath} (${refinedBytes} bytes)`);
console.log(`Use in React Three Fiber from /models/generated/${name}/${name}.glb`);

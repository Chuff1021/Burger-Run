import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const MESHY_API_BASE = 'https://api.meshy.ai';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const contents = readFileSync(path, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

export function loadProjectEnv() {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));
}

export function requireMeshyKey() {
  loadProjectEnv();
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new Error('Missing MESHY_API_KEY. Add it to .env.local or export it in your shell.');
  }
  return key;
}

export async function meshyFetch(path, options = {}) {
  const key = requireMeshyKey();
  const response = await fetch(`${MESHY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let details = '';
    try {
      details = JSON.stringify(await response.json());
    } catch {
      details = await response.text();
    }
    throw new Error(`Meshy request failed (${response.status} ${response.statusText}): ${details}`);
  }

  return response;
}

export async function meshyJson(path, options = {}) {
  const response = await meshyFetch(path, options);
  return response.json();
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status} ${response.statusText})`);
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, bytes);
  return bytes.length;
}

export async function pollTask(path, { label, intervalMs = 5000, timeoutMs = 20 * 60 * 1000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const task = await meshyJson(path);
    const progress = typeof task.progress === 'number' ? `${task.progress}%` : 'pending';
    console.log(`${label ?? 'task'} ${task.status} ${progress}`);
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED') {
      throw new Error(`${label ?? 'task'} failed: ${task.task_error?.message ?? 'unknown Meshy error'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`${label ?? 'task'} timed out after ${Math.round(timeoutMs / 1000)}s`);
}

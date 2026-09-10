import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInitialState, validateState } from './state.js';

export async function loadState(file) {
  try {
    const raw = await readFile(file, 'utf8');
    return validateState(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') return createInitialState();
    throw error;
  }
}

export async function saveState(file, state) {
  validateState(state);
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporary, file);
}

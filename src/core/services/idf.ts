import type { IdfStatus, Result } from '@/core/types';
import { DEFAULT_IDF_PATH } from '@/core/constants';
import { access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { execa } from 'execa';

export async function findIdfPath(): Promise<string | null> {
  if (process.env.IDF_PATH) {
    try {
      await access(process.env.IDF_PATH);
      return process.env.IDF_PATH;
    } catch {}
  }

  try {
    await access(DEFAULT_IDF_PATH);
    return DEFAULT_IDF_PATH;
  } catch {}

  return null;
}

export async function getIdfVersion(idfPath: string): Promise<string | null> {
  const versionFile = join(idfPath, 'version.txt');

  try {
    const content = await readFile(versionFile, 'utf-8');
    return content.trim();
  } catch {}

  try {
    const result = await execa('git', ['describe', '--tags'], { cwd: idfPath });
    return result.stdout.trim();
  } catch {}

  return null;
}

export async function getIdfStatus(): Promise<IdfStatus> {
  const path = await findIdfPath();

  if (!path) {
    return { installed: false };
  }

  const version = await getIdfVersion(path);

  return {
    installed: true,
    path,
    version: version || undefined,
  };
}

export async function isIdfProject(dir: string): Promise<boolean> {
  const cmakePath = join(dir, 'CMakeLists.txt');

  try {
    const content = await readFile(cmakePath, 'utf-8');
    return content.includes('$ENV{IDF_PATH}') || content.includes('idf_component_register');
  } catch {
    return false;
  }
}

export async function findProjectRoot(startDir: string): Promise<string | null> {
  let current = startDir;

  while (current !== dirname(current)) {
    if (await isIdfProject(current)) {
      return current;
    }
    current = dirname(current);
  }

  return null;
}

export function getExportScript(idfPath: string): string {
  return join(idfPath, 'export.sh');
}

export async function validateIdfInstallation(idfPath: string): Promise<Result<void>> {
  try {
    await access(idfPath);
  } catch {
    return { ok: false, error: `IDF path does not exist: ${idfPath}` };
  }

  const exportScript = getExportScript(idfPath);
  try {
    await access(exportScript);
  } catch {
    return { ok: false, error: `export.sh not found in ${idfPath}` };
  }

  return { ok: true, data: undefined };
}

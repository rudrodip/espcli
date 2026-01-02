import type { Result } from '@/core/types';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

export const CONFIG_FILENAME = 'espcli.json';

export interface ProjectConfig {
  target?: string;
  port?: string;
  flashBaud?: number;
  monitorBaud?: number;
}

export async function loadConfig(projectDir: string): Promise<ProjectConfig> {
  const configPath = join(projectDir, CONFIG_FILENAME);

  try {
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content) as ProjectConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(projectDir: string, config: ProjectConfig): Promise<Result<void>> {
  const configPath = join(projectDir, CONFIG_FILENAME);

  try {
    const content = JSON.stringify(config, null, 2) + '\n';
    await writeFile(configPath, content, 'utf-8');
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: `Failed to save config: ${err}` };
  }
}

export async function updateConfig(
  projectDir: string,
  updates: Partial<ProjectConfig>
): Promise<Result<ProjectConfig>> {
  const existing = await loadConfig(projectDir);
  const merged = { ...existing, ...updates };

  const result = await saveConfig(projectDir, merged);
  if (!result.ok) {
    return result;
  }

  return { ok: true, data: merged };
}

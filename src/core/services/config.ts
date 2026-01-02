import type { Result } from '@/core/types';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

export const CONFIG_FILENAME = '.espcli';

export interface ProjectConfig {
  target?: string;
  port?: string;
  flashBaud?: number;
  monitorBaud?: number;
}

function parseConfig(content: string): ProjectConfig {
  const config: ProjectConfig = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    switch (key) {
      case 'target':
        config.target = value;
        break;
      case 'port':
        config.port = value;
        break;
      case 'flash_baud':
        config.flashBaud = parseInt(value, 10) || undefined;
        break;
      case 'monitor_baud':
        config.monitorBaud = parseInt(value, 10) || undefined;
        break;
    }
  }

  return config;
}

function serializeConfig(config: ProjectConfig): string {
  const lines: string[] = [];

  if (config.target) lines.push(`target=${config.target}`);
  if (config.port) lines.push(`port=${config.port}`);
  if (config.flashBaud) lines.push(`flash_baud=${config.flashBaud}`);
  if (config.monitorBaud) lines.push(`monitor_baud=${config.monitorBaud}`);

  return lines.join('\n') + '\n';
}

export async function configExists(projectDir: string): Promise<boolean> {
  const configPath = join(projectDir, CONFIG_FILENAME);
  try {
    await access(configPath);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(projectDir: string): Promise<ProjectConfig> {
  const configPath = join(projectDir, CONFIG_FILENAME);

  try {
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    return parseConfig(content);
  } catch {
    return {};
  }
}

export async function saveConfig(projectDir: string, config: ProjectConfig): Promise<Result<void>> {
  const configPath = join(projectDir, CONFIG_FILENAME);

  try {
    const content = serializeConfig(config);
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

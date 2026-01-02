import { ResultAsync, ok } from 'neverthrow';
import { AppError } from '@/core/errors';
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

export function configExists(projectDir: string): ResultAsync<boolean, AppError> {
  const configPath = join(projectDir, CONFIG_FILENAME);

  return ResultAsync.fromPromise(
    access(configPath).then(() => true),
    () => AppError.fileNotFound(configPath)
  ).orElse(() => ok(false));
}

export function loadConfig(projectDir: string): ResultAsync<ProjectConfig, AppError> {
  const configPath = join(projectDir, CONFIG_FILENAME);

  return ResultAsync.fromPromise(access(configPath), () => AppError.fileNotFound(configPath))
    .andThen(() =>
      ResultAsync.fromPromise(
        readFile(configPath, 'utf-8'),
        (e) => AppError.configReadFailed(configPath, e instanceof Error ? e : undefined)
      )
    )
    .map(parseConfig)
    .orElse(() => ok({})); // Return empty config if file doesn't exist
}

export function saveConfig(projectDir: string, config: ProjectConfig): ResultAsync<void, AppError> {
  const configPath = join(projectDir, CONFIG_FILENAME);
  const content = serializeConfig(config);

  return ResultAsync.fromPromise(
    writeFile(configPath, content, 'utf-8'),
    (e) => AppError.configWriteFailed(configPath, e instanceof Error ? e : undefined)
  );
}

export function updateConfig(
  projectDir: string,
  updates: Partial<ProjectConfig>
): ResultAsync<ProjectConfig, AppError> {
  return loadConfig(projectDir).andThen((existing) => {
    const merged = { ...existing, ...updates };
    return saveConfig(projectDir, merged).map(() => merged);
  });
}

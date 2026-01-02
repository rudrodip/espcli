import type { ShellInfo, ShellType, Result } from '@/core/types';
import { SHELL_CONFIGS } from '@/core/constants';
import { homedir } from 'os';
import { join } from 'path';
import { readFile, appendFile, access } from 'fs/promises';

export function detectShell(): ShellType {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('fish')) return 'fish';
  return 'unknown';
}

export function getShellInfo(): ShellInfo {
  const type = detectShell();
  const configFile = SHELL_CONFIGS[type] || '';
  const configPath = configFile ? join(homedir(), configFile) : '';

  return { type, configPath };
}

export async function shellConfigExists(): Promise<boolean> {
  const { configPath } = getShellInfo();
  if (!configPath) return false;

  try {
    await access(configPath);
    return true;
  } catch {
    return false;
  }
}

export async function isLineInShellConfig(line: string): Promise<boolean> {
  const { configPath } = getShellInfo();
  if (!configPath) return false;

  try {
    const content = await readFile(configPath, 'utf-8');
    return content.includes(line);
  } catch {
    return false;
  }
}

export async function addToShellConfig(line: string): Promise<Result<void>> {
  const { configPath, type } = getShellInfo();

  if (!configPath) {
    return { ok: false, error: `Unsupported shell: ${type}` };
  }

  const alreadyExists = await isLineInShellConfig(line);
  if (alreadyExists) {
    return { ok: true, data: undefined };
  }

  try {
    await appendFile(configPath, `\n${line}\n`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: `Failed to modify ${configPath}: ${err}` };
  }
}

export function getExportCommand(idfPath: string): string {
  const shellType = detectShell();

  if (shellType === 'fish') {
    return `source ${idfPath}/export.fish`;
  }
  return `. ${idfPath}/export.sh`;
}

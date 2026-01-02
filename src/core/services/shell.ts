import type { ShellInfo, ShellType } from '@/core/types';
import { ResultAsync, ok, err } from 'neverthrow';
import { AppError } from '@/core/errors';
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

export function shellConfigExists(): ResultAsync<boolean, AppError> {
  const { configPath } = getShellInfo();

  if (!configPath) {
    return ResultAsync.fromSafePromise(Promise.resolve(false));
  }

  return ResultAsync.fromPromise(
    access(configPath).then(() => true),
    () => AppError.fileNotFound(configPath)
  ).orElse(() => ok(false));
}

export function isLineInShellConfig(line: string): ResultAsync<boolean, AppError> {
  const { configPath } = getShellInfo();

  if (!configPath) {
    return ResultAsync.fromSafePromise(Promise.resolve(false));
  }

  return ResultAsync.fromPromise(
    readFile(configPath, 'utf-8'),
    () => AppError.fileReadFailed(configPath)
  )
    .map((content) => content.includes(line))
    .orElse(() => ok(false));
}

export function addToShellConfig(line: string): ResultAsync<void, AppError> {
  const { configPath, type } = getShellInfo();

  if (!configPath) {
    return ResultAsync.fromPromise(
      Promise.reject(AppError.shellUnsupported(type)),
      (e) => e as AppError
    );
  }

  return isLineInShellConfig(line).andThen((exists) => {
    if (exists) {
      return ResultAsync.fromSafePromise(Promise.resolve(undefined));
    }

    return ResultAsync.fromPromise(
      appendFile(configPath, `\n${line}\n`),
      (e) => AppError.shellConfigFailed(configPath, e instanceof Error ? e : undefined)
    );
  });
}

export function getExportCommand(idfPath: string): string {
  const shellType = detectShell();

  if (shellType === 'fish') {
    return `source ${idfPath}/export.fish`;
  }
  return `. ${idfPath}/export.sh`;
}

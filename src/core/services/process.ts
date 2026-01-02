import type { Result } from '@/core/types';
import { execa, type Options as ExecaOptions, type ResultPromise } from 'execa';
import { findIdfPath, getExportScript } from '@/core/services/idf';
import { emitter } from '@/core/emitter';

export interface RunOptions {
  cwd?: string;
  operationId?: string;
  env?: Record<string, string>;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function run(
  command: string,
  args: string[],
  options: RunOptions = {}
): Promise<Result<RunResult>> {
  const { cwd, operationId, env } = options;

  const execaOpts: ExecaOptions = {
    cwd,
    env: { ...process.env, ...env },
    reject: false,
  };

  try {
    const proc = execa(command, args, execaOpts);

    if (operationId) {
      proc.stdout?.on('data', (data: Buffer) => {
        emitter.emit(operationId, { type: 'stdout', text: data.toString() });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        emitter.emit(operationId, { type: 'stderr', text: data.toString() });
      });
    }

    const result = await proc;

    return {
      ok: true,
      data: {
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
        exitCode: result.exitCode ?? 0,
      },
    };
  } catch (err) {
    return { ok: false, error: `Failed to execute ${command}: ${err}` };
  }
}

export async function runWithIdf(
  command: string,
  args: string[],
  options: RunOptions = {}
): Promise<Result<RunResult>> {
  const idfPath = await findIdfPath();

  if (!idfPath) {
    return { ok: false, error: 'ESP-IDF not found. Run `espcli install` first.', code: 'IDF_NOT_FOUND' };
  }

  const exportScript = getExportScript(idfPath);
  const fullCommand = `source ${exportScript} > /dev/null 2>&1 && ${command} ${args.join(' ')}`;

  const { cwd, operationId, env } = options;

  const execaOpts: ExecaOptions = {
    cwd,
    env: { ...process.env, ...env },
    shell: true,
    reject: false,
  };

  try {
    const proc = execa(fullCommand, [], execaOpts);

    if (operationId) {
      proc.stdout?.on('data', (data: Buffer) => {
        emitter.emit(operationId, { type: 'stdout', text: data.toString() });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        emitter.emit(operationId, { type: 'stderr', text: data.toString() });
      });
    }

    const result = await proc;

    return {
      ok: true,
      data: {
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
        exitCode: result.exitCode ?? 0,
      },
    };
  } catch (err) {
    return { ok: false, error: `Failed to execute ${command}: ${err}` };
  }
}

export interface SpawnOptions extends RunOptions {
  interactive?: boolean;
}

export async function spawnWithIdf(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<{ proc: ResultPromise; promise: Promise<void> } | null> {
  const idfPath = await findIdfPath();

  if (!idfPath) {
    return null;
  }

  const exportScript = getExportScript(idfPath);
  const fullCommand = `source ${exportScript} > /dev/null 2>&1 && ${command} ${args.join(' ')}`;

  const { cwd, operationId, env, interactive } = options;

  const proc = execa(fullCommand, [], {
    cwd,
    env: { ...process.env, ...env },
    shell: true,
    reject: false,
    stdin: interactive ? 'inherit' : 'pipe',
    stdout: interactive ? 'inherit' : 'pipe',
    stderr: interactive ? 'inherit' : 'pipe',
  });

  if (operationId && !interactive) {
    proc.stdout?.on('data', (data: Buffer) => {
      emitter.emit(operationId, { type: 'stdout', text: data.toString() });
    });

    proc.stderr?.on('data', (data: Buffer) => {
      emitter.emit(operationId, { type: 'stderr', text: data.toString() });
    });
  }

  const promise = proc.then(() => {});

  return { proc, promise };
}

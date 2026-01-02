import { ResultAsync, ok, err } from 'neverthrow';
import { AppError } from '@/core/errors';
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

export function run(command: string, args: string[], options: RunOptions = {}): ResultAsync<RunResult, AppError> {
  const { cwd, operationId, env } = options;

  const execaOpts: ExecaOptions = {
    cwd,
    env: { ...process.env, ...env },
    reject: false,
  };

  return ResultAsync.fromPromise(
    (async () => {
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
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
        exitCode: result.exitCode ?? 0,
      };
    })(),
    (e) => AppError.commandFailed(command, String(e), e instanceof Error ? e : undefined)
  );
}

export function runWithIdf(
  command: string,
  args: string[],
  options: RunOptions = {}
): ResultAsync<RunResult, AppError> {
  return findIdfPath().andThen((idfPath) => {
    const exportScript = getExportScript(idfPath);
    const fullCommand = `source ${exportScript} > /dev/null 2>&1 && ${command} ${args.join(' ')}`;

    const { cwd, operationId, env } = options;

    const execaOpts: ExecaOptions = {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      reject: false,
    };

    return ResultAsync.fromPromise(
      (async () => {
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
          stdout: String(result.stdout ?? ''),
          stderr: String(result.stderr ?? ''),
          exitCode: result.exitCode ?? 0,
        };
      })(),
      (e) => AppError.commandFailed(command, String(e), e instanceof Error ? e : undefined)
    );
  });
}

export interface SpawnOptions extends RunOptions {
  interactive?: boolean;
}

export interface SpawnResult {
  proc: ResultPromise;
  promise: Promise<void>;
}

export function spawnWithIdf(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): ResultAsync<SpawnResult, AppError> {
  return findIdfPath().map((idfPath) => {
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
  });
}

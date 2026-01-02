import type { BuildConfig } from '@/core/types';
import { ResultAsync, ok, err } from 'neverthrow';
import { AppError } from '@/core/errors';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';
import { isIdfProject } from '@/core/services/idf';

export interface BuildResult {
  success: boolean;
  projectDir: string;
}

export function build(config: BuildConfig, operationId?: string): ResultAsync<BuildResult, AppError> {
  const opId = operationId || createOperationId();
  const { projectDir, target, clean } = config;

  return isIdfProject(projectDir).andThen((isProject) => {
    if (!isProject) {
      const error = AppError.notIdfProject(projectDir);
      emitter.emit(opId, { type: 'error', message: error.message });
      return err(error);
    }

    // Chain: set target (optional) -> clean (optional) -> build
    let chain: ResultAsync<void, AppError> = ResultAsync.fromSafePromise(Promise.resolve(undefined));

    if (target) {
      chain = chain.andThen(() => {
        emitter.emit(opId, { type: 'progress', message: `Setting target to ${target}...` });

        return runWithIdf('idf.py', ['set-target', target], {
          cwd: projectDir,
          operationId: opId,
        }).andThen((result) => {
          if (result.exitCode !== 0) {
            return err(AppError.commandFailed('idf.py', 'Failed to set target'));
          }
          return ok(undefined);
        });
      });
    }

    if (clean) {
      chain = chain.andThen(() => {
        emitter.emit(opId, { type: 'progress', message: 'Cleaning...' });

        return runWithIdf('idf.py', ['clean'], {
          cwd: projectDir,
          operationId: opId,
        }).map(() => undefined);
      });
    }

    return chain.andThen(() => {
      emitter.emit(opId, { type: 'progress', message: 'Building project...' });

      return runWithIdf('idf.py', ['build'], {
        cwd: projectDir,
        operationId: opId,
      }).andThen((result) => {
        if (result.exitCode !== 0) {
          const error = AppError.buildFailed('Build failed');
          emitter.emit(opId, { type: 'error', message: error.message });
          return err(error);
        }

        const buildResult = { success: true, projectDir };
        emitter.emit(opId, { type: 'complete', result: buildResult });
        return ok(buildResult);
      });
    });
  });
}

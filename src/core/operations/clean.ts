import type { CleanConfig } from '@/core/types';
import { ResultAsync, err } from 'neverthrow';
import { AppError } from '@/core/errors';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';
import { isIdfProject } from '@/core/services/idf';

export function clean(config: CleanConfig, operationId?: string): ResultAsync<void, AppError> {
  const opId = operationId || createOperationId();
  const { projectDir, full } = config;

  return isIdfProject(projectDir).andThen((isProject) => {
    if (!isProject) {
      const error = AppError.notIdfProject(projectDir);
      emitter.emit(opId, { type: 'error', message: error.message });
      return err(error);
    }

    const command = full ? 'fullclean' : 'clean';
    emitter.emit(opId, { type: 'progress', message: `Running ${command}...` });

    return runWithIdf('idf.py', [command], {
      cwd: projectDir,
      operationId: opId,
    }).andThen((result) => {
      if (result.exitCode !== 0) {
        const error = AppError.commandFailed('idf.py', `${command} failed`);
        emitter.emit(opId, { type: 'error', message: error.message });
        return err(error);
      }

      emitter.emit(opId, { type: 'complete', result: null });
      return ResultAsync.fromSafePromise(Promise.resolve(undefined));
    });
  });
}

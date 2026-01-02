import type { InitConfig, InitResult } from '@/core/types';
import { ResultAsync, ok } from 'neverthrow';
import { AppError } from '@/core/errors';
import { createProject } from '@/core/templates';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';

export function init(config: InitConfig, operationId?: string): ResultAsync<InitResult, AppError> {
  const opId = operationId || createOperationId();

  emitter.emit(opId, { type: 'progress', message: `Creating project ${config.name}...` });

  return createProject(config).andThen((result) => {
    emitter.emit(opId, { type: 'progress', message: 'Setting target...', percent: 80 });

    return runWithIdf('idf.py', ['set-target', config.target], {
      cwd: result.projectPath,
      operationId: opId,
    })
      .map((setTargetResult) => {
        if (setTargetResult.exitCode !== 0) {
          emitter.emit(opId, {
            type: 'log',
            level: 'warn',
            message: 'Failed to set target. You may need to run: idf.py set-target ' + config.target,
          });
        }
        return result;
      })
      .orElse(() => {
        // Even if set-target fails, we still want to return the project
        emitter.emit(opId, {
          type: 'log',
          level: 'warn',
          message: 'Failed to set target. You may need to run: idf.py set-target ' + config.target,
        });
        return ok(result);
      })
      .map((finalResult) => {
        emitter.emit(opId, { type: 'complete', result: finalResult });
        return finalResult;
      });
  });
}

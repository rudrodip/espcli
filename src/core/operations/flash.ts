import type { FlashConfig } from '@/core/types';
import { ResultAsync, ok, err } from 'neverthrow';
import { AppError } from '@/core/errors';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';
import { isIdfProject } from '@/core/services/idf';
import { DEFAULT_FLASH_BAUD } from '@/core/constants';

export interface FlashResult {
  success: boolean;
  port: string;
}

export function flash(config: FlashConfig, operationId?: string): ResultAsync<FlashResult, AppError> {
  const opId = operationId || createOperationId();
  const { projectDir, port, baud = DEFAULT_FLASH_BAUD } = config;

  return isIdfProject(projectDir).andThen((isProject) => {
    if (!isProject) {
      const error = AppError.notIdfProject(projectDir);
      emitter.emit(opId, { type: 'error', message: error.message });
      return err(error);
    }

    emitter.emit(opId, { type: 'progress', message: `Flashing to ${port}...` });

    const args = ['-p', port, '-b', String(baud), 'flash'];

    return runWithIdf('idf.py', args, {
      cwd: projectDir,
      operationId: opId,
    }).andThen((result) => {
      if (result.exitCode !== 0) {
        const error = AppError.flashFailed('Flash failed');
        emitter.emit(opId, { type: 'error', message: error.message });
        return err(error);
      }

      const flashResult = { success: true, port };
      emitter.emit(opId, { type: 'complete', result: flashResult });
      return ok(flashResult);
    });
  });
}

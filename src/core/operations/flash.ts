import type { FlashConfig, Result } from '@/core/types';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';
import { isIdfProject } from '@/core/services/idf';
import { DEFAULT_FLASH_BAUD } from '@/core/constants';

export interface FlashResult {
  success: boolean;
  port: string;
}

export async function flash(
  config: FlashConfig,
  operationId?: string
): Promise<Result<FlashResult>> {
  const opId = operationId || createOperationId();
  const { projectDir, port, baud = DEFAULT_FLASH_BAUD } = config;

  const isProject = await isIdfProject(projectDir);
  if (!isProject) {
    const error = 'Not an ESP-IDF project directory';
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  emitter.emit(opId, { type: 'progress', message: `Flashing to ${port}...` });

  const args = ['-p', port, '-b', String(baud), 'flash'];

  const flashResult = await runWithIdf('idf.py', args, {
    cwd: projectDir,
    operationId: opId,
  });

  if (!flashResult.ok) {
    emitter.emit(opId, { type: 'error', message: flashResult.error });
    return { ok: false, error: flashResult.error };
  }

  if (flashResult.data.exitCode !== 0) {
    const error = 'Flash failed';
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  emitter.emit(opId, { type: 'complete', result: { success: true, port } });

  return { ok: true, data: { success: true, port } };
}

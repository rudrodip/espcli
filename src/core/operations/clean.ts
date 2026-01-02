import type { CleanConfig, Result } from '@/core/types';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';
import { isIdfProject } from '@/core/services/idf';

export async function clean(
  config: CleanConfig,
  operationId?: string
): Promise<Result<void>> {
  const opId = operationId || createOperationId();
  const { projectDir, full } = config;

  const isProject = await isIdfProject(projectDir);
  if (!isProject) {
    const error = 'Not an ESP-IDF project directory';
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  const command = full ? 'fullclean' : 'clean';
  emitter.emit(opId, { type: 'progress', message: `Running ${command}...` });

  const result = await runWithIdf('idf.py', [command], {
    cwd: projectDir,
    operationId: opId,
  });

  if (!result.ok) {
    emitter.emit(opId, { type: 'error', message: result.error });
    return { ok: false, error: result.error };
  }

  if (result.data.exitCode !== 0) {
    const error = `${command} failed`;
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  emitter.emit(opId, { type: 'complete', result: null });

  return { ok: true, data: undefined };
}

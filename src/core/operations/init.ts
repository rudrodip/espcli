import type { InitConfig, InitResult, Result } from '@/core/types';
import { createProject } from '@/core/templates';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';

export async function init(
  config: InitConfig,
  operationId?: string
): Promise<Result<InitResult>> {
  const opId = operationId || createOperationId();

  emitter.emit(opId, { type: 'progress', message: `Creating project ${config.name}...` });

  const result = await createProject(config);

  if (!result.ok) {
    emitter.emit(opId, { type: 'error', message: result.error });
    return result;
  }

  emitter.emit(opId, { type: 'progress', message: 'Setting target...', percent: 80 });

  const setTargetResult = await runWithIdf('idf.py', ['set-target', config.target], {
    cwd: result.data.projectPath,
    operationId: opId,
  });

  if (!setTargetResult.ok || setTargetResult.data.exitCode !== 0) {
    emitter.emit(opId, {
      type: 'log',
      level: 'warn',
      message: 'Failed to set target. You may need to run: idf.py set-target ' + config.target,
    });
  }

  emitter.emit(opId, { type: 'complete', result: result.data });

  return result;
}

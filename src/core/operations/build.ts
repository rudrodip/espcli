import type { BuildConfig, Result } from '@/core/types';
import { emitter, createOperationId } from '@/core/emitter';
import { runWithIdf } from '@/core/services/process';
import { isIdfProject } from '@/core/services/idf';

export interface BuildResult {
  success: boolean;
  projectDir: string;
}

export async function build(
  config: BuildConfig,
  operationId?: string
): Promise<Result<BuildResult>> {
  const opId = operationId || createOperationId();
  const { projectDir, target, clean } = config;

  const isProject = await isIdfProject(projectDir);
  if (!isProject) {
    const error = 'Not an ESP-IDF project directory';
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  if (target) {
    emitter.emit(opId, { type: 'progress', message: `Setting target to ${target}...` });

    const targetResult = await runWithIdf('idf.py', ['set-target', target], {
      cwd: projectDir,
      operationId: opId,
    });

    if (!targetResult.ok || targetResult.data.exitCode !== 0) {
      const error = 'Failed to set target';
      emitter.emit(opId, { type: 'error', message: error });
      return { ok: false, error };
    }
  }

  if (clean) {
    emitter.emit(opId, { type: 'progress', message: 'Cleaning...' });

    await runWithIdf('idf.py', ['clean'], {
      cwd: projectDir,
      operationId: opId,
    });
  }

  emitter.emit(opId, { type: 'progress', message: 'Building project...' });

  const buildResult = await runWithIdf('idf.py', ['build'], {
    cwd: projectDir,
    operationId: opId,
  });

  if (!buildResult.ok) {
    emitter.emit(opId, { type: 'error', message: buildResult.error });
    return { ok: false, error: buildResult.error };
  }

  if (buildResult.data.exitCode !== 0) {
    const error = 'Build failed';
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  emitter.emit(opId, { type: 'complete', result: { success: true, projectDir } });

  return { ok: true, data: { success: true, projectDir } };
}

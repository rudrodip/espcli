import type { InstallConfig, InstallResult, Result } from '@/core/types';
import { emitter, createOperationId } from '@/core/emitter';
import { DEFAULT_ESP_PATH, IDF_REPO_URL } from '@/core/constants';
import { run } from '@/core/services/process';
import { addToShellConfig, getExportCommand } from '@/core/services/shell';
import { getIdfVersion } from '@/core/services/idf';
import { mkdir, access } from 'fs/promises';
import { join } from 'path';

export async function install(
  config: Partial<InstallConfig> = {},
  operationId?: string
): Promise<Result<InstallResult>> {
  const opId = operationId || createOperationId();
  const espPath = config.path || DEFAULT_ESP_PATH;
  const target = config.target || 'all';
  const addToShell = config.addToShell ?? true;
  const idfPath = join(espPath, 'esp-idf');

  try {
    await access(idfPath);
    const version = await getIdfVersion(idfPath);
    emitter.emit(opId, { type: 'log', level: 'info', message: `ESP-IDF already installed at ${idfPath}` });
    return {
      ok: true,
      data: {
        idfPath,
        version: version || 'unknown',
        addedToShell: false,
      },
    };
  } catch {}

  emitter.emit(opId, { type: 'progress', message: 'Creating ESP directory...' });

  try {
    await mkdir(espPath, { recursive: true });
  } catch (err) {
    return { ok: false, error: `Failed to create directory: ${err}` };
  }

  emitter.emit(opId, { type: 'progress', message: 'Cloning ESP-IDF repository...', percent: 10 });

  const cloneResult = await run('git', ['clone', '--recursive', IDF_REPO_URL], {
    cwd: espPath,
    operationId: opId,
  });

  if (!cloneResult.ok) {
    return { ok: false, error: cloneResult.error };
  }

  if (cloneResult.data.exitCode !== 0) {
    return { ok: false, error: `Git clone failed with exit code ${cloneResult.data.exitCode}` };
  }

  emitter.emit(opId, { type: 'progress', message: 'Running install script...', percent: 50 });

  const installArgs = target === 'all' ? ['all'] : [target];
  const installResult = await run('./install.sh', installArgs, {
    cwd: idfPath,
    operationId: opId,
  });

  if (!installResult.ok) {
    return { ok: false, error: installResult.error };
  }

  if (installResult.data.exitCode !== 0) {
    return { ok: false, error: `Install script failed with exit code ${installResult.data.exitCode}` };
  }

  let addedToShell = false;

  if (addToShell) {
    emitter.emit(opId, { type: 'progress', message: 'Configuring shell...', percent: 90 });
    const exportCmd = getExportCommand(idfPath);
    const shellResult = await addToShellConfig(exportCmd);

    if (shellResult.ok) {
      addedToShell = true;
    } else {
      emitter.emit(opId, { type: 'log', level: 'warn', message: shellResult.error });
    }
  }

  const version = await getIdfVersion(idfPath);

  emitter.emit(opId, { type: 'complete', result: { idfPath, version, addedToShell } });

  return {
    ok: true,
    data: {
      idfPath,
      version: version || 'unknown',
      addedToShell,
    },
  };
}

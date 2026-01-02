import type { InstallConfig, InstallResult } from '@/core/types';
import { ResultAsync, ok, err } from 'neverthrow';
import { AppError } from '@/core/errors';
import { emitter, createOperationId } from '@/core/emitter';
import { DEFAULT_ESP_PATH, IDF_REPO_URL } from '@/core/constants';
import { run } from '@/core/services/process';
import { addToShellConfig, getExportCommand } from '@/core/services/shell';
import { getIdfVersion } from '@/core/services/idf';
import { mkdir, access } from 'fs/promises';
import { join } from 'path';

export function install(
  config: Partial<InstallConfig> = {},
  operationId?: string
): ResultAsync<InstallResult, AppError> {
  const opId = operationId || createOperationId();
  const espPath = config.path || DEFAULT_ESP_PATH;
  const target = config.target || 'all';
  const addToShell = config.addToShell ?? true;
  const idfPath = join(espPath, 'esp-idf');

  // Check if already installed
  return ResultAsync.fromPromise(access(idfPath), () => null as never)
    .andThen(() =>
      getIdfVersion(idfPath)
        .map((version) => {
          emitter.emit(opId, { type: 'log', level: 'info', message: `ESP-IDF already installed at ${idfPath}` });
          return {
            idfPath,
            version: version || 'unknown',
            addedToShell: false,
          } as InstallResult;
        })
        .orElse(() =>
          ok({
            idfPath,
            version: 'unknown',
            addedToShell: false,
          } as InstallResult)
        )
    )
    .orElse(() => {
      // Not installed, proceed with installation
      emitter.emit(opId, { type: 'progress', message: 'Creating ESP directory...' });

      return ResultAsync.fromPromise(mkdir(espPath, { recursive: true }), (e) =>
        AppError.fileWriteFailed(espPath, e instanceof Error ? e : undefined)
      ).andThen(() => {
        emitter.emit(opId, { type: 'progress', message: 'Cloning ESP-IDF repository...', percent: 10 });

        return run('git', ['clone', '--recursive', IDF_REPO_URL], {
          cwd: espPath,
          operationId: opId,
        })
          .andThen((cloneResult) => {
            if (cloneResult.exitCode !== 0) {
              return err(AppError.commandFailed('git', `Git clone failed with exit code ${cloneResult.exitCode}`));
            }

            emitter.emit(opId, { type: 'progress', message: 'Running install script...', percent: 50 });

            const installArgs = target === 'all' ? ['all'] : [target];
            return run('./install.sh', installArgs, {
              cwd: idfPath,
              operationId: opId,
            });
          })
          .andThen((installResult) => {
            if (installResult.exitCode !== 0) {
              return err(
                AppError.commandFailed('install.sh', `Install script failed with exit code ${installResult.exitCode}`)
              );
            }

            let addedToShellResult = ResultAsync.fromSafePromise(Promise.resolve(false));

            if (addToShell) {
              emitter.emit(opId, { type: 'progress', message: 'Configuring shell...', percent: 90 });
              const exportCmd = getExportCommand(idfPath);
              addedToShellResult = addToShellConfig(exportCmd)
                .map(() => true)
                .orElse((shellError) => {
                  emitter.emit(opId, { type: 'log', level: 'warn', message: shellError.message });
                  return ok(false);
                });
            }

            return addedToShellResult.andThen((addedToShell) =>
              getIdfVersion(idfPath)
                .map((version) => {
                  const result: InstallResult = {
                    idfPath,
                    version: version || 'unknown',
                    addedToShell,
                  };
                  emitter.emit(opId, { type: 'complete', result });
                  return result;
                })
                .orElse(() =>
                  ok({
                    idfPath,
                    version: 'unknown',
                    addedToShell,
                  } as InstallResult)
                )
            );
          });
      });
    });
}

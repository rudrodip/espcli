import type { IdfStatus } from '@/core/types';
import { ResultAsync, ok } from 'neverthrow';
import { AppError, toAppError } from '@/core/errors';
import { DEFAULT_IDF_PATH } from '@/core/constants';
import { access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { execa } from 'execa';

export function findIdfPath(): ResultAsync<string, AppError> {
  const possiblePaths = [process.env.IDF_PATH, DEFAULT_IDF_PATH].filter(Boolean) as string[];

  return ResultAsync.fromSafePromise(
    (async () => {
      for (const path of possiblePaths) {
        try {
          await access(path);
          return path;
        } catch {
          continue;
        }
      }
      throw AppError.idfNotFound();
    })()
  ).mapErr((e) => toAppError(e, 'IDF_NOT_FOUND'));
}

export function getIdfVersion(idfPath: string): ResultAsync<string, AppError> {
  const versionFile = join(idfPath, 'version.txt');

  return ResultAsync.fromPromise(readFile(versionFile, 'utf-8'), () => AppError.fileReadFailed(versionFile))
    .map((content) => content.trim())
    .orElse(() =>
      ResultAsync.fromPromise(
        execa('git', ['describe', '--tags'], { cwd: idfPath }).then((r) => r.stdout.trim()),
        () => AppError.commandFailed('git', 'Failed to get IDF version from git')
      )
    );
}

export function getIdfStatus(): ResultAsync<IdfStatus, never> {
  return findIdfPath()
    .andThen((path) =>
      getIdfVersion(path)
        .map((version) => ({ installed: true, path, version }) as IdfStatus)
        .orElse(() => ok({ installed: true, path, version: undefined } as IdfStatus))
    )
    .orElse(() => ok({ installed: false } as IdfStatus));
}

export function isIdfProject(dir: string): ResultAsync<boolean, AppError> {
  const cmakePath = join(dir, 'CMakeLists.txt');

  return ResultAsync.fromPromise(readFile(cmakePath, 'utf-8'), () => AppError.fileNotFound(cmakePath))
    .map((content) => content.includes('$ENV{IDF_PATH}') || content.includes('idf_component_register'))
    .orElse(() => ok(false));
}

export function findProjectRoot(startDir: string): ResultAsync<string, AppError> {
  return ResultAsync.fromSafePromise(
    (async () => {
      let current = startDir;

      while (current !== dirname(current)) {
        const result = await isIdfProject(current);
        if (result.isOk() && result.value) {
          return current;
        }
        current = dirname(current);
      }

      throw AppError.notIdfProject(startDir);
    })()
  ).mapErr((e) => toAppError(e, 'NOT_IDF_PROJECT'));
}

export function getExportScript(idfPath: string): string {
  return join(idfPath, 'export.sh');
}

export function validateIdfInstallation(idfPath: string): ResultAsync<void, AppError> {
  return ResultAsync.fromPromise(access(idfPath), () =>
    AppError.idfValidationFailed(`IDF path does not exist: ${idfPath}`)
  ).andThen(() => {
    const exportScript = getExportScript(idfPath);
    return ResultAsync.fromPromise(access(exportScript), () =>
      AppError.idfValidationFailed(`export.sh not found in ${idfPath}`)
    ).map(() => undefined);
  });
}

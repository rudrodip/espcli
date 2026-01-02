import { Result, ResultAsync, ok, err } from 'neverthrow';
import { AppError } from '@/core/errors';
import { execa } from 'execa';
import { readdir, access, readFile } from 'fs/promises';
import { join } from 'path';

export interface HealthStatus {
  ok: boolean;
  name: string;
  version?: string;
  path?: string;
  error?: string;
  hint?: string;
}

export interface SystemHealth {
  python: HealthStatus;
  idf: HealthStatus;
  pyserial: HealthStatus;
  esptool: HealthStatus;
  git: HealthStatus;
  idfPython?: string;
}

export interface IdfRequirement {
  python: string;
  idfPath: string;
}

let healthCache: SystemHealth | null = null;

export function getHealth(): ResultAsync<SystemHealth, never> {
  if (healthCache) {
    return ResultAsync.fromSafePromise(Promise.resolve(healthCache));
  }

  return runHealthChecks().map((health) => {
    healthCache = health;
    return health;
  });
}

export function clearHealthCache(): void {
  healthCache = null;
}

function runHealthChecks(): ResultAsync<SystemHealth, never> {
  return ResultAsync.fromSafePromise(
    (async () => {
      // Run parallel checks
      const [python, git] = await Promise.all([checkPython(), checkGit()]);

      // IDF check depends on knowing if Python exists
      const idf = await checkIdf();

      // These depend on IDF Python environment
      const idfPython = idf.ok ? await findIdfPython() : undefined;
      const [pyserial, esptool] = idfPython
        ? await Promise.all([checkPyserial(idfPython), checkEsptool(idfPython)])
        : [
            { ok: false, name: 'pyserial', error: 'ESP-IDF not installed', hint: 'Run: espcli install' },
            { ok: false, name: 'esptool', error: 'ESP-IDF not installed', hint: 'Run: espcli install' },
          ];

      return { python, idf, pyserial, esptool, git, idfPython };
    })()
  );
}

async function checkPython(): Promise<HealthStatus> {
  try {
    const { stdout } = await execa('python3', ['--version'], { timeout: 3000 });
    const version = stdout.replace('Python ', '').trim();
    return { ok: true, name: 'Python', version };
  } catch {
    return {
      ok: false,
      name: 'Python',
      error: 'Python 3 not found',
      hint: 'Install Python 3: https://www.python.org/downloads/',
    };
  }
}

async function checkGit(): Promise<HealthStatus> {
  try {
    const { stdout } = await execa('git', ['--version'], { timeout: 3000 });
    const version = stdout.replace('git version ', '').trim();
    return { ok: true, name: 'Git', version };
  } catch {
    return {
      ok: false,
      name: 'Git',
      error: 'Git not found',
      hint: 'Install Git: https://git-scm.com/downloads',
    };
  }
}

async function checkIdf(): Promise<HealthStatus> {
  const home = process.env.HOME || '';
  const possiblePaths = [process.env.IDF_PATH, join(home, 'esp', 'esp-idf'), join(home, 'esp-idf')].filter(
    Boolean
  ) as string[];

  for (const idfPath of possiblePaths) {
    try {
      await access(idfPath);

      // Try to read version from version.txt or git
      let version: string | undefined;
      try {
        const versionFile = join(idfPath, 'version.txt');
        version = (await readFile(versionFile, 'utf-8')).trim();
      } catch {
        try {
          const { stdout } = await execa('git', ['describe', '--tags'], {
            cwd: idfPath,
            timeout: 3000,
          });
          version = stdout.trim();
        } catch {
          version = 'unknown';
        }
      }

      return { ok: true, name: 'ESP-IDF', version, path: idfPath };
    } catch {
      continue;
    }
  }

  return {
    ok: false,
    name: 'ESP-IDF',
    error: 'ESP-IDF not found',
    hint: 'Run: espcli install',
  };
}

async function findIdfPython(): Promise<string | undefined> {
  const home = process.env.HOME || '';
  const envDir = join(home, '.espressif', 'python_env');

  try {
    const files = await readdir(envDir);
    for (const file of files) {
      if (file.startsWith('idf')) {
        const pythonPath = join(envDir, file, 'bin', 'python');
        try {
          await execa(pythonPath, ['--version'], { timeout: 2000 });
          return pythonPath;
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return undefined;
}

async function checkPyserial(python: string): Promise<HealthStatus> {
  try {
    const { stdout } = await execa(python, ['-c', 'import serial; print(serial.__version__)'], { timeout: 3000 });
    return { ok: true, name: 'pyserial', version: stdout.trim() };
  } catch {
    return {
      ok: false,
      name: 'pyserial',
      error: 'pyserial not installed in IDF environment',
      hint: 'Reinstall ESP-IDF: espcli install',
    };
  }
}

async function checkEsptool(python: string): Promise<HealthStatus> {
  try {
    const { stdout } = await execa(python, ['-m', 'esptool', 'version'], {
      timeout: 3000,
    });
    // Parse version from "esptool.py v4.8.1"
    const versionMatch = stdout.match(/v?([\d.]+)/);
    const version = versionMatch?.[1] || 'unknown';
    return { ok: true, name: 'esptool', version };
  } catch {
    return {
      ok: false,
      name: 'esptool',
      error: 'esptool not installed in IDF environment',
      hint: 'Reinstall ESP-IDF: espcli install',
    };
  }
}

export function requireIdf(): ResultAsync<IdfRequirement, AppError> {
  return getHealth().andThen((health) => {
    if (!health.idf.ok) {
      return err(AppError.idfNotInstalled());
    }

    if (!health.idfPython) {
      return err(AppError.idfPythonNotFound());
    }

    return ok({
      python: health.idfPython,
      idfPath: health.idf.path!,
    });
  });
}

export function requireTool(
  tool: 'python' | 'git' | 'idf' | 'pyserial' | 'esptool'
): ResultAsync<void, AppError> {
  return getHealth().andThen((health) => {
    const status = health[tool];

    if (!status.ok) {
      return err(AppError.commandNotFound(`${status.error}. ${status.hint}`));
    }

    return ok(undefined);
  });
}

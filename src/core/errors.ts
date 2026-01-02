export type ErrorCode =
  | 'IDF_NOT_FOUND'
  | 'IDF_NOT_INSTALLED'
  | 'IDF_PYTHON_NOT_FOUND'
  | 'IDF_VALIDATION_FAILED'
  | 'PROJECT_NOT_FOUND'
  | 'NOT_IDF_PROJECT'
  | 'BUILD_FAILED'
  | 'FLASH_FAILED'
  | 'MONITOR_FAILED'
  | 'CLEAN_FAILED'
  | 'INIT_FAILED'
  | 'INSTALL_FAILED'
  | 'CONFIG_READ_FAILED'
  | 'CONFIG_WRITE_FAILED'
  | 'SHELL_UNSUPPORTED'
  | 'SHELL_CONFIG_FAILED'
  | 'COMMAND_FAILED'
  | 'COMMAND_NOT_FOUND'
  | 'PORT_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'FILE_READ_FAILED'
  | 'FILE_WRITE_FAILED'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: Error;

  constructor(code: ErrorCode, message: string, cause?: Error) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }

  static idfNotFound(path?: string): AppError {
    const msg = path
      ? `ESP-IDF not found at ${path}. Run \`espcli install\` first.`
      : 'ESP-IDF not found. Run `espcli install` first.';
    return new AppError('IDF_NOT_FOUND', msg);
  }

  static idfNotInstalled(): AppError {
    return new AppError('IDF_NOT_INSTALLED', 'ESP-IDF not installed. Run `espcli install` first.');
  }

  static idfPythonNotFound(): AppError {
    return new AppError('IDF_PYTHON_NOT_FOUND', 'ESP-IDF Python environment not found. Run `espcli install` first.');
  }

  static idfValidationFailed(reason: string): AppError {
    return new AppError('IDF_VALIDATION_FAILED', reason);
  }

  static notIdfProject(dir: string): AppError {
    return new AppError('NOT_IDF_PROJECT', `Not an ESP-IDF project directory: ${dir}`);
  }

  static projectNotFound(dir: string): AppError {
    return new AppError('PROJECT_NOT_FOUND', `Project not found: ${dir}`);
  }

  static buildFailed(reason: string): AppError {
    return new AppError('BUILD_FAILED', reason);
  }

  static flashFailed(reason: string): AppError {
    return new AppError('FLASH_FAILED', reason);
  }

  static commandFailed(command: string, reason: string, cause?: Error): AppError {
    return new AppError('COMMAND_FAILED', `Failed to execute ${command}: ${reason}`, cause);
  }

  static commandNotFound(command: string): AppError {
    return new AppError('COMMAND_NOT_FOUND', `Command not found: ${command}`);
  }

  static configReadFailed(path: string, cause?: Error): AppError {
    return new AppError('CONFIG_READ_FAILED', `Failed to read config: ${path}`, cause);
  }

  static configWriteFailed(path: string, cause?: Error): AppError {
    return new AppError('CONFIG_WRITE_FAILED', `Failed to write config: ${path}`, cause);
  }

  static shellUnsupported(shell: string): AppError {
    return new AppError('SHELL_UNSUPPORTED', `Unsupported shell: ${shell}`);
  }

  static shellConfigFailed(path: string, cause?: Error): AppError {
    return new AppError('SHELL_CONFIG_FAILED', `Failed to modify shell config: ${path}`, cause);
  }

  static fileNotFound(path: string): AppError {
    return new AppError('FILE_NOT_FOUND', `File not found: ${path}`);
  }

  static fileReadFailed(path: string, cause?: Error): AppError {
    return new AppError('FILE_READ_FAILED', `Failed to read file: ${path}`, cause);
  }

  static fileWriteFailed(path: string, cause?: Error): AppError {
    return new AppError('FILE_WRITE_FAILED', `Failed to write file: ${path}`, cause);
  }

  static timeout(operation: string): AppError {
    return new AppError('TIMEOUT', `Operation timed out: ${operation}`);
  }

  static unknown(message: string, cause?: Error): AppError {
    return new AppError('UNKNOWN', message, cause);
  }
}

export function toAppError(error: unknown, fallbackCode: ErrorCode = 'UNKNOWN'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(fallbackCode, error.message, error);
  }

  return new AppError(fallbackCode, String(error));
}

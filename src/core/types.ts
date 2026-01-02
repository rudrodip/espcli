import { Result, ResultAsync, ok, err } from 'neverthrow';
import type { AppError } from '@/core/errors';

export { Result, ResultAsync, ok, err };

export type AppResult<T> = Result<T, AppError>;
export type AppResultAsync<T> = ResultAsync<T, AppError>;

export type ShellType = 'zsh' | 'bash' | 'fish' | 'unknown';

export interface ShellInfo {
  type: ShellType;
  configPath: string;
}

export interface EspTarget {
  id: string;
  name: string;
  description: string;
  stable: boolean;
}

export type ConnectionType = 'native-usb' | 'uart-bridge' | 'unknown';

export interface SerialDevice {
  port: string;
  vendorId?: string;
  productId?: string;
  manufacturer?: string;
  chip?: string;
  connectionType: ConnectionType;
  espChip?: string; // Actual ESP chip detected via esptool (e.g., "ESP32-S3")
  description?: string; // USB device description (e.g., "USB JTAG/serial debug unit")
}

export interface IdfStatus {
  installed: boolean;
  path?: string;
  version?: string;
}

export interface InstallConfig {
  path: string;
  target: string;
  addToShell: boolean;
}

export interface InstallResult {
  idfPath: string;
  version: string;
  addedToShell: boolean;
}

export interface InitConfig {
  name: string;
  directory: string;
  language: 'c' | 'cpp';
  target: string;
}

export interface InitResult {
  projectPath: string;
  files: string[];
}

export interface BuildConfig {
  projectDir: string;
  target?: string;
  clean?: boolean;
}

export interface FlashConfig {
  projectDir: string;
  port: string;
  baud?: number;
}

export interface MonitorConfig {
  port: string;
  baud?: number;
  projectDir?: string;
}

export interface CleanConfig {
  projectDir: string;
  full?: boolean;
}

export type EventType =
  | 'progress'
  | 'log'
  | 'stdout'
  | 'stderr'
  | 'complete'
  | 'error';

export type LogLevel = 'info' | 'warn' | 'error';

export type EventData =
  | { type: 'progress'; message: string; percent?: number }
  | { type: 'log'; level: LogLevel; message: string }
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'complete'; result: unknown }
  | { type: 'error'; message: string; code?: string };

export interface CoreEvent {
  type: EventType;
  timestamp: number;
  operationId: string;
  data: EventData;
}

export interface TemplateFile {
  path: string;
  content: string;
}

export interface ProjectTemplate {
  language: 'c' | 'cpp';
  files: TemplateFile[];
}

export type WsClientMessage =
  | { type: 'subscribe'; operationId: string }
  | { type: 'unsubscribe'; operationId: string }
  | { type: 'input'; operationId: string; data: string };

export type WsServerMessage =
  | { type: 'event'; operationId: string; event: CoreEvent }
  | { type: 'subscribed'; operationId: string }
  | { type: 'error'; message: string };

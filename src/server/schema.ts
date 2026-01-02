import type { EspTarget, SerialDevice, IdfStatus, CoreEvent } from '@/core/types';

export interface HealthResponse {
  status: 'ok';
  version: string;
}

export interface TargetsResponse {
  targets: EspTarget[];
}

export interface DevicesResponse {
  devices: SerialDevice[];
}

export interface IdfStatusResponse extends IdfStatus {}

export interface InstallRequest {
  path?: string;
  target?: string;
  addToShell?: boolean;
}

export interface OperationResponse {
  operationId: string;
}

export interface InitRequest {
  name: string;
  directory: string;
  language: 'c' | 'cpp';
  target: string;
}

export interface InitResponse {
  ok: boolean;
  projectPath?: string;
  error?: string;
}

export interface BuildRequest {
  projectDir: string;
  target?: string;
  clean?: boolean;
}

export interface FlashRequest {
  projectDir: string;
  port: string;
  baud?: number;
}

export interface MonitorRequest {
  port: string;
  baud?: number;
  projectDir?: string;
}

export interface MonitorStopRequest {
  operationId: string;
}

export interface CleanRequest {
  projectDir: string;
  full?: boolean;
}

export interface CleanResponse {
  ok: boolean;
  error?: string;
}

export type WsClientMessage =
  | { type: 'subscribe'; operationId: string }
  | { type: 'unsubscribe'; operationId: string }
  | { type: 'input'; operationId: string; data: string };

export type WsServerMessage =
  | { type: 'event'; operationId: string; event: CoreEvent }
  | { type: 'subscribed'; operationId: string }
  | { type: 'error'; message: string };

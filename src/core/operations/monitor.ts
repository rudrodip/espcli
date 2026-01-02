import type { MonitorConfig } from '@/core/types';
import { ResultAsync, ok, err } from 'neverthrow';
import { AppError } from '@/core/errors';
import { emitter, createOperationId } from '@/core/emitter';
import { spawnWithIdf } from '@/core/services/process';
import { DEFAULT_MONITOR_BAUD } from '@/core/constants';
import type { ResultPromise } from 'execa';

const activeMonitors = new Map<string, ResultPromise>();

export interface MonitorHandle {
  operationId: string;
  stop: () => void;
  wait: () => Promise<void>;
}

export function startMonitor(config: MonitorConfig, operationId?: string): ResultAsync<MonitorHandle, AppError> {
  const opId = operationId || createOperationId();
  const { port, baud = DEFAULT_MONITOR_BAUD, projectDir } = config;

  const args = ['-p', port, '-b', String(baud), 'monitor'];

  return spawnWithIdf('idf.py', args, {
    cwd: projectDir || process.cwd(),
    operationId: opId,
    interactive: true,
  }).map(({ proc, promise }) => {
    activeMonitors.set(opId, proc);

    promise.then(() => {
      activeMonitors.delete(opId);
      emitter.emit(opId, { type: 'complete', result: { stopped: true } });
    });

    const handle: MonitorHandle = {
      operationId: opId,
      stop: () => {
        proc.kill('SIGTERM');
        activeMonitors.delete(opId);
      },
      wait: () => promise,
    };

    return handle;
  });
}

export function stopMonitor(operationId: string): boolean {
  const proc = activeMonitors.get(operationId);
  if (!proc) return false;

  proc.kill('SIGTERM');
  activeMonitors.delete(operationId);
  return true;
}

export function getActiveMonitors(): string[] {
  return Array.from(activeMonitors.keys());
}

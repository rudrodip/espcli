import type { MonitorConfig, Result } from '@/core/types';
import { emitter, createOperationId } from '@/core/emitter';
import { spawnWithIdf } from '@/core/services/process';
import { DEFAULT_MONITOR_BAUD } from '@/core/constants';
import type { ResultPromise } from 'execa';

const activeMonitors = new Map<string, ResultPromise>();

export interface MonitorHandle {
  operationId: string;
  stop: () => void;
  sendInput: (data: string) => void;
}

export function startMonitor(
  config: MonitorConfig,
  operationId?: string
): Result<MonitorHandle> {
  const opId = operationId || createOperationId();
  const { port, baud = DEFAULT_MONITOR_BAUD, projectDir } = config;

  const args = ['-p', port, '-b', String(baud), 'monitor'];

  const proc = spawnWithIdf('idf.py', args, {
    cwd: projectDir || process.cwd(),
    operationId: opId,
  });

  if (!proc) {
    const error = 'ESP-IDF not found';
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  activeMonitors.set(opId, proc);

  proc.then(() => {
    activeMonitors.delete(opId);
    emitter.emit(opId, { type: 'complete', result: { stopped: true } });
  });

  const handle: MonitorHandle = {
    operationId: opId,
    stop: () => {
      proc.kill('SIGTERM');
      activeMonitors.delete(opId);
    },
    sendInput: (data: string) => {
      proc.stdin?.write(data);
    },
  };

  return { ok: true, data: handle };
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

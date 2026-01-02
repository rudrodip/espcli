import type { MonitorConfig, Result } from '@/core/types';
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

export async function startMonitor(
  config: MonitorConfig,
  operationId?: string
): Promise<Result<MonitorHandle>> {
  const opId = operationId || createOperationId();
  const { port, baud = DEFAULT_MONITOR_BAUD, projectDir } = config;

  const args = ['-p', port, '-b', String(baud), 'monitor'];

  const result = await spawnWithIdf('idf.py', args, {
    cwd: projectDir || process.cwd(),
    operationId: opId,
    interactive: true,
  });

  if (!result) {
    const error = 'ESP-IDF not found';
    emitter.emit(opId, { type: 'error', message: error });
    return { ok: false, error };
  }

  const { proc, promise } = result;

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

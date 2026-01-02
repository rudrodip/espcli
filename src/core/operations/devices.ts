import type { SerialDevice, Result } from '@/core/types';
import { listPorts } from '@/core/services/ports';

export async function listDevices(): Promise<Result<SerialDevice[]>> {
  try {
    const devices = await listPorts();
    return { ok: true, data: devices };
  } catch (err) {
    return { ok: false, error: `Failed to list devices: ${err}` };
  }
}

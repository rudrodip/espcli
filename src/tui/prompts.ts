import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { SerialDevice } from '@/core/types';
import { ESP_TARGETS, FLASH_BAUD_OPTIONS, MONITOR_BAUD_OPTIONS } from '@/core/constants';

export async function confirm(message: string, initial = true): Promise<boolean> {
  const result = await p.confirm({ message, initialValue: initial });
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }
  return result;
}

export async function text(message: string, placeholder?: string, initial?: string): Promise<string> {
  const result = await p.text({
    message,
    placeholder,
    initialValue: initial,
  });
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }
  return result;
}

export async function select<T extends string>(
  message: string,
  options: { value: T; label: string; hint?: string }[]
): Promise<T> {
  const mappedOptions = options.map((o) => ({
    value: o.value,
    label: o.label,
    ...(o.hint && { hint: o.hint }),
  }));

  const result = await p.select({ message, options: mappedOptions as Parameters<typeof p.select>[0]['options'] });

  if (p.isCancel(result)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }
  return result as T;
}

export async function selectTarget(): Promise<string> {
  return select(
    'Select target chip',
    ESP_TARGETS.map((t) => ({
      value: t.id,
      label: t.name,
      hint: t.description + (t.stable ? '' : ' (preview)'),
    }))
  );
}

export async function selectLanguage(): Promise<'c' | 'cpp'> {
  return select('Select language', [
    { value: 'c' as const, label: 'C', hint: 'Standard C project' },
    { value: 'cpp' as const, label: 'C++', hint: 'C++ with extern "C" linkage' },
  ]);
}

export async function selectDevice(devices: SerialDevice[]): Promise<string> {
  if (devices.length === 0) {
    p.cancel('No devices found');
    process.exit(1);
  }

  return select(
    'Select device',
    devices.map((d) => ({
      value: d.port,
      label: d.port,
      hint: formatDeviceHint(d),
    }))
  );
}

function formatDeviceHint(d: SerialDevice): string {
  const parts: string[] = [];
  if (d.espChip) parts.push(d.espChip);
  else if (d.chip) parts.push(d.chip);
  else if (d.manufacturer) parts.push(d.manufacturer);

  if (d.connectionType === 'native-usb') parts.push('USB');
  else if (d.connectionType === 'uart-bridge') parts.push('UART');

  return parts.join(' · ');
}

export function getDeviceByPort(devices: SerialDevice[], port: string): SerialDevice | undefined {
  return devices.find((d) => d.port === port);
}

export function checkPortForFlash(device: SerialDevice): { ok: boolean; warning?: string } {
  // Native USB is preferred for flashing on newer chips
  // UART bridges work but may have issues with some chips
  if (device.connectionType === 'uart-bridge' && device.espChip?.includes('S3')) {
    return {
      ok: false,
      warning: `Port ${device.port} is a UART bridge. ESP32-S3 flashing works better with native USB port.`,
    };
  }
  return { ok: true };
}

export function checkPortForMonitor(device: SerialDevice): { ok: boolean; warning?: string } {
  // Monitor works on both, but UART is often more reliable for serial output
  // Native USB can have issues with some debug output
  return { ok: true };
}

export async function selectFlashBaud(defaultBaud?: number): Promise<number> {
  const options = FLASH_BAUD_OPTIONS.map((o) => ({
    value: String(o.value),
    label: o.label,
    hint: o.hint + (o.value === defaultBaud ? ' (current)' : ''),
  }));

  const result = await select('Select flash baud rate', options);
  return parseInt(result, 10);
}

export async function selectMonitorBaud(defaultBaud?: number): Promise<number> {
  const options = MONITOR_BAUD_OPTIONS.map((o) => ({
    value: String(o.value),
    label: o.label,
    hint: o.hint + (o.value === defaultBaud ? ' (current)' : ''),
  }));

  const result = await select('Select monitor baud rate', options);
  return parseInt(result, 10);
}

export async function confirmBaudRate(
  type: 'flash' | 'monitor',
  currentBaud: number
): Promise<number> {
  const change = await confirm(`Use ${type} baud rate ${currentBaud}?`, true);

  if (change) {
    return currentBaud;
  }

  return type === 'flash' ? selectFlashBaud(currentBaud) : selectMonitorBaud(currentBaud);
}

export function spinner() {
  return p.spinner();
}

export function intro(title: string): void {
  p.intro(pc.inverse(` ${title} `));
}

export function outro(message: string): void {
  p.outro(message);
}

export function cancel(message: string): void {
  p.cancel(message);
}

export function note(message: string, title?: string): void {
  p.note(message, title);
}

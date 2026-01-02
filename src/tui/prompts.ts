import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { SerialDevice } from '@/core/types';
import { ESP_TARGETS } from '@/core/constants';

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
      hint: d.chip || d.manufacturer,
    }))
  );
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

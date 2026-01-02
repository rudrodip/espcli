import pc from 'picocolors';
import type { SerialDevice, EspTarget } from '@/core/types';

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

export function table(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxRow = Math.max(...rows.map((r) => visibleLength(r[i] || '')));
    return Math.max(h.length, maxRow);
  });

  const separator = '─';
  const topBorder = '┌' + colWidths.map((w) => separator.repeat(w + 2)).join('┬') + '┐';
  const midBorder = '├' + colWidths.map((w) => separator.repeat(w + 2)).join('┼') + '┤';
  const botBorder = '└' + colWidths.map((w) => separator.repeat(w + 2)).join('┴') + '┘';

  const padCell = (cell: string, width: number) => {
    const visible = visibleLength(cell);
    const padding = width - visible;
    return cell + ' '.repeat(Math.max(0, padding));
  };

  const formatRow = (cells: string[]) =>
    '│' + cells.map((c, i) => ` ${padCell(c || '', colWidths[i])} `).join('│') + '│';

  console.log(pc.dim(topBorder));
  console.log(pc.bold(formatRow(headers)));
  console.log(pc.dim(midBorder));
  rows.forEach((row) => console.log(formatRow(row)));
  console.log(pc.dim(botBorder));
}

export function deviceTable(devices: SerialDevice[]): void {
  if (devices.length === 0) {
    console.log(pc.dim('No devices found'));
    return;
  }

  const headers = ['Port', 'Type', 'Chip', 'ESP'];
  const rows = devices.map((d) => {
    const typeLabel = getConnectionTypeLabel(d.connectionType);
    const espLabel = d.espChip || (d.connectionType === 'native-usb' ? '?' : '-');
    return [d.port, typeLabel, d.chip || '-', espLabel];
  });

  table(headers, rows);

  // Show helpful hints
  const hasNativeUsb = devices.some((d) => d.connectionType === 'native-usb');
  const hasUartBridge = devices.some((d) => d.connectionType === 'uart-bridge');

  if (hasNativeUsb && hasUartBridge) {
    console.log('');
    console.log(pc.dim('  Hint: Multiple ports from same board'));
    console.log(pc.dim('  • ') + pc.cyan('UART') + pc.dim(' - Reliable flashing & monitoring'));
    console.log(pc.dim('  • ') + pc.magenta('USB') + pc.dim('  - JTAG debugging'));
  }
}

function getConnectionTypeLabel(type: SerialDevice['connectionType']): string {
  switch (type) {
    case 'native-usb':
      return pc.magenta('USB');
    case 'uart-bridge':
      return pc.cyan('UART');
    default:
      return pc.dim('?');
  }
}

export function targetList(targets: EspTarget[]): void {
  targets.forEach((t) => {
    const status = t.stable ? pc.green('stable') : pc.yellow('preview');
    console.log(`  ${pc.bold(t.id.padEnd(10))} ${pc.dim(t.description)} [${status}]`);
  });
}

export function box(title: string, content: string): void {
  const lines = content.split('\n');
  const maxLen = Math.max(title.length, ...lines.map((l) => l.length));
  const width = maxLen + 4;

  console.log(pc.dim('╭' + '─'.repeat(width) + '╮'));
  console.log(pc.dim('│') + ' ' + pc.bold(title.padEnd(maxLen + 2)) + ' ' + pc.dim('│'));
  console.log(pc.dim('├' + '─'.repeat(width) + '┤'));
  lines.forEach((line) => {
    console.log(pc.dim('│') + '  ' + line.padEnd(maxLen + 1) + ' ' + pc.dim('│'));
  });
  console.log(pc.dim('╰' + '─'.repeat(width) + '╯'));
}

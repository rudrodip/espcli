import pc from 'picocolors';
import { getHealth, type HealthStatus } from '@/core/services/health';
import { listPorts } from '@/core/services/ports';
import { logger } from '@/tui/logger';

export async function doctorCommand(): Promise<void> {
  logger.info('Checking system health...');
  logger.newline();

  const health = await getHealth();

  // Display each check
  displayStatus(health.python);
  displayStatus(health.git);
  displayStatus(health.idf);
  displayStatus(health.pyserial);
  displayStatus(health.esptool);

  // Check for connected devices
  logger.newline();
  await checkDevices();

  // Summary
  logger.newline();
  const allOk = health.python.ok && health.git.ok && health.idf.ok && health.pyserial.ok && health.esptool.ok;

  if (allOk) {
    console.log(pc.green('✓ All checks passed! Ready for ESP32 development.'));
  } else {
    console.log(pc.yellow('⚠ Some checks failed. See hints above to fix issues.'));
  }

  logger.newline();
}

function displayStatus(status: HealthStatus): void {
  const icon = status.ok ? pc.green('✓') : pc.red('✗');
  const name = status.name.padEnd(10);
  const version = status.version ? pc.dim(`v${status.version}`) : '';
  const path = status.path ? pc.dim(` (${status.path})`) : '';

  if (status.ok) {
    console.log(`  ${icon} ${pc.bold(name)} ${version}${path}`);
  } else {
    console.log(`  ${icon} ${pc.bold(name)} ${pc.red(status.error || 'Not found')}`);
    if (status.hint) {
      console.log(`    ${pc.dim('→')} ${pc.yellow(status.hint)}`);
    }
  }
}

async function checkDevices(): Promise<void> {
  console.log(pc.bold('  Devices:'));

  try {
    const devices = await listPorts();

    if (devices.length === 0) {
      console.log(`    ${pc.dim('No ESP devices connected')}`);
    } else {
      for (const device of devices) {
        const chip = device.espChip || device.chip || 'Unknown';
        const type = device.connectionType === 'native-usb' ? 'USB' : 'UART';
        console.log(`    ${pc.green('•')} ${device.port} ${pc.dim(`(${chip} via ${type})`)}`);
      }
    }
  } catch {
    console.log(`    ${pc.dim('Could not check devices')}`);
  }
}

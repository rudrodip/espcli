import { startMonitor } from '@/core/operations/monitor';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import { loadConfig, updateConfig, configExists } from '@/core/services/config';
import { DEFAULT_MONITOR_BAUD } from '@/core/constants';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface MonitorOptions {
  port?: string;
  baud?: number;
}

export async function monitorCommand(options: MonitorOptions): Promise<void> {
  const projectResult = await findProjectRoot(process.cwd());

  if (projectResult.isErr()) {
    logger.error('Not an ESP-IDF project directory');
    logger.dim('Run this command from within an ESP-IDF project, or use "espcli init" to create one');
    process.exit(1);
  }

  const projectDir = projectResult.value;
  const configResult = await loadConfig(projectDir);
  const config = configResult.isOk() ? configResult.value : {};

  const devicesResult = await listDevices();

  if (devicesResult.isErr()) {
    logger.error(devicesResult.error.message);
    process.exit(1);
  }

  const devices = devicesResult.value;

  // Determine port: CLI option > config > prompt
  let port = options.port || config.port;
  let selectedDevice = port ? prompts.getDeviceByPort(devices, port) : undefined;

  if (!port || !selectedDevice) {
    port = await prompts.selectDevice(devices);
    selectedDevice = prompts.getDeviceByPort(devices, port);
  }

  // Check port type and warn if potentially incompatible
  if (selectedDevice) {
    const portCheck = prompts.checkPortForMonitor(selectedDevice);
    if (!portCheck.ok && portCheck.warning) {
      logger.warn(portCheck.warning);
      const useAnyway = await prompts.confirm('Continue with this port?', false);
      if (!useAnyway) {
        port = await prompts.selectDevice(devices);
      }
    }
  }

  // Determine baud rate: CLI option > config > prompt for confirmation
  let baud = options.baud || config.monitorBaud || DEFAULT_MONITOR_BAUD;

  if (!options.baud && !config.monitorBaud) {
    baud = await prompts.confirmBaudRate('monitor', baud);
  }

  // Save settings if config exists, otherwise ask
  if (port !== config.port || baud !== config.monitorBaud) {
    const hasConfigResult = await configExists(projectDir);
    const hasConfig = hasConfigResult.isOk() && hasConfigResult.value;
    if (hasConfig) {
      await updateConfig(projectDir, { port, monitorBaud: baud });
    } else {
      const saveSettings = await prompts.confirm('Save port and baud rate to project config?', true);
      if (saveSettings) {
        await updateConfig(projectDir, { port, monitorBaud: baud });
        logger.dim('Settings saved to .espcli');
      }
    }
  }

  logger.step(`Connecting to ${port} at ${baud} baud...`);
  logger.dim('Press Ctrl+] to exit');
  logger.newline();

  const result = await startMonitor({ port, baud, projectDir });

  if (result.isErr()) {
    logger.error(result.error.message);
    process.exit(1);
  }

  await result.value.wait();

  logger.newline();
  logger.info('Monitor stopped');
  process.exit(0);
}

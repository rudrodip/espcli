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
  const projectDir = await findProjectRoot(process.cwd());

  if (!projectDir) {
    logger.error('Not an ESP-IDF project directory');
    logger.dim('Run this command from within an ESP-IDF project, or use "espcli init" to create one');
    process.exit(1);
  }

  const config = await loadConfig(projectDir);
  const devices = await listDevices();

  if (!devices.ok) {
    logger.error(devices.error);
    process.exit(1);
  }

  // Determine port: CLI option > config > prompt
  let port = options.port || config.port;
  let selectedDevice = port ? prompts.getDeviceByPort(devices.data, port) : undefined;

  if (!port || !selectedDevice) {
    port = await prompts.selectDevice(devices.data);
    selectedDevice = prompts.getDeviceByPort(devices.data, port);
  }

  // Check port type and warn if potentially incompatible
  if (selectedDevice) {
    const portCheck = prompts.checkPortForMonitor(selectedDevice);
    if (!portCheck.ok && portCheck.warning) {
      logger.warn(portCheck.warning);
      const useAnyway = await prompts.confirm('Continue with this port?', false);
      if (!useAnyway) {
        port = await prompts.selectDevice(devices.data);
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
    const hasConfig = await configExists(projectDir);
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

  if (!result.ok) {
    logger.error(result.error);
    process.exit(1);
  }

  await result.data.wait();

  logger.newline();
  logger.info('Monitor stopped');
  process.exit(0);
}

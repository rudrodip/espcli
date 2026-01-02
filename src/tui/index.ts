import { Command } from 'commander';
import { VERSION } from '@/core/constants';
import { installCommand } from '@/tui/commands/install';
import { initCommand } from '@/tui/commands/init';
import { devicesCommand } from '@/tui/commands/devices';
import { buildCommand } from '@/tui/commands/build';
import { flashCommand } from '@/tui/commands/flash';
import { monitorCommand } from '@/tui/commands/monitor';
import { cleanCommand } from '@/tui/commands/clean';
import { runCommand } from '@/tui/commands/run';
import { doctorCommand } from '@/tui/commands/doctor';
// import { createServer } from '@/server';

export function createCli(): Command {
  const program = new Command();

  program
    .name('espcli')
    .description('CLI tool for ESP-IDF development')
    .version(VERSION);

  program
    .command('install')
    .description('Install ESP-IDF framework')
    .option('-p, --path <path>', 'Installation path')
    .option('-t, --target <target>', 'Target chip (default: all)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(installCommand);

  program
    .command('init [name]')
    .description('Create a new ESP-IDF project')
    .option('-l, --lang <lang>', 'Language: c or cpp')
    .option('-t, --target <target>', 'Target chip')
    .action(initCommand);

  program
    .command('devices')
    .alias('ports')
    .description('List connected ESP devices')
    .action(devicesCommand);

  program
    .command('build')
    .description('Build the current project')
    .option('-t, --target <target>', 'Set target before build')
    .option('-c, --clean', 'Clean before build')
    .action(buildCommand);

  program
    .command('flash')
    .description('Flash firmware to device')
    .option('-p, --port <port>', 'Serial port')
    .option('-b, --baud <baud>', 'Flash baud rate', parseInt)
    .action(flashCommand);

  program
    .command('monitor')
    .description('Open serial monitor')
    .option('-p, --port <port>', 'Serial port')
    .option('-b, --baud <baud>', 'Monitor baud rate', parseInt)
    .action(monitorCommand);

  program
    .command('run')
    .description('Build, flash, and monitor')
    .option('-p, --port <port>', 'Serial port')
    .option('-b, --baud <baud>', 'Baud rate', parseInt)
    .option('--skip-build', 'Skip build step')
    .action(runCommand);

  program
    .command('clean')
    .description('Clean build artifacts')
    .option('-f, --full', 'Full clean (includes sdkconfig)')
    .action(cleanCommand);

  // program
  //   .command('serve')
  //   .description('Start HTTP/WebSocket server for GUI')
  //   .option('-p, --port <port>', 'Server port', '3000')
  //   .action((options: { port: string }) => {
  //     const port = parseInt(options.port, 10);
  //     const server = createServer(port);
  //     console.log(`ESP CLI server running on http://localhost:${server.port}`);
  //     console.log(`WebSocket available at ws://localhost:${server.port}/ws`);
  //   });

  program
    .command('doctor')
    .alias('check')
    .description('Check system health and dependencies')
    .action(doctorCommand);

  return program;
}

import pc from 'picocolors';

export function info(message: string): void {
  console.log(pc.blue('ℹ'), message);
}

export function success(message: string): void {
  console.log(pc.green('✔'), message);
}

export function warn(message: string): void {
  console.log(pc.yellow('⚠'), message);
}

export function error(message: string): void {
  console.log(pc.red('✖'), message);
}

export function step(message: string): void {
  console.log(pc.cyan('→'), message);
}

export function dim(message: string): void {
  console.log(pc.dim(message));
}

export function output(text: string): void {
  process.stdout.write(text);
}

export function newline(): void {
  console.log();
}

export const logger = { info, success, warn, error, step, dim, output, newline };

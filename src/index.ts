#!/usr/bin/env node
import { createCli } from '@/tui';

const cli = createCli();
cli.parse();

#!/usr/bin/env bun
import { createServer } from '@/server';

const port = parseInt(process.env.PORT || '3000', 10);
const server = createServer(port);

console.log(`ESP CLI server running on http://localhost:${server.port}`);
console.log(`WebSocket available at ws://localhost:${server.port}/ws`);

import type { ServerWebSocket } from 'bun';
import { matchRoute } from '@/server/routes';
import { emitter } from '@/core/emitter';
import type { WsClientMessage, WsServerMessage, CoreEvent } from '@/core/types';

interface WsData {
  subscriptions: Set<string>;
}

const clients = new Set<ServerWebSocket<WsData>>();

function broadcast(operationId: string, event: CoreEvent): void {
  const message: WsServerMessage = { type: 'event', operationId, event };
  const payload = JSON.stringify(message);

  for (const ws of clients) {
    if (ws.data.subscriptions.has(operationId)) {
      ws.send(payload);
    }
  }
}

emitter.subscribeAll((event) => {
  broadcast(event.operationId, event);
});

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createServer(port: number) {
  return Bun.serve<WsData>({
    port,
    async fetch(req, server) {
      const url = new URL(req.url);

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
      }

      if (url.pathname === '/ws') {
        const upgraded = server.upgrade(req, {
          data: { subscriptions: new Set<string>() },
        });
        if (upgraded) return undefined;
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      const handler = matchRoute(req.method, url.pathname);

      if (handler) {
        const response = await handler(req);
        return withCors(response);
      }

      return withCors(new Response('Not Found', { status: 404 }));
    },
    websocket: {
      open(ws) {
        clients.add(ws);
      },
      close(ws) {
        clients.delete(ws);
      },
      message(ws, message) {
        try {
          const data = JSON.parse(message.toString()) as WsClientMessage;

          switch (data.type) {
            case 'subscribe':
              ws.data.subscriptions.add(data.operationId);
              ws.send(JSON.stringify({ type: 'subscribed', operationId: data.operationId }));
              break;

            case 'unsubscribe':
              ws.data.subscriptions.delete(data.operationId);
              break;

            case 'input':
              break;
          }
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      },
    },
  });
}

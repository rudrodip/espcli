import { VERSION, ESP_TARGETS } from '@/core/constants';
import { getIdfStatus } from '@/core/services/idf';
import { listDevices } from '@/core/operations/devices';
import { install } from '@/core/operations/install';
import { init } from '@/core/operations/init';
import { build } from '@/core/operations/build';
import { flash } from '@/core/operations/flash';
import { startMonitor, stopMonitor } from '@/core/operations/monitor';
import { clean } from '@/core/operations/clean';
import { createOperationId } from '@/core/emitter';
import type {
  HealthResponse,
  TargetsResponse,
  DevicesResponse,
  InstallRequest,
  InitRequest,
  BuildRequest,
  FlashRequest,
  MonitorRequest,
  MonitorStopRequest,
  CleanRequest,
} from '@/server/schema';

type RouteHandler = (req: Request) => Promise<Response>;

function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function parseBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const routes: Record<string, RouteHandler> = {
  'GET /api/health': async () => {
    const response: HealthResponse = { status: 'ok', version: VERSION };
    return json(response);
  },

  'GET /api/targets': async () => {
    const response: TargetsResponse = { targets: ESP_TARGETS };
    return json(response);
  },

  'GET /api/devices': async () => {
    const result = await listDevices();
    if (result.isErr()) {
      return error(result.error.message, 500);
    }
    const response: DevicesResponse = { devices: result.value };
    return json(response);
  },

  'GET /api/idf/status': async () => {
    const statusResult = await getIdfStatus();
    // getIdfStatus never fails (Result<IdfStatus, never>)
    return json(statusResult._unsafeUnwrap());
  },

  'POST /api/install': async (req) => {
    const body = await parseBody<InstallRequest>(req);
    const operationId = createOperationId();

    install(
      {
        path: body?.path || '',
        target: body?.target || 'all',
        addToShell: body?.addToShell ?? true,
      },
      operationId
    );

    return json({ operationId });
  },

  'POST /api/init': async (req) => {
    const body = await parseBody<InitRequest>(req);

    if (!body?.name || !body.directory || !body.language || !body.target) {
      return error('Missing required fields: name, directory, language, target');
    }

    const result = await init(body);

    if (result.isErr()) {
      return json({ ok: false, error: result.error.message });
    }

    return json({ ok: true, projectPath: result.value.projectPath });
  },

  'POST /api/build': async (req) => {
    const body = await parseBody<BuildRequest>(req);

    if (!body?.projectDir) {
      return error('Missing required field: projectDir');
    }

    const operationId = createOperationId();

    build(body, operationId);

    return json({ operationId });
  },

  'POST /api/flash': async (req) => {
    const body = await parseBody<FlashRequest>(req);

    if (!body?.projectDir || !body.port) {
      return error('Missing required fields: projectDir, port');
    }

    const operationId = createOperationId();

    flash(body, operationId);

    return json({ operationId });
  },

  'POST /api/monitor': async (req) => {
    const body = await parseBody<MonitorRequest>(req);

    if (!body?.port) {
      return error('Missing required field: port');
    }

    const operationId = createOperationId();
    const result = await startMonitor(body, operationId);

    if (result.isErr()) {
      return error(result.error.message, 500);
    }

    return json({ operationId });
  },

  'POST /api/monitor/stop': async (req) => {
    const body = await parseBody<MonitorStopRequest>(req);

    if (!body?.operationId) {
      return error('Missing required field: operationId');
    }

    const stopped = stopMonitor(body.operationId);

    return json({ ok: stopped });
  },

  'POST /api/clean': async (req) => {
    const body = await parseBody<CleanRequest>(req);

    if (!body?.projectDir) {
      return error('Missing required field: projectDir');
    }

    const result = await clean(body);

    if (result.isErr()) {
      return json({ ok: false, error: result.error.message });
    }

    return json({ ok: true });
  },
};

export function matchRoute(method: string, path: string): RouteHandler | null {
  const key = `${method} ${path}`;
  return routes[key] || null;
}

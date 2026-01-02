import type { CoreEvent, EventData } from '@/core/types';

type EventHandler = (event: CoreEvent) => void;

class OperationEmitter {
  private handlers = new Map<string, Set<EventHandler>>();
  private globalHandlers = new Set<EventHandler>();

  subscribe(operationId: string, handler: EventHandler): () => void {
    if (!this.handlers.has(operationId)) {
      this.handlers.set(operationId, new Set());
    }
    this.handlers.get(operationId)!.add(handler);

    return () => {
      this.handlers.get(operationId)?.delete(handler);
    };
  }

  subscribeAll(handler: EventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  emit(operationId: string, data: EventData): void {
    const event: CoreEvent = {
      type: data.type,
      timestamp: Date.now(),
      operationId,
      data,
    };

    this.handlers.get(operationId)?.forEach((h) => h(event));
    this.globalHandlers.forEach((h) => h(event));
  }

  cleanup(operationId: string): void {
    this.handlers.delete(operationId);
  }
}

export const emitter = new OperationEmitter();

export function createOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

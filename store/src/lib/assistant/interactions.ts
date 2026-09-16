import { recordCustomerEvent } from '@/lib/customer-events';
import type { AssistantInteractionPayload } from './types';

/** Chatbot behavioral signals — stored via the unified event pipeline. */
export function recordAssistantInteraction(payload: AssistantInteractionPayload): void {
  recordCustomerEvent({ ...payload, source: 'chatbot' });
}

/** @deprecated use resetCustomerEventDedupe */
export { resetCustomerEventDedupe as resetAssistantInteractionDedupe } from '@/lib/customer-events';

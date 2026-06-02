import type { DashMessage } from '@/lib/store';

/**
 * Searches the local message store array for a message by its database ID or WhatsApp message ID.
 */
export function findMessageInStore(messages: DashMessage[], targetId: string): DashMessage | undefined {
  if (!targetId) return undefined;
  
  return messages.find(
    (msg) => msg.id === targetId || msg.wa_message_id === targetId
  );
}

/**
 * Fetches a single message from the backend using the store's action.
 */
export async function fetchMessageFromBackend(
  fetchSingleMsgAction: (id: string) => Promise<DashMessage | null>,
  targetId: string
): Promise<DashMessage | null> {
  if (!targetId) return null;
  return await fetchSingleMsgAction(targetId);
}

import { useState, useCallback } from 'react';
import { useDashStore } from '@/lib/store';
import { findMessageInStore, fetchMessageFromBackend } from '@/services/messageLookup';

interface UseMessageNavigationResult {
  activeHighlightId: string | null;
  navigateToMessage: (targetId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useMessageNavigation(): UseMessageNavigationResult {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { messages, fetchSingleMessage, insertFetchedMessage } = useDashStore();

  const navigateToMessage = useCallback(async (targetId: string) => {
    if (!targetId) return;

    // 1. Check if the message exists in the local store
    const localMsg = findMessageInStore(messages, targetId);
    
    if (localMsg) {
      // Message is local, scroll to it directly
      const resolvedId = localMsg.id;
      const waId = localMsg.wa_message_id;

      // Try both database UUID and WhatsApp message ID
      let el = document.getElementById(`msg-${resolvedId}`) || 
               (waId ? document.getElementById(`msg-${waId}`) : null);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveHighlightId(resolvedId);
        setTimeout(() => setActiveHighlightId(null), 2500);
        return;
      }
    }

    // 2. Message is not in DOM (or not in memory), fetch from backend
    setLoading(true);
    setError(null);

    try {
      const fetchedMsg = await fetchMessageFromBackend(fetchSingleMessage, targetId);
      
      if (!fetchedMsg) {
        throw new Error('Message not found on the server');
      }

      // Insert message into the store. It will be sorted chronologically.
      insertFetchedMessage(fetchedMsg);

      // 3. Poll DOM to wait for React rendering completion
      let attempts = 0;
      const resolvedId = fetchedMsg.id;
      const waId = fetchedMsg.wa_message_id;

      const checkAndScroll = () => {
        const el = document.getElementById(`msg-${resolvedId}`) || 
                 (waId ? document.getElementById(`msg-${waId}`) : null);

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setActiveHighlightId(resolvedId);
          setLoading(false);
          setTimeout(() => setActiveHighlightId(null), 2500);
        } else if (attempts < 30) {
          attempts++;
          setTimeout(checkAndScroll, 50); // check every 50ms (up to 1.5 seconds)
        } else {
          setLoading(false);
          setError('Message loaded but could not be positioned in viewport');
          setTimeout(() => setError(null), 3000);
        }
      };

      // Start polling
      setTimeout(checkAndScroll, 50);

    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to navigate to message');
      setTimeout(() => setError(null), 3000);
    }
  }, [messages, fetchSingleMessage, insertFetchedMessage]);

  return {
    activeHighlightId,
    navigateToMessage,
    loading,
    error,
  };
}

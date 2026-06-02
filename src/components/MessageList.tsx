import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Message } from '../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ScrollToBottomBtn from './ScrollToBottomBtn';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isTyping?: boolean;
  highlightQuery?: string;
  isGroup?: boolean;
  onReply?: (msg: Message) => void;
  onNavigateToMessage?: (targetId: string) => void;
  activeHighlightId?: string | null;
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'TODAY';
  if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isTyping = false,
  highlightQuery = '',
  isGroup = false,
  onReply,
  onNavigateToMessage,
  activeHighlightId,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distFromBottom > 300);
  }, []);

  const groups = useMemo(() => {
    const groupsMap: Record<string, Message[]> = {};
    for (const msg of messages) {
      const key = new Date(msg.timestamp).toDateString();
      if (!groupsMap[key]) groupsMap[key] = [];
      groupsMap[key].push(msg);
    }
    return Object.entries(groupsMap).map(([, msgs]) => ({
      date: formatDate(msgs[0].timestamp),
      messages: msgs,
    }));
  }, [messages]);

  return (
    <div className="flex-1 relative overflow-hidden bg-(--bg-chat) chat-bg">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto pt-4 pb-2 px-1 custom-scrollbar flex flex-col"
      >
        {groups.map((group) => (
          <div key={group.date}>
            {/* Date Divider */}
            <div className="flex justify-center my-4 sticky top-2 z-10">
              <span className="bg-[#182229] text-[#8696a0] text-[12px] px-3 py-1 rounded-[7px] shadow-sm font-medium uppercase tracking-wide">
                {group.date}
              </span>
            </div>

            {/* Messages */}
            {group.messages.map((msg, idx) => {
              const prevMsg = group.messages[idx - 1];
              const isFirstInSeries = !prevMsg || prevMsg.senderId !== msg.senderId;
              
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={msg.senderId === currentUserId}
                  isGroup={isGroup}
                  highlightQuery={highlightQuery}
                  isFirst={isFirstInSeries}
                  onReply={onReply}
                  onNavigateToMessage={onNavigateToMessage}
                  activeHighlightId={activeHighlightId}
                />
              );
            })}
          </div>
        ))}

        {isTyping && <div className="ml-12 mb-4"><TypingIndicator /></div>}

        <div ref={bottomRef} className="h-2 shrink-0" />
      </div>

      <ScrollToBottomBtn
        visible={showScrollBtn}
        onClick={() => scrollToBottom()}
      />
    </div>
  );
};

export default MessageList;

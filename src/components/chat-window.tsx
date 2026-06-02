import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Chat, Message, User } from '../types';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ContactInfoDrawer from './ContactInfoDrawer';
import { messages as initialMessages } from '../data/messages';
import ReplyPreview from './ReplyPreview';

interface ChatWindowProps {
  activeChat: Chat | null;
  onBack?: () => void;
  theme: 'light' | 'dark';
  onStartCall: (type: 'audio' | 'video', user: User) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ activeChat, onBack, theme, onStartCall }) => {
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  const handleNavigateToMessage = useCallback((targetId: string) => {
    const el = document.getElementById(`mock-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveHighlightId(targetId);
      setTimeout(() => setActiveHighlightId(null), 2500);
    }
  }, []);

  // Reset search when switching chats
  useEffect(() => {
    setSearchQuery('');
    setIsTyping(false);
    setInfoDrawerOpen(false);
    setReplyingToMessage(null);
    setActiveHighlightId(null);
  }, [activeChat?.id]);

  const handleSend = useCallback(
    (text: string) => {
      if (!activeChat) return;
      const newMsg: Message = {
        id: `msg_${Date.now()}`,
        chatId: activeChat.id,
        content: text,
        timestamp: new Date().toISOString(),
        senderId: 'me',
        status: 'sent',
        type: 'text',
        reply_to_message_id: replyingToMessage?.id || undefined,
        reply_to_message: replyingToMessage
          ? {
              sender_name: replyingToMessage.senderId === 'me' ? 'You' : (activeChat.participant.name || 'Sender'),
              content: replyingToMessage.content,
            }
          : undefined,
      };
      setMessagesMap((prev) => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] ?? []), newMsg],
      }));
      setReplyingToMessage(null);

      // Simulate typing response
      setIsTyping(true);
      const timeout = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timeout);
    },
    [activeChat, replyingToMessage]
  );

  const toggleInfoDrawer = () => setInfoDrawerOpen(!infoDrawerOpen);

  const chatMessages = useMemo(() => messagesMap[activeChat?.id || ''] ?? [], [messagesMap, activeChat?.id]);
  
  const matchCount = useMemo(() => 
    searchQuery.trim() 
      ? chatMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length 
      : 0,
    [chatMessages, searchQuery]
  );

  if (!activeChat) return null; // Hero is rendered by parent

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-[400px]">
        <ChatHeader
          chat={activeChat}
          onBack={onBack}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleInfo={toggleInfoDrawer}
          onStartCall={(type) => onStartCall(type, activeChat.participant)}
          matchCount={matchCount}
        />
        <MessageList
          messages={chatMessages}
          currentUserId="me"
          isTyping={isTyping}
          highlightQuery={searchQuery}
          isGroup={activeChat.isGroup}
          onReply={setReplyingToMessage}
          onNavigateToMessage={handleNavigateToMessage}
          activeHighlightId={activeHighlightId}
        />
        {replyingToMessage && (
          <div className="px-4 py-2 bg-[#f0f2f5] border-t border-[#e9edef] animate-fadeIn">
            <ReplyPreview
              senderName={replyingToMessage.senderId === 'me'
                ? 'You'
                : (activeChat?.participant.name || 'Sender')}
              content={replyingToMessage.content}
              onClear={() => setReplyingToMessage(null)}
            />
          </div>
        )}
        <MessageInput onSend={handleSend} theme={theme} />
      </div>

      {/* Info Drawer */}
      {infoDrawerOpen && (
        <ContactInfoDrawer
          chat={activeChat}
          onClose={() => setInfoDrawerOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatWindow;

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

export type Theme = 'light' | 'dark';

export type NavTab = 'chats' | 'calls' | 'status' | 'communities';

export type ChatFilter = 'all' | 'unread' | 'favourites' | 'groups';

export type CallDirection = 'incoming' | 'outgoing' | 'missed';
export type CallType = 'audio' | 'video';

export interface User {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  status: string;
  lastSeen: string;
  isOnline: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  timestamp: string;
  senderId: string;
  status: MessageStatus;
  type?: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: string;
  isDeleted?: boolean;
}

export interface Chat {
  id: string;
  participant: User;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isGroup?: boolean;
  groupAvatar?: string;
  groupDescription?: string;
  members?: User[];
  isStarred?: boolean;
}

export interface CallRecord {
  id: string;
  participant: User;
  direction: CallDirection;
  type: CallType;
  timestamp: string;
  duration?: string; // e.g. "3:42"
}

export interface StatusStory {
  id: string;
  user: User;
  content: string; // emoji or short text
  bgColor: string;
  timestamp: string;
  viewed: boolean;
}

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
}

export interface Dialog {
  id: string;
  title: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageDate: number;
  lastMessageOut: boolean;
  lastMessageId: number;
  readOutboxMaxId: number;
  isGroup: boolean;
  isChannel: boolean;
  avatar: string | null;
}

export interface MediaInfo {
  type: 'photo' | 'sticker' | 'video' | 'audio' | 'document' | 'webpage' | 'unknown';
  mimeType?: string;
  size?: string;
  fileName?: string;
  hasMedia: boolean;
}

export interface Message {
  id: number;
  text: string;
  date: number;
  out: boolean;
  senderId: string | null;
  senderName: string;
  media: MediaInfo | null;
  replyToMsgId?: number;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: TelegramUser;
}

export type LoginStep = 'credentials' | 'code' | '2fa';

// Core Roles & Statuses
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export type RoomMemberRole = 'HOST' | 'CO_HOST' | 'SPEAKER' | 'LISTENER' | 'MODERATOR';
export type RoomStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CLOSED';

export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | 'SYSTEM';
export type PostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';

export type WalletTransactionType =
  | 'PURCHASE'
  | 'GIFT_SENT'
  | 'GIFT_RECEIVED'
  | 'REFUND'
  | 'WITHDRAWAL'
  | 'BONUS'
  | 'ADMIN_ADJUSTMENT';

export type WalletTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type WithdrawalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type NotificationType =
  | 'FOLLOW'
  | 'MESSAGE'
  | 'ROOM_INVITE'
  | 'ROOM_STARTED'
  | 'GIFT'
  | 'COMMENT'
  | 'LIKE'
  | 'SYSTEM'
  | 'MODERATION';

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'REJECTED';

// API Response Format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// WebSocket Typed Events
export interface ServerToClientEvents {
  'room:user_joined': (data: { userId: string; username: string; displayName: string; role: RoomMemberRole; avatarUrl?: string }) => void;
  'room:user_left': (data: { userId: string; username: string }) => void;
  'room:raise_hand': (data: { userId: string }) => void;
  'room:hand_lowered': (data: { userId: string }) => void;
  'room:speaker_promoted': (data: { userId: string; role: RoomMemberRole }) => void;
  'room:speaker_removed': (data: { userId: string }) => void;
  'room:mute': (data: { userId: string; isMuted: boolean }) => void;
  'room:message': (data: { id: string; sender: { id: string; username: string; displayName: string; avatarUrl?: string }; content: string; createdAt: string }) => void;
  'room:gift': (data: { id: string; sender: { id: string; username: string }; receiver: { id: string; username: string }; giftName: string; giftIconUrl?: string; quantity: number }) => void;
  'room:ended': (data: { roomId: string }) => void;

  'chat:message': (message: {
    id: string;
    conversationId: string;
    senderId: string;
    messageType: MessageType;
    content: string;
    mediaUrl?: string;
    createdAt: string;
  }) => void;
  'chat:typing': (data: { conversationId: string; userId: string }) => void;
  'chat:stop_typing': (data: { conversationId: string; userId: string }) => void;
  'chat:read': (data: { conversationId: string; userId: string; lastReadMessageId: string }) => void;

  'notification:new': (notification: {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    createdAt: string;
  }) => void;

  'user:online': (data: { userId: string }) => void;
  'user:offline': (data: { userId: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomId: string }) => void;
  'room:leave': (data: { roomId: string }) => void;
  'room:raise_hand': (data: { roomId: string }) => void;
  'room:hand_lowered': (data: { roomId: string }) => void;
  'room:speaker_promoted': (data: { roomId: string; userId: string; role: RoomMemberRole }) => void;
  'room:speaker_removed': (data: { roomId: string; userId: string }) => void;
  'room:mute': (data: { roomId: string; isMuted: boolean }) => void;
  'room:message': (data: { roomId: string; content: string }) => void;
  'room:gift': (data: { roomId: string; receiverId: string; giftId: string; quantity: number }) => void;
  'room:ended': (data: { roomId: string }) => void;

  'chat:join_conversations': (data: { conversationIds: string[] }) => void;
  'chat:message': (data: { conversationId: string; messageType: MessageType; content: string; mediaUrl?: string }) => void;
  'chat:typing': (data: { conversationId: string }) => void;
  'chat:stop_typing': (data: { conversationId: string }) => void;
  'chat:read': (data: { conversationId: string; lastReadMessageId: string }) => void;
}

// User Profile Definitions
export interface UserDto {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserProfileDto {
  userId: string;
  displayName: string;
  gender?: string;
  dateOfBirth?: string;
  bio?: string;
  country?: string;
  language?: string;
  avatarUrl?: string;
  coverUrl?: string;
  level: number;
  experiencePoints: number;
}

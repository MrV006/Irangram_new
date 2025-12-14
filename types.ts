
export type UserRole = 'owner' | 'admin' | 'user' | 'developer' | 'guest';

export interface AdSettings {
    enabled: boolean;
    useMock: boolean;
    sidebarBanner: boolean;
    chatTopBanner: boolean;
    providers: {
        sidebarId: string;
        chatId: string;
    };
    customAd?: {
        isActive: boolean;
        imageUrl: string;
        linkUrl: string;
        title: string;
    };
}

export interface PollOption {
    id: string;
    text: string;
    voterIds: string[];
}

export interface PollData {
    question: string;
    options: PollOption[];
    allowMultiple: boolean;
    isClosed?: boolean;
}

export interface AdminPermissions {
    canDeleteMessages: boolean;
    canBanUsers: boolean;
    canPinMessages: boolean;
    canChangeInfo: boolean;
    canAddAdmins: boolean;
}

export interface SystemPermissions {
    canBanUsers: boolean;
    canDeleteUsers: boolean;
    canManageGroups: boolean;
    canSeeReports: boolean;
    canManageFilters: boolean;
    canSpy: boolean;
}

export interface ChatFolder {
    id: string;
    name: string;
    icon: string; // e.g. 'briefcase', 'user', 'users', 'bell'
    filters: {
        includeTypes: ('user' | 'group' | 'channel' | 'bot')[];
        excludeArchived: boolean;
        excludeRead: boolean; // For "Unread" folders
        excludeMuted: boolean;
    };
}

export interface Message {
  id: string;
  text: string;
  senderId: string; // 'me' or contactId
  senderName?: string; // Added for Global Chat
  senderAvatar?: string; // Added for Global Chat
  senderRole?: UserRole; // Added for Badges
  timestamp: number;
  status: 'sending' | 'sent' | 'read' | 'error';
  replyToId?: string;
  type: 'text' | 'image' | 'audio' | 'file' | 'video_note' | 'sticker' | 'poll'; // Updated types
  imageUrl?: string; // For images and stickers
  fileUrl?: string; // For audio, video notes, and generic files
  fileName?: string;
  fileSize?: string;
  audioDuration?: string; // e.g., "0:14"
  edited?: boolean;
  isSticker?: boolean;
  poll?: PollData; // New: Poll Data
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  forwardedFrom?: {
      name: string;
      id: string; // original sender id or channel id
      avatar?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing...' | 'connecting';
  lastSeen?: string;
  bio: string;
  username: string;
  phone: string;
  type: 'user' | 'group' | 'channel';
  isGlobal?: boolean; // New flag for real server connection
  isPinned?: boolean; // New: Chat Pin Status
  isArchived?: boolean; // New: Chat Archive Status
  slowMode?: number; // Seconds delay between messages
  adminPermissions?: Record<string, AdminPermissions>; // Map userId to permissions
  creatorId?: string;
}

export interface UserProfileData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  bio: string;
  avatar: string;
  role: UserRole;
  systemPermissions?: SystemPermissions; // New: Granular Admin Permissions
  isBanned?: boolean;
  isUnderMaintenance?: boolean; // Fake Maintenance Mode per user
  isScreenshotRestricted?: boolean; // New: Prevent Screenshots/Copying
  banExpiresAt?: number; // Timestamp for temporary ban expiration
  expiresAt?: number; // For Guest Accounts (24h expiry)
  createdAt: any;
  lastSeen: any;
  status: string;
}

export interface StoredAccount {
  uid: string;
  name: string;
  avatar: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'info';
  createdAt: number;
  read: boolean;
  senderId?: string;
}

export interface Report {
  id: string;
  messageId: string;
  messageContent: string;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  status: 'pending' | 'handled';
  handledBy?: string; // Name of admin/owner who handled it
  handledAt?: number;
  createdAt: number;
}

export interface Appeal {
  id: string;
  userId: string;
  userName: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface DeletionRequest {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  createdAt: number;
}

export interface ChatSession {
  contactId: string;
  messages: Message[];
  unreadCount: number;
  draft: string;
  pinnedMessages: {
    id: string;
    text: string;
    sender: string;
    type: string;
  }[];
}

export interface SystemInfo {
  currentVersion: string;
  lastCleanup: number;
  forceUpdate?: number;
  maintenanceMode?: boolean; // Global Maintenance Mode
  globalScreenshotRestriction?: boolean; // Global Screenshot Block
}

export interface SettingsDoc {
  bannedWords: string[];
}

export interface IncomingCall {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    isVideo: boolean;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  myId: string; // Current User ID for checking reaction status
  myRole: UserRole;
  pinnedMessages?: { id: string; text: string; sender: string; type: string }[];
  onSendMessage: (content: { text?: string; imageUrl?: string; type: 'text' | 'image' | 'audio' | 'file' | 'video_note' | 'sticker' | 'poll'; audioDuration?: string; isSticker?: boolean; file?: File | Blob; fileName?: string; fileSize?: string; forwardedFrom?: any; poll?: PollData }, replyToId?: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onPinMessage: (message: Message) => void;
  onUnpinMessage: (messageId?: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onBack: () => void;
  isMobile: boolean;
  onProfileClick: () => void;
  onAvatarClick?: (senderProfile: Partial<Contact>) => void; // New prop for clicking user avatar
  wallpaper: string;
  onCall: (isVideo: boolean) => void; // UPDATED
  onClearHistory?: () => void; // Added for clearing chat
  onDeleteChat?: () => void; // NEW: Delete Chat Capability
  onBlockUser?: () => void; // NEW: Block User
  onTyping?: (isTyping: boolean) => void; // NEW: Handle typing status
  onForwardMessage?: (message: Message) => void; // NEW: Forward
}
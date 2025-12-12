
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfilePane from './components/ProfilePane';
import SettingsModal from './components/SettingsModal';
import AdminPanel from './components/AdminPanel';
import AuthPage from './components/AuthPage';
import BanScreen from './components/BanScreen';
import ForwardModal from './components/ForwardModal';
import CallModal from './components/CallModal';
import { Contact, ChatSession, Message, Theme, UserRole, UserProfileData, StoredAccount } from './types';
import { 
    subscribeToGlobalChat, 
    sendGlobalMessage, 
    subscribeToSystemInfo, 
    checkAndTriggerCleanup, 
    toggleMessageReaction,
    subscribeToAuth,
    getUserProfile,
    subscribeToUserProfile,
    updateUserProfileDoc,
    logoutUser,
    deleteMessageGlobal,
    subscribeToNotifications,
    markNotificationRead,
    uploadMedia,
    updateUserHeartbeat,
    subscribeToAllUsers,
    setChatPin,
    removeChatPin,
    subscribeToChatPin,
    createGroup,
    getChatId,
    subscribeToPrivateChat,
    sendPrivateMessage,
    checkAndLiftBan,
    subscribeToUserChats,
    editMessageGlobal,
    editPrivateMessage,
    deleteChat,
    clearPrivateChatHistory,
    clearGlobalChat,
    blockUser,
    setUserTyping,
    joinGroupViaLink,
    deletePrivateMessage,
    updateUserChatPreference,
    subscribeToChatPreferences,
    deleteUserAccount,
    castPollVote,
    subscribeToWordFilters
} from './services/firebaseService';
import { 
    initializeWebRTC, 
    createCall, 
    answerCall, 
    endCall, 
    subscribeToIncomingCalls 
} from './services/webrtcService';
import { RefreshCw, Download, LogOut, Phone, Mic, MicOff, PhoneOff, Bell, AlertTriangle, Construction, X } from 'lucide-react';
import { CONFIG } from './config';

// Short Pop Sound (Base64)
const POP_SOUND_BASE64 = "data:audio/mpeg;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
const RING_SOUND = "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg";

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'global_chat',
    name: 'چت عمومی جهانی 🌍',
    avatar: 'https://cdn-icons-png.flaticon.com/512/921/921490.png',
    status: 'online',
    bio: 'گفتگو با تمام کاربران آنلاین در سراسر جهان (متصل به سرور واقعی)',
    username: '@global_world',
    phone: '',
    type: 'group',
    isGlobal: true,
    isPinned: true
  },
  {
    id: 'saved',
    name: 'پیام‌های ذخیره شده',
    avatar: '',
    status: 'online',
    bio: 'فضای شخصی شما برای ذخیره پیام‌ها و فایل‌ها',
    username: '@saved_messages',
    phone: '',
    type: 'user',
    isPinned: true
  }
];

const INITIAL_SESSIONS: Record<string, ChatSession> = {};
INITIAL_CONTACTS.forEach(c => {
  INITIAL_SESSIONS[c.id] = {
    contactId: c.id,
    messages: [],
    unreadCount: 0,
    draft: ''
  };
});

const DEFAULT_PROFILE: UserProfileData = {
    uid: '',
    name: 'کاربر مهمان',
    email: '',
    bio: '...',
    username: '@guest',
    phone: '',
    role: 'user' as UserRole,
    isBanned: false,
    avatar: '',
    createdAt: Date.now(),
    lastSeen: Date.now(),
    status: 'offline'
};

const MaintenancePage: React.FC<{ onLogout: () => Promise<void> }> = ({ onLogout }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogoutClick = async () => {
        setIsLoading(true);
        try {
            await onLogout();
        } catch (e) {
            console.error(e);
            window.location.reload();
        }
    };

    return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-center p-6 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-2xl border border-yellow-400 max-w-lg w-full">
                <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Construction size={48} className="text-yellow-600 animate-pulse" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">وبسایت در حال بروزرسانی</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    ما در حال انجام تعمیرات و بهبود زیرساخت‌ها هستیم تا تجربه بهتری برای شما بسازیم. لطفاً شکیبا باشید.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl text-yellow-800 dark:text-yellow-200 text-sm font-bold">
                    لطفاً دقایقی دیگر مجدداً تلاش کنید.
                </div>
                
                <button 
                    onClick={handleLogoutClick}
                    disabled={isLoading}
                    className="mt-8 flex items-center justify-center gap-2 w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <LogOut size={16} />}
                    {isLoading ? 'در حال خروج...' : 'خروج و تعویض حساب'}
                </button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>(INITIAL_SESSIONS);

  const [userProfile, setUserProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);
  const [targetEmail, setTargetEmail] = useState<string>(''); 
  
  const [wallpaper, setWallpaper] = useState<string>('default');

  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
     return (localStorage.getItem('irangram_theme') as Theme) || Theme.LIGHT;
  });
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [forceUpdateMsg, setForceUpdateMsg] = useState('');
  const [pendingUpdateTimestamp, setPendingUpdateTimestamp] = useState<number>(0);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [globalScreenshotRestriction, setGlobalScreenshotRestriction] = useState(false);
  
  // Call UI State (WebRTC)
  const [callState, setCallState] = useState<{
      isActive: boolean;
      isIncoming: boolean;
      callId: string | null;
      remoteName: string;
      remoteAvatar: string;
      localStream: MediaStream | null;
      remoteStream: MediaStream | null;
      status: string; // 'calling', 'ringing', 'connected', 'ended'
      isVideo: boolean;
  }>({
      isActive: false,
      isIncoming: false,
      callId: null,
      remoteName: '',
      remoteAvatar: '',
      localStream: null,
      remoteStream: null,
      status: 'idle',
      isVideo: false
  });

  const callUnsubscribeRef = useRef<(() => void) | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Forward Modal State
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);

  // Notification State
  const [systemAlert, setSystemAlert] = useState<{title: string, message: string} | null>(null);
  
  // Exit Confirmation State
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isExitingRef = useRef(false);

  const unsubscribeGlobalRef = useRef<(() => void) | null>(null);
  const unsubscribeGlobalPinRef = useRef<(() => void) | null>(null);
  const unsubscribePrivateRef = useRef<(() => void) | null>(null); 
  const notificationSound = useRef(new Audio(POP_SOUND_BASE64));

  const contactsRef = useRef(contacts);
  const fetchingContactIds = useRef<Set<string>>(new Set());
  
  const stateRef = useRef({
      activeContactId,
      isSettingsOpen,
      isAdminPanelOpen,
      showProfile,
      viewingContact,
      showExitConfirm,
      callState
  });

  useEffect(() => {
      contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
      stateRef.current = {
          activeContactId,
          isSettingsOpen,
          isAdminPanelOpen,
          showProfile,
          viewingContact,
          showExitConfirm,
          callState
      };
  }, [activeContactId, isSettingsOpen, isAdminPanelOpen, showProfile, viewingContact, showExitConfirm, callState]);

  // --- Back Button & Exit Handling ---
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          e.preventDefault();
          e.returnValue = ''; 
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      window.history.pushState({ app: true }, '', window.location.href);

      const handlePopState = (e: PopStateEvent) => {
          if (isExitingRef.current) return;

          window.history.pushState({ app: true }, '', window.location.href);

          const state = stateRef.current;

          if (state.showExitConfirm) {
              setShowExitConfirm(false);
              return;
          }

          if (state.callState.isActive) {
             if(confirm("آیا می‌خواهید تماس را قطع کنید؟")) {
                 handleEndCall();
             }
             return;
          }

          if (state.isAdminPanelOpen) {
              setIsAdminPanelOpen(false);
              return;
          }

          if (state.isSettingsOpen) {
              setIsSettingsOpen(false);
              return;
          }

          if (state.showProfile || state.viewingContact) {
              setShowProfile(false);
              setViewingContact(null);
              return;
          }

          if (state.activeContactId) {
              setActiveContactId(null);
              return;
          }

          setShowExitConfirm(true);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          window.removeEventListener('popstate', handlePopState);
      };
  }, []);

  // Capture PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Apply Screenshot Restriction CSS
  useEffect(() => {
      const isRestricted = userProfile.isScreenshotRestricted || globalScreenshotRestriction;
      if (isRestricted) {
          document.body.classList.add('screenshot-protected');
      } else {
          document.body.classList.remove('screenshot-protected');
      }
  }, [userProfile.isScreenshotRestricted, globalScreenshotRestriction]);

  useEffect(() => {
    // Initial Load of Accounts
    const savedAccounts = localStorage.getItem('irangram_accounts');
    if (savedAccounts) {
        try {
            setStoredAccounts(JSON.parse(savedAccounts));
        } catch(e) {
            console.error("Error parsing accounts", e);
            localStorage.removeItem('irangram_accounts');
        }
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeToAuth(async (user) => {
        if (user) {
            // OPTIMIZATION: Set current user immediately to unblock UI
            setCurrentUser(user);
            setAuthLoading(false); // Enable UI interaction immediately

            // Fetch profile in background
            getUserProfile(user.uid).then((profile) => {
                if(profile?.role === 'guest' && profile?.expiresAt) {
                    if (Date.now() > profile.expiresAt) {
                        deleteUserAccount(user.uid);
                        logoutUser(user.uid);
                        alert("حساب مهمان شما منقضی شده است.");
                        return;
                    }
                }
            });

            // Subscribe to profile changes
            subscribeToUserProfile(user.uid, (realtimeProfile) => {
                const isOwner = user.email === CONFIG.OWNER_EMAIL;
                const isDeveloper = user.email === CONFIG.DEVELOPER_EMAIL || user.email === 'developer.irangram@gmail.com';
                const role = isOwner ? 'owner' : (isDeveloper ? 'developer' : (realtimeProfile?.role || 'user'));

                setUserProfile({
                    uid: user.uid,
                    name: realtimeProfile?.name || user.displayName || 'کاربر',
                    email: user.email || '',
                    bio: realtimeProfile?.bio || '',
                    username: realtimeProfile?.username || user.email?.split('@')[0] || '',
                    phone: realtimeProfile?.phone || '',
                    role: role,
                    isBanned: (isOwner || isDeveloper) ? false : (realtimeProfile?.isBanned || false),
                    isUnderMaintenance: (isOwner || isDeveloper) ? false : (realtimeProfile?.isUnderMaintenance || false),
                    isScreenshotRestricted: (isOwner || isDeveloper) ? false : (realtimeProfile?.isScreenshotRestricted || false),
                    banExpiresAt: realtimeProfile?.banExpiresAt,
                    avatar: realtimeProfile?.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`,
                    createdAt: realtimeProfile?.createdAt,
                    lastSeen: realtimeProfile?.lastSeen,
                    status: realtimeProfile?.status || 'online'
                });
            });

            // Listen for incoming calls
            const callUnsub = subscribeToIncomingCalls(user.uid, (callData) => {
                if (!stateRef.current.callState.isActive) { 
                    setCallState({
                        isActive: true,
                        isIncoming: true,
                        callId: callData.id,
                        remoteName: callData.callerName,
                        remoteAvatar: callData.callerAvatar,
                        localStream: null,
                        remoteStream: null,
                        status: 'incoming',
                        isVideo: callData.isVideo
                    });
                    
                    // Play Ringtone
                    ringtoneRef.current = new Audio(RING_SOUND);
                    ringtoneRef.current.loop = true;
                    ringtoneRef.current.play().catch(e => console.error("Ringtone play error", e));
                }
            });
            
            // Listen for call ended event from service
            window.addEventListener('callEnded', handleRemoteHangup);

            // Subscribe to Chat Preferences (Pin/Archive)
            const prefUnsub = subscribeToChatPreferences(user.uid, (prefs) => {
                setContacts(prev => prev.map(c => {
                    if (prefs[c.id]) {
                        return { ...c, ...prefs[c.id] };
                    }
                    return c;
                }));
            });

            return () => {
                callUnsub();
                prefUnsub();
                window.removeEventListener('callEnded', handleRemoteHangup);
            };

        } else {
            setCurrentUser(null);
            setContacts(INITIAL_CONTACTS);
            setSessions(INITIAL_SESSIONS);
            setAuthLoading(false); // Ensure loading stops
        }
    });

    // Safety timeout in case auth takes too long
    const safetyTimeout = setTimeout(() => {
        if(authLoading) setAuthLoading(false);
    }, 5000);

    return () => {
        unsub();
        clearTimeout(safetyTimeout);
    };
  }, []);

  // --- Real-Time Chat Discovery & 1-Second Polling Logic ---
  useEffect(() => {
      if(!currentUser) return;

      // START WORD FILTER SUBSCRIPTION HERE
      const unsubFilters = subscribeToWordFilters();

      // This is the listener for real-time chat updates (new messages, new chats)
      const unsubUserChats = subscribeToUserChats(currentUser.uid, async (userChats) => {
           // We map userChats to sessions/contacts logic
           
           // Process each chat to ensure we have the contact info
           for (const chat of userChats) {
                // If this is a group/channel
                if (chat.type === 'group' || chat.type === 'channel') {
                    setContacts(prev => {
                        if (prev.some(c => c.id === chat.id)) return prev;
                        return [...prev, {
                            id: chat.id,
                            name: chat.name,
                            avatar: chat.avatar,
                            bio: chat.description || '',
                            type: chat.type,
                            status: 'online',
                            username: '',
                            phone: '',
                            isPinned: chat.isPinned, // From DB if saved there
                            creatorId: chat.creatorId
                        }];
                    });
                } else {
                    // It's a private chat
                    // Find the other participant ID
                    const otherId = chat.participants.find((p: string) => p !== currentUser.uid);
                    
                    if (otherId && otherId !== 'saved') {
                        // Check if we already have this contact
                        if (!contactsRef.current.some(c => c.id === otherId)) {
                            // If we don't have it, and we aren't already fetching it
                            if (!fetchingContactIds.current.has(otherId)) {
                                fetchingContactIds.current.add(otherId);
                                try {
                                    const profile = await getUserProfile(otherId);
                                    if (profile) {
                                        const newContact: Contact = {
                                            id: profile.uid,
                                            name: profile.name,
                                            avatar: profile.avatar,
                                            bio: profile.bio,
                                            username: '@' + profile.username,
                                            phone: profile.phone,
                                            status: profile.status as any,
                                            type: 'user'
                                        };
                                        setContacts(prev => [...prev, newContact]);
                                    }
                                } catch (e) { console.error("Error fetching new contact", e); }
                                finally { fetchingContactIds.current.delete(otherId); }
                            }
                        }
                    }
                }

                // Update Session Data (Unread, Last Message)
                setSessions(prev => ({
                    ...prev,
                    [chat.type === 'user' ? (chat.participants.find((p:string) => p !== currentUser.uid) || 'saved') : chat.id]: {
                        contactId: chat.id,
                        messages: prev[chat.id]?.messages || [], // Messages loaded separately
                        unreadCount: 0, // Simplified for now
                        draft: prev[chat.id]?.draft || '',
                        pinnedMessage: chat.pinnedMessage
                    }
                }));
           }
      });

      // 1-Second Interval Check (To ensure immediate updates for new contacts/messages even if listener lags)
      const checkInterval = setInterval(() => {
          updateUserHeartbeat(currentUser.uid, 'online');
      }, 1000);

      return () => {
          unsubUserChats();
          unsubFilters();
          clearInterval(checkInterval);
      };
  }, [currentUser]);
  
  useEffect(() => {
      // Notifications logic
      if(currentUser) {
          return subscribeToNotifications(currentUser.uid, (notifs) => {
             if(notifs.length > 0) {
                 const unread = notifs.filter(n => !n.read);
                 if(unread.length > 0) {
                     setSystemAlert({ title: unread[0].title, message: unread[0].message });
                     unread.forEach(n => markNotificationRead(currentUser.uid, n.id));
                 }
             }
          });
      }
  }, [currentUser]);

  useEffect(() => {
      // System info logic
      return subscribeToSystemInfo((info) => {
          if (info.forceUpdate > 0) {
               const lastUpdate = parseInt(localStorage.getItem('last_forced_update') || '0');
               // Only trigger if server timestamp is NEWER than local
               if (info.forceUpdate > lastUpdate) {
                   setPendingUpdateTimestamp(info.forceUpdate);
                   setForceUpdateMsg('بروزرسانی جدید در دسترس است.');
                   setUpdateAvailable(true);
               }
          }
          setMaintenanceMode(info.maintenanceMode || false);
          setGlobalScreenshotRestriction(info.globalScreenshotRestriction || false);
      });
  }, []);

  useEffect(() => {
      // Chat subscriptions
      if (!activeContactId || !currentUser) return;

      const unsubscribePin = subscribeToChatPin(
          activeContactId === 'global_chat' ? 'global_chat' : getChatId(currentUser.uid, activeContactId),
          (pinned) => setSessions(prev => ({ ...prev, [activeContactId]: { ...prev[activeContactId], pinnedMessage: pinned } }))
      );

      if (activeContactId === 'global_chat') {
          if (unsubscribeGlobalRef.current) unsubscribeGlobalRef.current();
          unsubscribeGlobalRef.current = subscribeToGlobalChat((msgs) => {
              setSessions(prev => ({ ...prev, global_chat: { ...prev.global_chat, messages: msgs } }));
          });
          return () => {
             if(unsubscribeGlobalRef.current) unsubscribeGlobalRef.current();
             unsubscribePin();
          };
      } else {
          // Private chat (Works for Saved, and Users)
          if (unsubscribePrivateRef.current) unsubscribePrivateRef.current();
          const chatId = getChatId(currentUser.uid, activeContactId);
          unsubscribePrivateRef.current = subscribeToPrivateChat(chatId, (msgs) => {
             setSessions(prev => ({ ...prev, [activeContactId]: { ...prev[activeContactId], messages: msgs } }));
          });
          return () => {
             if(unsubscribePrivateRef.current) unsubscribePrivateRef.current();
             unsubscribePin();
          };
      }
  }, [activeContactId, currentUser]);

  // --- WebRTC Call Handlers ---

  const handleStartCall = async (isVideo: boolean) => {
      if (!activeContactId || !currentUser) return;
      const targetContact = contacts.find(c => c.id === activeContactId);
      if (!targetContact) return;

      try {
          // 1. Initialize Local Stream
          const { localStream, remoteStream } = await initializeWebRTC(isVideo);
          
          setCallState({
              isActive: true,
              isIncoming: false,
              callId: null,
              remoteName: targetContact.name,
              remoteAvatar: targetContact.avatar,
              localStream,
              remoteStream,
              status: 'calling',
              isVideo
          });

          // 2. Create Call in Firestore
          const { callId, unsubscribe } = await createCall(
              currentUser.uid, 
              activeContactId, 
              userProfile.name, 
              userProfile.avatar, 
              isVideo
          ) || {};

          if (callId && unsubscribe) {
              callUnsubscribeRef.current = unsubscribe;
              setCallState(prev => ({ ...prev, callId }));
          }

      } catch (err) {
          console.error("Failed to start call", err);
          alert("دسترسی به دوربین/میکروفون امکان‌پذیر نیست.");
          handleEndCall();
      }
  };

  const handleAcceptCall = async () => {
      if (!callState.callId) return;
      
      // Stop Ringtone
      if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current = null;
      }

      try {
          const { localStream, remoteStream } = await initializeWebRTC(callState.isVideo);
          
          setCallState(prev => ({
              ...prev,
              localStream,
              remoteStream,
              status: 'connected',
              isIncoming: false // UI switches to active call view
          }));

          const unsubscribe = await answerCall(callState.callId);
          if (unsubscribe) callUnsubscribeRef.current = unsubscribe;

      } catch (err) {
          console.error("Failed to accept call", err);
          handleEndCall();
      }
  };

  const handleEndCall = async () => {
      if (callState.callId) {
          await endCall(callState.callId);
      }
      
      resetCallState();
  };

  const handleRemoteHangup = () => {
      alert("تماس پایان یافت.");
      resetCallState();
  };

  const resetCallState = () => {
      if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current = null;
      }
      if (callUnsubscribeRef.current) {
          callUnsubscribeRef.current();
          callUnsubscribeRef.current = null;
      }
      // Reload window to fully clear WebRTC tracks if needed, or just reset state
      // Simple reset for SPA
      setCallState({
          isActive: false,
          isIncoming: false,
          callId: null,
          remoteName: '',
          remoteAvatar: '',
          localStream: null,
          remoteStream: null,
          status: 'idle',
          isVideo: false
      });
      
      // Also ensure service cleans up
      endCall(''); 
  };

  // --- Folder & Organization Handlers ---
  const handleTogglePinChat = async (contactId: string) => {
      if (!currentUser) return;
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
          const newStatus = !contact.isPinned;
          // Optimistic update
          setContacts(prev => prev.map(c => c.id === contactId ? { ...c, isPinned: newStatus } : c));
          await updateUserChatPreference(currentUser.uid, contactId, { isPinned: newStatus });
      }
  };

  const handleToggleArchiveChat = async (contactId: string) => {
      if (!currentUser) return;
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
          const newStatus = !contact.isArchived;
          setContacts(prev => prev.map(c => c.id === contactId ? { ...c, isArchived: newStatus } : c));
          await updateUserChatPreference(currentUser.uid, contactId, { isArchived: newStatus });
          if (newStatus && activeContactId === contactId) setActiveContactId(null);
      }
  };

  // ... (Existing handlers: toggleTheme, handleSelectContact, etc.)
  const toggleTheme = () => setTheme(prev => prev === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);

  const handleSelectContact = (id: string) => {
    setActiveContactId(id);
    setShowProfile(false);
    setViewingContact(null);
    setSessions(prev => ({
      ...prev,
      [id]: { ...prev[id], unreadCount: 0 }
    }));
  };

  const handleAddContact = (newContact: Contact) => {
      setContacts(prev => {
          if (prev.some(c => c.id === newContact.id)) return prev;
          return [...prev, newContact];
      });

      setSessions(prev => {
          if (prev[newContact.id]) return prev;
          return {
              ...prev,
              [newContact.id]: {
                  contactId: newContact.id,
                  messages: [],
                  unreadCount: 0,
                  draft: ''
              }
          };
      });

      handleSelectContact(newContact.id);
  };
  
  const handleCreateGroupWrapper = async (name: string, description: string, imageFile: File | null, memberIds: string[], isChannel: boolean) => {
      if(!currentUser) return;
      try {
          const groupData = await createGroup(name, description, imageFile, memberIds, currentUser.uid, isChannel);
          if (groupData) {
              const newContact: Contact = {
                  id: groupData.id,
                  name: groupData.name,
                  avatar: groupData.avatar,
                  bio: description || (isChannel ? 'کانال جدید' : 'گروه جدید'),
                  username: '',
                  phone: '',
                  status: 'online',
                  type: groupData.type as any,
                  creatorId: currentUser.uid
              };
              handleAddContact(newContact);
          }
      } catch(e) {
          console.error("Error creating group", e);
          alert("خطا در ساخت گروه");
      }
  };


  // ... (Other handlers: Reaction, Delete, Pin, Edit, etc. - Keep them as is)
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
      if (!activeContactId || !currentUser) return;
      if (activeContactId === 'global_chat') {
          await toggleMessageReaction(messageId, emoji, currentUser.uid);
      } else {
          // Local reaction logic for demo if needed, otherwise rely on firebase
      }
  }, [activeContactId, currentUser]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
      if (!activeContactId) return;
      if (activeContactId === 'global_chat') {
          await deleteMessageGlobal(messageId);
      } else {
          // Local delete for private chat demo
          const chatId = getChatId(currentUser.uid, activeContactId);
          await deletePrivateMessage(chatId, messageId);
      }
  }, [activeContactId, currentUser]);

  const handlePinMessage = useCallback(async (message: Message) => {
      if (!activeContactId) return;
      const pinPayload = {
          id: message.id,
          text: message.type === 'text' ? message.text.substring(0, 50) : (message.type === 'image' ? 'تصویر' : 'فایل'),
          sender: message.senderName || 'شما',
          type: message.type
      };
      const chatId = activeContactId === 'global_chat' ? 'global_chat' : getChatId(currentUser.uid, activeContactId);
      await setChatPin(chatId, pinPayload);
  }, [activeContactId, currentUser]);

  const handleUnpinMessage = useCallback(async () => {
      if (!activeContactId) return;
      const chatId = activeContactId === 'global_chat' ? 'global_chat' : getChatId(currentUser.uid, activeContactId);
      await removeChatPin(chatId);
  }, [activeContactId, currentUser]);

  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
      if (!activeContactId || !currentUser) return;
      if (activeContactId === 'global_chat') {
          await editMessageGlobal(messageId, newText);
      } else {
          const chatId = getChatId(currentUser.uid, activeContactId);
          await editPrivateMessage(chatId, messageId, newText);
      }
  }, [activeContactId, currentUser]);
  
  const handleOpenForward = useCallback((message: Message) => {
      setMessageToForward(message);
      setShowForwardModal(true);
  }, []);

  const executeForward = async (targetId: string) => {
      if (!messageToForward || !currentUser) return;
      
      const targetContact = contacts.find(c => c.id === targetId);
      if (!targetContact && targetId !== 'saved') return;

      try {
          const forwardPayload: Partial<Message> = {
              text: messageToForward.text,
              type: messageToForward.type,
              imageUrl: messageToForward.imageUrl,
              fileUrl: messageToForward.fileUrl,
              fileName: messageToForward.fileName,
              fileSize: messageToForward.fileSize,
              audioDuration: messageToForward.audioDuration,
              isSticker: messageToForward.isSticker,
              forwardedFrom: {
                  name: messageToForward.senderName || 'Unknown',
                  id: messageToForward.senderId,
                  avatar: messageToForward.senderAvatar
              }
          };

          if (targetId === 'saved') {
               await sendPrivateMessage(getChatId(currentUser.uid, 'saved'), 'saved', forwardPayload, { name: userProfile.name, avatar: userProfile.avatar });
          } else if (targetContact) {
              if (targetContact.id === 'global_chat') {
                   await sendGlobalMessage(forwardPayload, userProfile);
              } else {
                   const chatId = targetContact.type === 'user' ? getChatId(currentUser.uid, targetContact.id) : targetContact.id;
                   await sendPrivateMessage(chatId, targetContact.id, forwardPayload, { name: userProfile.name, avatar: userProfile.avatar });
              }
          }
          
          setShowForwardModal(false);
          setMessageToForward(null);
          setSystemAlert({ title: 'موفق', message: 'پیام فوروارد شد' });
          setTimeout(() => setSystemAlert(null), 3000);
      } catch (e) {
          console.error("Forward failed", e);
      }
  };

  if (authLoading) {
      return (
          <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
              <RefreshCw className="animate-spin text-telegram-primary" size={32} />
          </div>
      );
  }

  if (!currentUser) {
      return (
          <AuthPage 
              onSuccess={() => {}} 
              storedAccounts={storedAccounts} 
              initialEmail={targetEmail}
          />
      );
  }

  if (userProfile.isBanned) {
      return <BanScreen currentUser={userProfile} onLogout={() => logoutUser(currentUser.uid)} banExpiresAt={userProfile.banExpiresAt} />;
  }

  if (maintenanceMode && userProfile.role !== 'owner' && userProfile.role !== 'developer') {
      return <MaintenancePage onLogout={() => logoutUser(currentUser.uid)} />;
  }

  // Active Chat Logic
  const activeSession = activeContactId ? sessions[activeContactId] : null;
  const activeContact = activeContactId ? contacts.find(c => c.id === activeContactId) : null;
  const activeMessages = activeSession ? activeSession.messages : [];

  return (
    <div className={`flex h-full overflow-hidden ${theme}`}>
       {/* Call UI Overlay */}
       {callState.isActive && (
           <CallModal 
               localStream={callState.localStream}
               remoteStream={callState.remoteStream}
               isIncoming={callState.isIncoming}
               callerName={callState.remoteName}
               callerAvatar={callState.remoteAvatar}
               isVideo={callState.isVideo}
               onAccept={handleAcceptCall}
               onReject={handleEndCall}
               status={callState.status}
           />
       )}

       {/* System Notifications */}
       {systemAlert && (
           <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-black/80 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-fade-in-down">
               <Bell className="text-yellow-400" />
               <div>
                   <div className="font-bold text-sm">{systemAlert.title}</div>
                   <div className="text-xs opacity-80">{systemAlert.message}</div>
               </div>
               <button onClick={() => setSystemAlert(null)}><X size={16}/></button>
           </div>
       )}
       
       {/* Update Available Banner */}
       {updateAvailable && (
           <div className="fixed bottom-4 right-4 z-[100] bg-telegram-primary text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 animate-slide-in">
               <Download size={24} />
               <div>
                   <div className="font-bold">بروزرسانی جدید</div>
                   <div className="text-xs opacity-80">{forceUpdateMsg}</div>
               </div>
               <button onClick={() => window.location.reload()} className="bg-white text-telegram-primary px-3 py-1 rounded-lg font-bold text-sm">بروزرسانی</button>
           </div>
       )}

       {/* Sidebar */}
       <div className={`${activeContactId && isMobile ? 'hidden' : 'w-full md:w-80 lg:w-96'} h-full shrink-0 z-10`}>
          <Sidebar 
              contacts={contacts} 
              sessions={sessions} 
              activeContactId={activeContactId} 
              onSelectContact={handleSelectContact}
              toggleTheme={toggleTheme}
              theme={theme}
              userProfile={userProfile}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
              onAddContact={handleAddContact}
              showInstallButton={!!installPrompt}
              onInstall={handleInstallApp}
              storedAccounts={storedAccounts}
              onAddAccount={() => { logoutUser(); setTargetEmail(''); }}
              onSwitchAccount={(uid) => {
                  const acc = storedAccounts.find(a => a.uid === uid);
                  if(acc) {
                      setTargetEmail(acc.email);
                      logoutUser();
                  }
              }}
              onCreateGroup={handleCreateGroupWrapper}
              onDeleteChat={(id) => deleteChat(id)}
              onPinChat={handleTogglePinChat}
              onArchiveChat={handleToggleArchiveChat}
          />
       </div>

       {/* Main Chat Area */}
       <div className={`flex-1 h-full relative ${!activeContactId && isMobile ? 'hidden' : 'block'}`}>
           {activeContactId && activeContact ? (
               <ChatWindow 
                   contact={activeContact}
                   messages={activeMessages}
                   myId={currentUser.uid}
                   myRole={userProfile.role}
                   pinnedMessage={sessions[activeContactId]?.pinnedMessage}
                   onSendMessage={(content, replyToId) => {
                       if (activeContactId === 'global_chat') {
                           sendGlobalMessage(content, userProfile);
                       } else {
                           const chatId = activeContact.type === 'user' ? getChatId(currentUser.uid, activeContact.id) : activeContact.id;
                           sendPrivateMessage(chatId, activeContact.id, content, userProfile);
                       }
                   }}
                   onEditMessage={handleEditMessage}
                   onDeleteMessage={handleDeleteMessage}
                   onPinMessage={handlePinMessage}
                   onUnpinMessage={handleUnpinMessage}
                   onReaction={handleReaction}
                   onBack={() => setActiveContactId(null)}
                   isMobile={isMobile}
                   onProfileClick={() => setShowProfile(true)}
                   wallpaper={wallpaper}
                   onCall={handleStartCall}
                   onClearHistory={() => {
                       if(confirm("آیا از پاک کردن تاریخچه مطمئن هستید؟")) {
                           if (activeContactId === 'global_chat') clearGlobalChat(); // usually restricted
                           else {
                               const chatId = getChatId(currentUser.uid, activeContactId);
                               clearPrivateChatHistory(chatId);
                           }
                       }
                   }}
                   onDeleteChat={() => {
                       if(confirm("آیا از حذف این گفتگو مطمئن هستید؟")) {
                           deleteChat(activeContact.type === 'user' ? getChatId(currentUser.uid, activeContact.id) : activeContact.id);
                           setActiveContactId(null);
                       }
                   }}
                   onBlockUser={() => {
                       if (activeContact.type === 'user') {
                           blockUser(currentUser.uid, activeContact.id).then(() => alert("کاربر مسدود شد."));
                       }
                   }}
                   onTyping={(isTyping) => setUserTyping(currentUser.uid, isTyping)}
                   onForwardMessage={handleOpenForward}
               />
           ) : (
               <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-black/20 text-center p-6 select-none">
                   <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-full mb-6 flex items-center justify-center animate-pulse">
                       <span className="text-4xl">👋</span>
                   </div>
                   <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">به ایران‌گرام خوش آمدید</h2>
                   <p className="text-gray-500 max-w-xs">
                       برای شروع گفتگو، یک مخاطب را از منوی سمت راست انتخاب کنید.
                   </p>
               </div>
           )}

           {/* Profile Pane Sidebar (Right/Overlay) */}
           {showProfile && activeContact && (
               <div className={`absolute inset-y-0 right-0 w-full md:w-80 lg:w-96 z-30 shadow-2xl transform transition-transform duration-300 ${showProfile ? 'translate-x-0' : 'translate-x-full'}`}>
                   <ProfilePane 
                       contact={activeContact} 
                       onClose={() => setShowProfile(false)}
                       currentUserId={currentUser.uid}
                       currentUserRole={userProfile.role}
                   />
               </div>
           )}
       </div>

       {/* Admin Panel Modal */}
       {isAdminPanelOpen && (
           <AdminPanel 
               onClose={() => setIsAdminPanelOpen(false)} 
               currentUserEmail={userProfile.email} 
               currentUserRole={userProfile.role}
               onStartChat={(user) => {
                   // Open chat with user logic
                   setIsAdminPanelOpen(false);
                   const existing = contacts.find(c => c.id === user.uid);
                   if (existing) {
                       handleSelectContact(user.uid);
                   } else {
                       // Temporary add contact logic if needed
                       handleAddContact({
                           id: user.uid,
                           name: user.name,
                           avatar: user.avatar,
                           username: '@' + user.username,
                           status: user.status as any,
                           phone: user.phone,
                           type: 'user',
                           bio: user.bio
                       });
                       handleSelectContact(user.uid);
                   }
               }}
           />
       )}

       {/* Settings Modal */}
       <SettingsModal 
           isOpen={isSettingsOpen}
           onClose={() => setIsSettingsOpen(false)}
           userProfile={userProfile}
           onSave={(data) => {
               updateUserProfileDoc(currentUser.uid, data);
               setUserProfile(prev => ({ ...prev, ...data }));
           }}
           wallpaper={wallpaper}
           onSaveWallpaper={(wp) => {
               setWallpaper(wp);
               localStorage.setItem('irangram_wallpaper', wp);
           }}
       />

       {/* Forward Modal */}
       <ForwardModal 
           isOpen={showForwardModal}
           onClose={() => { setShowForwardModal(false); setMessageToForward(null); }}
           contacts={contacts}
           onForward={executeForward}
       />
       
       {/* Exit Confirmation (Mobile) */}
       {showExitConfirm && (
           <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
               <div className="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-sm w-full shadow-2xl text-center">
                   <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">خروج از برنامه؟</h3>
                   <p className="text-gray-500 mb-6">آیا می‌خواهید از برنامه خارج شوید؟</p>
                   <div className="flex gap-3">
                       <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">خیر</button>
                       <button onClick={() => { isExitingRef.current = true; window.history.back(); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg">بله</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default App;

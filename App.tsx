
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
import { Contact, ChatSession, Message, Theme, UserRole, UserProfileData, StoredAccount, IncomingCall } from './types';
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
import { RefreshCw, Download, LogOut, Phone, Mic, MicOff, PhoneOff, Bell, AlertTriangle, Construction } from 'lucide-react';
import { CONFIG } from './config';

// Short Pop Sound (Base64)
const POP_SOUND_BASE64 = "data:audio/mpeg;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
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
      const content = {
          text: messageToForward.text,
          type: messageToForward.type,
          imageUrl: messageToForward.imageUrl,
          fileUrl: messageToForward.fileUrl,
          fileName: messageToForward.fileName,
          fileSize: messageToForward.fileSize,
          audioDuration: messageToForward.audioDuration,
          isSticker: messageToForward.isSticker,
          forwardedFrom: {
              name: messageToForward.senderName || messageToForward.senderId,
              id: messageToForward.senderId,
              avatar: messageToForward.senderAvatar
          }
      };
      try {
           if (targetId === 'global_chat') {
                const avatarToSend = userProfile.name ? `https://ui-avatars.com/api/?name=${userProfile.name}&background=random&color=fff&size=64` : '';
                await sendGlobalMessage({
                    ...content,
                    senderId: currentUser.uid
                }, { name: userProfile.name, avatar: avatarToSend, role: userProfile.role });
           } else {
                const chatId = getChatId(currentUser.uid, targetId);
                await sendPrivateMessage(chatId, targetId, {
                    ...content,
                    senderId: currentUser.uid
                }, { name: userProfile.name, avatar: userProfile.avatar });
           }
           alert("پیام فوروارد شد.");
           setShowForwardModal(false);
           setMessageToForward(null);
           handleSelectContact(targetId);
      } catch (e) {
          console.error("Forward failed", e);
          alert("خطا در فوروارد پیام.");
      }
  };

  const handleSendMessage = useCallback(async (content: any, replyToId?: string) => {
    if (!activeContactId || !currentUser) return;
    
    // GUEST RESTRICTION
    if (userProfile.role === 'guest' && activeContactId === 'global_chat') {
        alert("کاربران مهمان فقط امکان مشاهده چت عمومی را دارند.");
        return;
    }

    let finalImageUrl = content.imageUrl;
    let finalFileUrl = content.fileUrl;

    if (content.file && !content.fileUrl && !content.imageUrl) {
        try {
            const folder = content.type === 'audio' ? 'audios' : content.type === 'image' ? 'images' : 'files';
            const path = `uploads/${currentUser.uid}/${folder}/${Date.now()}_${content.fileName || 'file'}`;
            const downloadUrl = await uploadMedia(content.file, path);
            if (content.type === 'image') finalImageUrl = downloadUrl;
            else finalFileUrl = downloadUrl;
        } catch (e) {
            console.error("Upload failed", e);
            alert("آپلود فایل با خطا مواجه شد.");
            return;
        }
    }

    if (activeContactId === 'global_chat') {
        const avatarToSend = userProfile.name ? `https://ui-avatars.com/api/?name=${userProfile.name}&background=random&color=fff&size=64` : '';
        try {
            await sendGlobalMessage({
                text: content.text,
                type: content.type,
                imageUrl: finalImageUrl,
                fileUrl: finalFileUrl,
                fileName: content.fileName,
                fileSize: content.fileSize,
                audioDuration: content.audioDuration,
                isSticker: content.isSticker,
                replyToId,
                senderId: currentUser.uid,
                forwardedFrom: content.forwardedFrom,
                poll: content.poll
            }, { name: userProfile.name, avatar: avatarToSend, role: userProfile.role }); 
        } catch(e) {
            console.error("Global msg failed", e);
            alert("خطا در ارسال پیام عمومی.");
        }
        return;
    }

    // Handle standard chats and "Saved Messages"
    const chatId = getChatId(currentUser.uid, activeContactId);
    try {
        await sendPrivateMessage(chatId, activeContactId, {
            text: content.text,
            type: content.type,
            senderId: currentUser.uid,
            imageUrl: finalImageUrl,
            fileUrl: finalFileUrl,
            fileName: content.fileName,
            fileSize: content.fileSize,
            audioDuration: content.audioDuration,
            isSticker: content.isSticker,
            replyToId,
            forwardedFrom: content.forwardedFrom,
            poll: content.poll
        }, { name: userProfile.name, avatar: userProfile.avatar });
    } catch(e) {
        console.error("Private msg failed", e);
        alert("خطا در ارسال پیام خصوصی.");
    }
  }, [activeContactId, currentUser, userProfile, contacts, sessions]);

  const handleSaveProfile = async (newProfile: any) => {
      const updatedProfile = { ...userProfile, ...newProfile };
      setUserProfile(updatedProfile);
      if (currentUser) {
          await updateUserProfileDoc(currentUser.uid, updatedProfile);
          setStoredAccounts(prev => {
              const safeAccount = {
                  uid: String(currentUser.uid),
                  name: String(updatedProfile.name),
                  avatar: String(updatedProfile.avatar),
                  email: String(currentUser.email),
                  username: String(updatedProfile.username),
                  role: updatedProfile.role
              };
              const others = prev.filter(acc => acc.uid !== currentUser.uid);
              const updated = [safeAccount, ...others];
              localStorage.setItem('irangram_accounts', JSON.stringify(updated));
              return updated;
          });
      }
  };

  // --- LOGOUT & ACCOUNT SWITCHING FIX ---
  const handleLogout = async () => { setShowExitConfirm(true); };
  
  const handleConfirmLogout = async () => { 
      try {
          setShowExitConfirm(false); 
          setTargetEmail(''); 
          localStorage.removeItem('irangram_proxy_user'); // Explicitly clear proxy session
          await logoutUser(currentUser?.uid); 
      } catch (e) {
          console.error("Logout failed", e);
      } finally {
          setCurrentUser(null);
          // Hard reload to clear all React state and memory
          window.location.href = window.location.origin;
      }
  }
  
  const handleAddAccount = async () => { 
      setTargetEmail(''); 
      localStorage.removeItem('irangram_proxy_user');
      try {
          await logoutUser(currentUser?.uid); 
      } catch(e) {}
      setCurrentUser(null); 
      window.location.href = window.location.origin;
  };
  
  const handleSwitchAccount = async (targetUid: string) => { 
      const account = storedAccounts.find(acc => acc.uid === targetUid); 
      if (account) {
          // Pre-fill for UX, though auth flow handles actual switch
          localStorage.setItem('irangram_auth_retry_email', account.email);
          localStorage.setItem('irangram_auth_retry_name', account.name);
      }
      
      localStorage.removeItem('irangram_proxy_user'); // Clear current session
      try {
          await logoutUser(currentUser?.uid); 
      } catch(e) {}
      
      setCurrentUser(null);
      window.location.href = window.location.origin; 
  };
  
  const handleStartChatFromAdmin = (targetUser: UserProfileData) => { const contact: Contact = { id: targetUser.uid, name: targetUser.name, avatar: targetUser.avatar, bio: targetUser.bio, username: '@' + targetUser.username, phone: targetUser.phone, status: 'offline', type: 'user' }; handleAddContact(contact); };
  const handleAvatarClick = (senderProfile: Partial<Contact>) => { if (senderProfile.id === 'me' || senderProfile.id === currentUser?.uid) { setIsSettingsOpen(true); } else { setViewingContact({ id: senderProfile.id!, name: senderProfile.name || 'کاربر', avatar: senderProfile.avatar || '', username: '', phone: '', bio: 'کاربر ایران‌گرام', type: 'user', status: 'offline' }); } };
  const handleDeleteChat = async (targetId?: string) => { const idToDelete = targetId || activeContactId; if (!idToDelete) return; if (!confirm("آیا از حذف این گفتگو مطمئن هستید؟ این عمل غیرقابل بازگشت است.")) return; try { if (idToDelete !== 'saved' && idToDelete !== 'global_chat') { const chatId = getChatId(currentUser.uid, idToDelete); await deleteChat(chatId); } setContacts(prev => prev.filter(c => c.id !== idToDelete)); setSessions(prev => { const newSessions = { ...prev }; delete newSessions[idToDelete]; return newSessions; }); if (activeContactId === idToDelete) setActiveContactId(null); } catch (e) { console.error("Delete chat failed", e); } };
  const handleClearHistory = async () => { if (!activeContactId) return; if (!confirm("آیا از پاک کردن تاریخچه چت مطمئن هستید؟")) return; try { const chatId = getChatId(currentUser.uid, activeContactId === 'saved' ? 'saved' : activeContactId); await clearPrivateChatHistory(chatId); setSessions(prev => ({ ...prev, [activeContactId]: { ...prev[activeContactId], messages: [] } })); } catch (e) { console.error("Clear history failed", e); } };
  const handleBlockUser = async () => { if (!activeContactId) return; if (!confirm("آیا از مسدود کردن این کاربر مطمئن هستید؟")) return; try { await blockUser(currentUser.uid, activeContactId); alert("کاربر مسدود شد."); } catch (e) { console.error("Block user failed", e); } };
  const handleTyping = (isTyping: boolean) => { if (currentUser) setUserTyping(currentUser.uid, isTyping); };
  
  const performUpdate = () => { 
      if (pendingUpdateTimestamp > 0) {
          localStorage.setItem('last_forced_update', pendingUpdateTimestamp.toString());
      }
      window.location.reload(); 
  };

  if (authLoading) return <div className="h-[100dvh] w-full flex items-center justify-center bg-white dark:bg-black text-telegram-primary"><RefreshCw className="animate-spin w-10 h-10" /></div>;
  
  // Maintenance Mode Checks
  const isSuperAdmin = userProfile.role === 'owner' || userProfile.role === 'developer';
  if ((maintenanceMode || userProfile.isUnderMaintenance) && !isSuperAdmin) {
      return <MaintenancePage onLogout={handleConfirmLogout} />;
  }

  if (!currentUser) return <AuthPage onSuccess={setCurrentUser} storedAccounts={storedAccounts} initialEmail={targetEmail} />;
  if (userProfile.isBanned && !isSuperAdmin) return <BanScreen currentUser={{ uid: currentUser.uid, name: userProfile.name }} onLogout={() => setShowExitConfirm(true)} banExpiresAt={userProfile.banExpiresAt} />;

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-white dark:bg-black font-sans relative">
      
      <ForwardModal isOpen={showForwardModal} onClose={() => setShowForwardModal(false)} contacts={contacts} onForward={executeForward} />

      {/* Call Modal */}
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

      {/* Exit/Logout Confirmation Modal */}
      {showExitConfirm && (
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700 text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut size={32} /></div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">خروج از ایران‌گرام؟</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">آیا مطمئن هستید؟ با خروج، ممکن است پیام‌های ارسال نشده از بین بروند.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">انصراف</button>
                      <button onClick={() => { if (activeContactId === null) handleConfirmLogout(); else { isExitingRef.current = true; window.history.back(); } }} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">بله، مطمئنم</button>
                  </div>
              </div>
          </div>
      )}

      {/* SYSTEM ALERT MODAL */}
      {systemAlert && (
          <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-6 animate-fade-in backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full border-t-4 border-blue-500">
                  <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400"><Bell size={28} /><h3 className="text-xl font-bold">{systemAlert.title}</h3></div>
                  <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed whitespace-pre-wrap">{systemAlert.message}</p>
                  <button onClick={() => setSystemAlert(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl transition-colors">متوجه شدم</button>
              </div>
          </div>
      )}

      {/* FORCE UPDATE TOAST */}
      {updateAvailable && !isSuperAdmin && (
          <div onClick={performUpdate} className="fixed bottom-6 left-6 z-[100] bg-telegram-primary text-white p-4 rounded-2xl shadow-2xl shadow-blue-500/30 flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform animate-slide-in">
              <div className="bg-white/20 p-2.5 rounded-full"><RefreshCw size={24} className="animate-spin" /></div>
              <div className="text-right"><h3 className="font-bold text-sm">بروزرسانی جدید</h3><p className="text-xs opacity-90 mt-0.5">{forceUpdateMsg || 'برای اعمال تغییرات کلیک کنید'}</p></div>
          </div>
      )}

      {/* Admin Panel */}
      {isAdminPanelOpen && <AdminPanel onClose={() => setIsAdminPanelOpen(false)} currentUserEmail={currentUser.email} currentUserRole={userProfile.role || 'user'} onStartChat={handleStartChatFromAdmin} />}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} userProfile={userProfile} onSave={handleSaveProfile} wallpaper={wallpaper} onSaveWallpaper={setWallpaper} />

      <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar */}
          <div className={`${isMobile && activeContactId ? 'hidden' : 'flex'} ${isMobile ? 'w-full' : 'w-80 lg:w-96'} flex-col h-full z-20 transition-all duration-300 shadow-xl bg-white dark:bg-telegram-bgDark border-l border-gray-200 dark:border-white/5`}>
            <div className="flex-1 overflow-hidden">
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
                    showInstallButton={true} 
                    onInstall={handleInstallApp} 
                    storedAccounts={storedAccounts} 
                    onAddAccount={handleAddAccount} 
                    onSwitchAccount={handleSwitchAccount} 
                    onCreateGroup={handleCreateGroupWrapper} 
                    onDeleteChat={handleDeleteChat}
                    onPinChat={handleTogglePinChat}
                    onArchiveChat={handleToggleArchiveChat}
                />
            </div>
             <div className="p-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                 <span className="text-xs text-gray-400 px-2 font-mono opacity-50">v{CONFIG.VERSION}</span>
                 <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-lg transition-colors" title="خروج کامل"><LogOut size={18} /></button>
             </div>
          </div>

          {/* Main Chat Area */}
          <div className={`${isMobile && !activeContactId ? 'hidden' : 'flex'} flex-1 h-full relative flex-col min-w-0`}>
            <div className="flex-1 h-full relative flex flex-col min-w-0">
                {activeContactId ? (
                <ChatWindow key={activeContactId} contact={contacts.find(c => c.id === activeContactId)!} messages={sessions[activeContactId].messages} pinnedMessage={sessions[activeContactId].pinnedMessage} myId={currentUser?.uid || 'me'} myRole={userProfile.role || 'user'} onSendMessage={handleSendMessage} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage} onPinMessage={handlePinMessage} onUnpinMessage={handleUnpinMessage} onReaction={handleReaction} onBack={() => window.history.back()} isMobile={isMobile} onProfileClick={() => setShowProfile(true)} onAvatarClick={handleAvatarClick} wallpaper={wallpaper} onCall={(video) => handleStartCall(video)} onDeleteChat={() => handleDeleteChat()} onClearHistory={handleClearHistory} onBlockUser={handleBlockUser} onTyping={handleTyping} onForwardMessage={handleOpenForward} />
                ) : (
                <div className="h-full w-full flex items-center justify-center bg-telegram-bg dark:bg-telegram-bgDark text-gray-400 dark:text-gray-600 pattern-bg">
                     <div className="text-center p-8 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 dark:border-white/5 animate-scale-in">
                        <span className="text-5xl block mb-6 animate-bounce">👋</span>
                        <h3 className="font-bold text-xl mb-2 text-gray-800 dark:text-gray-100">به ایران‌گرام خوش آمدید</h3>
                        <p className="text-sm opacity-80">برای شروع گفتگو کلیک کنید</p>
                    </div>
                </div>
                )}
            </div>

            {/* Profile Overlay */}
            {(showProfile || viewingContact) && (
                <div className={`absolute inset-y-0 right-0 z-[60] bg-white dark:bg-telegram-secondaryDark shadow-2xl transition-transform duration-300 ${isMobile ? 'w-full' : 'w-96 border-l border-gray-200 dark:border-white/5'}`}>
                    <ProfilePane contact={viewingContact || contacts.find(c => c.id === activeContactId)!} onClose={() => { setShowProfile(false); setViewingContact(null); }} onStartChat={viewingContact ? (c) => { handleAddContact(c); setViewingContact(null); } : undefined} currentUserId={currentUser.uid} currentUserRole={userProfile.role} />
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default App;

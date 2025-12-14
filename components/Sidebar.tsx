
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Menu, Moon, Sun, Bookmark, Settings, ShieldAlert, UserPlus, X, Loader2, Download, ChevronDown, Plus, Users, Globe, MessageSquare, Trash2, Camera, RefreshCw, LogOut, CheckSquare, Square, Ban, User, Zap, Eraser, Megaphone, Archive, Pin, PinOff, Folder, FolderOpen, WifiOff, AlertTriangle, Phone, CircleUser, HelpCircle, Share2, Info, Edit3, FileText, Image as ImageIcon, Video, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact, ChatSession, Theme, UserRole, UserProfileData, StoredAccount, ChatFolder, Message, AdSettings } from '../types';
import { searchUser, syncPhoneContacts, blockUser, unblockUser, checkBlockedStatus, subscribeToChatFolders, saveChatFolders, resolveEntityByUsername } from '../services/firebaseService';
import { CONFIG } from '../config';
import FolderSettingsModal from './FolderSettingsModal';
import AdBanner from './AdBanner';

interface SidebarProps {
  contacts: Contact[];
  sessions: Record<string, ChatSession>;
  activeContactId: string | null;
  onSelectContact: (id: string, messageId?: string) => void;
  toggleTheme: () => void;
  theme: Theme;
  userProfile: { uid: string; name: string; username: string; phone: string; role?: UserRole; avatar?: string };
  onOpenSettings: () => void;
  onOpenAdminPanel: () => void;
  onAddContact: (contact: Contact) => void;
  showInstallButton: boolean;
  onInstall: () => void;
  storedAccounts: StoredAccount[];
  onAddAccount: () => void;
  onSwitchAccount: (uid: string) => void;
  onCreateGroup: (name: string, description: string, imageFile: File | null, memberIds: string[], isChannel: boolean) => void;
  onDeleteChat?: (id: string) => void;
  onPinChat?: (id: string) => void;
  onArchiveChat?: (id: string) => void;
  onLogout?: () => void;
  adSettings?: AdSettings | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, sessions, activeContactId, onSelectContact, toggleTheme, theme, userProfile, onOpenSettings, onOpenAdminPanel, onAddContact, showInstallButton, onInstall, storedAccounts, onAddAccount, onSwitchAccount, onCreateGroup, onDeleteChat, onPinChat, onArchiveChat, onLogout, adSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [userFolders, setUserFolders] = useState<ChatFolder[]>([]);
  const [isFolderSettingsOpen, setIsFolderSettingsOpen] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  
  // Connectivity States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverReachable, setServerReachable] = useState(true);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, contactId: string } | null>(null);

  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  
  const [addContactQuery, setAddContactQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfileData | null>(null);
  const [searchError, setSearchError] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const groupFileInputRef = useRef<HTMLInputElement>(null);
  
  // GLOBAL SEARCH STATE
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const isGuest = userProfile.role === 'guest';
  const isAdminOrDev = userProfile.role === 'owner' || userProfile.role === 'developer';

  // Determine Ad Config
  const showSidebarAd = adSettings ? adSettings.sidebarBanner : CONFIG.ADS.SIDEBAR_BANNER;
  const sidebarAdId = adSettings ? adSettings.providers.sidebarId : CONFIG.ADS.PROVIDERS.SIDEBAR_ID;
  
  // Native List Ad
  const nativeAdId = adSettings ? adSettings.providers.nativeListId : CONFIG.ADS.PROVIDERS.NATIVE_LIST_ID;
  const nativeAdPos = adSettings ? (adSettings.providers.nativeListPosition ?? 3) : 3;

  // Load Folders
  useEffect(() => {
      if (userProfile.uid) {
          const unsub = subscribeToChatFolders(userProfile.uid, (folders) => {
              setUserFolders(folders);
          });
          return () => unsub();
      }
  }, [userProfile.uid]);

  useEffect(() => {
    const checkServerConnection = async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            return;
        }
        try {
            await fetch(`https://www.gstatic.com/generate_204?t=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' });
            setServerReachable(true);
            setIsOnline(true);
        } catch (e) {
            setServerReachable(false);
        }
    };
    const handleOnline = () => { setIsOnline(true); checkServerConnection(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkServerConnection();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // Global Search Logic Placeholder
  useEffect(() => {
      if (!searchTerm.trim()) { setIsSearchingGlobal(false); return; }
      setIsSearchingGlobal(true);
  }, [searchTerm]);

  useEffect(() => { const handleClick = () => setContextMenu(null); window.addEventListener('click', handleClick); return () => window.removeEventListener('click', handleClick); }, []);

  const handleSearchUser = async () => {
      if(!addContactQuery.trim()) return;
      setIsSearching(true);
      setSearchError('');
      setFoundUser(null);
      const user = await searchUser(addContactQuery);
      if(user) {
          if (user.username === userProfile.username) setSearchError('شما نمی‌توانید خودتان را اضافه کنید.');
          else setFoundUser(user);
      } else setSearchError('کاربری با این مشخصات یافت نشد.');
      setIsSearching(false);
  };

  const executeAddContact = () => {
      if(foundUser) {
          onAddContact({ id: foundUser.uid, name: foundUser.name, avatar: foundUser.avatar, bio: foundUser.bio, username: '@' + foundUser.username, phone: foundUser.phone, status: foundUser.status as any || 'offline', type: 'user' });
          setShowAddContact(false); setFoundUser(null); setAddContactQuery('');
      }
  };

  const executeCreateGroup = async () => {
      if (!groupName.trim()) return alert("نام گروه الزامی است");
      setIsCreatingGroup(true);
      try {
          onCreateGroup(groupName, groupDesc, groupImage, selectedMembers, isCreatingChannel);
          setShowCreateGroup(false);
          setGroupName('');
          setGroupDesc('');
          setGroupImage(null);
          setGroupImagePreview(null);
          setSelectedMembers([]);
      } finally {
          setIsCreatingGroup(false);
      }
  };

  const handleGroupImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setGroupImage(file);
          setGroupImagePreview(URL.createObjectURL(file));
      }
  };

  const toggleGroupMember = (contactId: string) => {
      setSelectedMembers(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
  };

  const displayedContacts = useMemo(() => {
      let filtered = contacts.filter(c => {
          if (activeFolderId === 'all') return !c.isArchived;
          if (activeFolderId === 'archived') return c.isArchived;
          const currentFolder = userFolders.find(f => f.id === activeFolderId);
          if (currentFolder) {
              if (currentFolder.filters.excludeArchived && c.isArchived) return false;
              if (currentFolder.filters.excludeRead && sessions[c.id]?.unreadCount === 0) return false;
              if (currentFolder.filters.includeTypes.length > 0 && !currentFolder.filters.includeTypes.includes(c.type as any)) return false;
              return true;
          }
          return true;
      });
      
      // Basic search filter
      if (searchTerm.trim()) {
          filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      return filtered.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          const sessionA = sessions[a.id];
          const sessionB = sessions[b.id];
          const timeA = sessionA?.messages.length ? sessionA.messages[sessionA.messages.length - 1].timestamp : 0;
          const timeB = sessionB?.messages.length ? sessionB.messages[sessionB.messages.length - 1].timestamp : 0;
          return timeB - timeA;
      });
  }, [contacts, sessions, activeFolderId, userFolders, searchTerm]);

  const getSubtitle = (contact: Contact) => {
      if (contact.status === 'typing...') return <span className="text-telegram-primary">در حال نوشتن...</span>;
      const session = sessions[contact.id];
      if (session && session.messages.length > 0) {
          const lastMsg = session.messages[session.messages.length - 1];
          if (lastMsg.type === 'image') return '📷 عکس';
          if (lastMsg.type === 'audio') return '🎤 پیام صوتی';
          if (lastMsg.type === 'video_note') return '📹 پیام ویدیویی';
          if (lastMsg.type === 'sticker') return 'Sticker';
          if (lastMsg.type === 'file') return '📄 فایل';
          return lastMsg.text;
      }
      return contact.bio || '';
  };

  const handleContextMenu = (e: React.MouseEvent, contactId: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, contactId }); };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-telegram-secondaryDark border-l border-gray-200 dark:border-telegram-borderDark relative">
      
      {/* Side Menu Drawer */}
      <AnimatePresence>
          {isMenuOpen && (
              <>
                  <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      onClick={() => setIsMenuOpen(false)} 
                      className="fixed inset-0 bg-black/50 z-[100]" 
                  />
                  <motion.div 
                      initial={{ x: '-100%' }} 
                      animate={{ x: 0 }} 
                      exit={{ x: '-100%' }} 
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-telegram-secondaryDark z-[101] shadow-2xl flex flex-col overflow-hidden"
                  >
                      {/* Header */}
                      <div className="bg-telegram-primary p-5 pb-3">
                          <div className="flex justify-between items-start mb-3">
                              <img src={userProfile.avatar} className="w-14 h-14 rounded-full bg-white object-cover" />
                              <button onClick={() => toggleTheme()} className="text-white opacity-80 hover:opacity-100">
                                  {theme === Theme.DARK ? <Sun size={20} /> : <Moon size={20} />}
                              </button>
                          </div>
                          <div className="flex justify-between items-end">
                              <div className="text-white">
                                  <div className="font-bold text-sm truncate max-w-[180px]">{userProfile.name}</div>
                                  <div className="text-xs opacity-70 font-mono mt-0.5">{userProfile.phone || userProfile.email}</div>
                              </div>
                              <button onClick={() => setIsAccountsOpen(!isAccountsOpen)} className={`text-white transition-transform ${isAccountsOpen ? 'rotate-180' : ''}`}>
                                  <ChevronDown size={20} />
                              </button>
                          </div>
                      </div>

                      {/* Accounts Dropdown */}
                      <AnimatePresence>
                          {isAccountsOpen && (
                              <motion.div 
                                  initial={{ height: 0 }} 
                                  animate={{ height: 'auto' }} 
                                  exit={{ height: 0 }} 
                                  className="bg-gray-50 dark:bg-black/20 overflow-hidden"
                              >
                                  {storedAccounts.map(acc => (
                                      <button 
                                          key={acc.uid} 
                                          onClick={() => { onSwitchAccount(acc.uid); setIsMenuOpen(false); }}
                                          className={`w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-white/5 ${acc.uid === userProfile.uid ? 'bg-white dark:bg-white/5' : ''}`}
                                      >
                                          <img src={acc.avatar} className="w-8 h-8 rounded-full" />
                                          <div className="text-right flex-1 min-w-0">
                                              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{acc.name}</div>
                                          </div>
                                      </button>
                                  ))}
                                  <button onClick={() => { onAddAccount(); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 text-sm font-bold text-telegram-primary hover:bg-gray-100 dark:hover:bg-white/5">
                                      <div className="w-6"><Plus size={20} /></div>
                                      افزودن حساب کاربری
                                  </button>
                              </motion.div>
                          )}
                      </AnimatePresence>

                      {/* Menu Items */}
                      <div className="flex-1 overflow-y-auto py-2">
                          {[
                              { icon: Users, label: 'گروه جدید', action: () => { setShowCreateGroup(true); setIsCreatingChannel(false); } },
                              { icon: Megaphone, label: 'کانال جدید', action: () => { setShowCreateGroup(true); setIsCreatingChannel(true); } },
                              { icon: User, label: 'مخاطبین', action: () => { setShowAddContact(true); } },
                              { icon: Bookmark, label: 'پیام‌های ذخیره شده', action: () => { onSelectContact('saved'); setIsMenuOpen(false); } },
                              { icon: Folder, label: 'پوشه‌بندی گفتگوها', action: () => { setIsFolderSettingsOpen(true); setIsMenuOpen(false); } },
                              { icon: Settings, label: 'تنظیمات', action: () => { onOpenSettings(); setIsMenuOpen(false); } },
                          ].map((item, i) => (
                              <button key={i} onClick={item.action} className="w-full flex items-center gap-5 px-5 py-3 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200">
                                  <item.icon size={22} className="text-gray-500 dark:text-gray-400" />
                                  <span className="font-medium text-sm">{item.label}</span>
                              </button>
                          ))}
                          
                          <div className="my-2 border-t border-gray-100 dark:border-white/5"></div>

                          {showInstallButton && (
                              <button onClick={onInstall} className="w-full flex items-center gap-5 px-5 py-3 hover:bg-gray-100 dark:hover:bg-white/5 text-telegram-primary font-bold">
                                  <Download size={22} />
                                  <span className="text-sm">نصب ایران‌گرام</span>
                              </button>
                          )}

                          {isAdminOrDev && (
                              <button onClick={() => { onOpenAdminPanel(); setIsMenuOpen(false); }} className="w-full flex items-center gap-5 px-5 py-3 hover:bg-gray-100 dark:hover:bg-white/5 text-red-600 dark:text-red-400">
                                  <ShieldAlert size={22} />
                                  <span className="font-bold text-sm">پنل مدیریت</span>
                              </button>
                          )}

                          <button onClick={() => { if(confirm("خروج از حساب؟")) onLogout && onLogout(); }} className="w-full flex items-center gap-5 px-5 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                              <LogOut size={22} />
                              <span className="text-sm">خروج</span>
                          </button>
                      </div>
                      
                      <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-100 dark:border-white/5">
                          Irangram Web v{CONFIG.VERSION}
                      </div>
                  </motion.div>
              </>
          )}
      </AnimatePresence>

      <FolderSettingsModal 
          isOpen={isFolderSettingsOpen} 
          onClose={() => setIsFolderSettingsOpen(false)}
          folders={userFolders}
          onSaveFolders={(folders) => saveChatFolders(userProfile.uid, folders)}
      />
      
      {/* Context Menu */}
      {contextMenu && (
          <div 
            className="fixed z-[200] bg-white dark:bg-gray-800 shadow-xl rounded-xl border dark:border-gray-700 py-1 w-48 animate-fade-in"
            style={{ top: Math.min(contextMenu.y, window.innerHeight - 200), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
            onClick={(e) => e.stopPropagation()}
          >
              {onPinChat && <button onClick={() => { onPinChat(contextMenu.contactId); setContextMenu(null); }} className="w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><Pin size={16} /> پین/آنپین</button>}
              {onArchiveChat && <button onClick={() => { onArchiveChat(contextMenu.contactId); setContextMenu(null); }} className="w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><Archive size={16} /> آرشیو/بازگردانی</button>}
              {onDeleteChat && <button onClick={() => { onDeleteChat(contextMenu.contactId); setContextMenu(null); }} className="w-full text-right px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 text-sm"><Trash2 size={16} /> حذف گفتگو</button>}
          </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">افزودن مخاطب</h3>
            <div className="space-y-4">
              <input 
                value={addContactQuery}
                onChange={(e) => setAddContactQuery(e.target.value)}
                placeholder="نام کاربری (بدون @)..."
                className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-black/20 dark:border-gray-600 outline-none"
              />
              <button onClick={handleSearchUser} disabled={isSearching} className="w-full py-2 bg-telegram-primary text-white rounded-xl font-bold flex items-center justify-center gap-2">
                 {isSearching && <Loader2 className="animate-spin" size={16} />} جستجو
              </button>
              
              {searchError && <p className="text-red-500 text-sm text-center">{searchError}</p>}
              
              {foundUser && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-telegram-primary" onClick={executeAddContact}>
                  <img src={foundUser.avatar} className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">{foundUser.name}</div>
                    <div className="text-xs text-gray-500">@{foundUser.username}</div>
                  </div>
                  <UserPlus size={18} className="mr-auto text-telegram-primary" />
                </div>
              )}
            </div>
            <button onClick={() => { setShowAddContact(false); setFoundUser(null); setAddContactQuery(''); setSearchError(''); }} className="w-full mt-4 py-2 text-gray-500">انصراف</button>
          </div>
        </div>
      )}

      {/* Create Group/Channel Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isCreatingChannel ? 'ایجاد کانال جدید' : 'ایجاد گروه جدید'}
                </h3>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Image Uploader */}
              <div className="flex justify-center">
                  <div 
                    className="w-20 h-20 rounded-full bg-telegram-primary/10 border-2 border-dashed border-telegram-primary flex items-center justify-center cursor-pointer relative overflow-hidden group"
                    onClick={() => groupFileInputRef.current?.click()}
                  >
                      {groupImagePreview ? (
                          <img src={groupImagePreview} className="w-full h-full object-cover" />
                      ) : (
                          <Camera size={28} className="text-telegram-primary" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="text-white" />
                      </div>
                  </div>
                  <input type="file" ref={groupFileInputRef} className="hidden" accept="image/*" onChange={handleGroupImageChange} />
              </div>

              <input 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={isCreatingChannel ? "نام کانال" : "نام گروه"}
                className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-black/20 dark:border-gray-600 outline-none"
              />
              
              <textarea 
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="توضیحات (اختیاری)"
                className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-black/20 dark:border-gray-600 outline-none resize-none h-20"
              />

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <label className="text-sm font-bold text-gray-500 mb-2 block">افزودن اعضا</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {contacts.filter(c => c.type === 'user' && c.id !== 'saved').map(c => (
                          <div key={c.id} onClick={() => toggleGroupMember(c.id)} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer">
                              <div className="flex items-center gap-3">
                                  <img src={c.avatar} className="w-8 h-8 rounded-full bg-gray-200" />
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMembers.includes(c.id) ? 'bg-telegram-primary border-telegram-primary' : 'border-gray-300'}`}>
                                  {selectedMembers.includes(c.id) && <CheckSquare size={12} className="text-white" />}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-black/10 flex gap-3">
                <button onClick={() => setShowCreateGroup(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors">انصراف</button>
                <button onClick={executeCreateGroup} disabled={isCreatingGroup || !groupName} className="flex-1 py-3 bg-telegram-primary disabled:opacity-50 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                    {isCreatingGroup ? <Loader2 className="animate-spin mx-auto" /> : 'ایجاد'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar UI */}
      <div className="px-3 pt-3 pb-1 shrink-0 bg-white dark:bg-telegram-secondaryDark z-10">
         <div className="flex items-center gap-3 mb-3">
             <button onClick={() => setIsMenuOpen(true)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500 transition-colors"><Menu size={24} /></button>
             <div className="relative flex-1 group">
                 <input type="text" placeholder="جستجو سراسری..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-full py-2.5 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-telegram-primary/50 text-sm transition-all" />
                 <Search className="absolute right-3.5 top-3 text-gray-400 w-4 h-4" />
             </div>
         </div>
         
         {/* Dynamic Folder Tabs */}
         {!isSearchingGlobal && (
             <div className="flex overflow-x-auto gap-1 border-b border-gray-100 dark:border-white/5 pb-1 no-scrollbar">
                 <button onClick={() => setActiveFolderId('all')} className={`px-3 py-2 text-xs font-medium rounded-full shrink-0 transition-colors ${activeFolderId === 'all' ? 'bg-telegram-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>همه</button>
                 {userFolders.map(folder => (
                     <button key={folder.id} onClick={() => setActiveFolderId(folder.id)} className={`px-3 py-2 text-xs font-medium rounded-full shrink-0 transition-colors ${activeFolderId === folder.id ? 'bg-telegram-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>{folder.name}</button>
                 ))}
                 <button onClick={() => setActiveFolderId('archived')} className={`px-3 py-2 text-xs font-medium rounded-full shrink-0 transition-colors ${activeFolderId === 'archived' ? 'bg-telegram-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>آرشیو</button>
             </div>
         )}
      </div>
      
       <div className="flex-1 overflow-y-auto p-2 pb-20 custom-scrollbar">
            {isSearchingGlobal ? (
                <div className="space-y-4 animate-fade-in text-center text-gray-500 text-sm py-10">
                    {/* Placeholder for global search logic if implemented later */}
                    در حال جستجو...
                </div>
            ) : (
                <div className="space-y-1">
                    {/* ADVERTISEMENT SLOT - SIDEBAR BOTTOM */}
                    {showSidebarAd && (
                        <div className="px-1 mb-2">
                            <AdBanner slotId={sidebarAdId} format="banner" className="rounded-xl overflow-hidden shadow-sm" adSettings={adSettings} />
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                    {displayedContacts.map((contact, index) => (
                        <React.Fragment key={contact.id}>
                            <motion.div 
                                layout
                                onClick={() => onSelectContact(contact.id)} 
                                onContextMenu={(e) => handleContextMenu(e, contact.id)}
                                className={`group relative flex items-center gap-3 p-3 mx-1 rounded-2xl cursor-pointer transition-colors duration-200 select-none overflow-hidden ${activeContactId === contact.id ? 'bg-telegram-primary text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            >
                                <div className="relative shrink-0">
                                    {contact.id === 'saved' ? (
                                        <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center text-white"><Bookmark size={24} fill="currentColor" /></div>
                                    ) : (
                                        <div className="relative">
                                            <img src={contact.avatar} className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                                            {contact.status === 'online' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                         <h3 className={`font-bold text-sm truncate ${activeContactId === contact.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                                             {contact.name}
                                             {contact.isPinned && <Pin size={12} className="inline ml-1 opacity-70 rotate-45" />}
                                         </h3>
                                         {sessions[contact.id]?.unreadCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white text-telegram-primary shadow-sm">{sessions[contact.id].unreadCount}</span>}
                                    </div>
                                    <p className={`text-sm truncate pr-1 ${activeContactId === contact.id ? 'text-blue-100' : 'text-gray-500'}`}>{getSubtitle(contact)}</p>
                                </div>
                            </motion.div>

                            {/* INJECT NATIVE AD */}
                            {nativeAdId && index === nativeAdPos && (
                                <div className="mx-1 my-1">
                                    <AdBanner 
                                        slotId={nativeAdId} 
                                        format="banner" 
                                        className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
                                        adSettings={adSettings}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                    </AnimatePresence>
                </div>
            )}
       </div>
    </div>
  );
};

export default Sidebar;

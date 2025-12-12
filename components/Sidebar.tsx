
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Menu, Moon, Sun, Bookmark, Settings, ShieldAlert, UserPlus, X, Loader2, Download, ChevronDown, Plus, Users, Globe, MessageSquare, Trash2, Camera, RefreshCw, LogOut, CheckSquare, Square, Ban, User, Zap, Eraser, Megaphone, Archive, Pin, PinOff, Folder, FolderOpen } from 'lucide-react';
import { Contact, ChatSession, Theme, UserRole, UserProfileData, StoredAccount } from '../types';
import { searchUser, syncPhoneContacts, blockUser, unblockUser, checkBlockedStatus } from '../services/firebaseService';

interface SidebarProps {
  contacts: Contact[];
  sessions: Record<string, ChatSession>;
  activeContactId: string | null;
  onSelectContact: (id: string) => void;
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
}

type FolderType = 'all' | 'personal' | 'groups' | 'channels' | 'archived';

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, sessions, activeContactId, onSelectContact, toggleTheme, theme, userProfile, onOpenSettings, onOpenAdminPanel, onAddContact, showInstallButton, onInstall, storedAccounts, onAddAccount, onSwitchAccount, onCreateGroup, onDeleteChat, onPinChat, onArchiveChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState<FolderType>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  
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
  
  const [showInstallModal, setShowInstallModal] = useState(false);

  const isGuest = userProfile.role === 'guest';

  // Close context menu on click outside
  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  // Search Logic
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
          onAddContact({
              id: foundUser.uid, name: foundUser.name, avatar: foundUser.avatar, bio: foundUser.bio, username: '@' + foundUser.username, phone: foundUser.phone, status: foundUser.status as any || 'offline', type: 'user'
          });
          setShowAddContact(false);
          setFoundUser(null);
          setAddContactQuery('');
      }
  };

  const executeCreateGroup = async () => {
      if (groupName.trim()) {
          setIsCreatingGroup(true);
          try {
              await onCreateGroup(groupName, groupDesc, groupImage, selectedMembers, isCreatingChannel);
              setGroupName(''); setGroupDesc(''); setGroupImage(null); setGroupImagePreview(null); setSelectedMembers([]); setShowCreateGroup(false);
          } catch (e) { console.error(e); } finally { setIsCreatingGroup(false); }
      }
  };

  const handleInstallClick = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS || !window.matchMedia('(display-mode: standalone)').matches) {
           setShowInstallModal(true);
      } else {
           onInstall();
      }
      setIsMenuOpen(false);
  };

  const handleClearCache = () => {
      if (confirm("آیا از پاکسازی حافظه موقت مطمئن هستید؟ این کار باعث رفرش شدن برنامه می‌شود.")) {
          // Clear only cache, keeping user session if possible or force reload
          window.location.reload(); 
      }
  };

  const handleManualUpdate = () => {
      window.location.reload();
  };

  const handleGroupImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setGroupImage(file);
          const reader = new FileReader();
          reader.onload = (ev) => { setGroupImagePreview(ev.target?.result as string); };
          reader.readAsDataURL(file);
      }
  };
  
  const toggleGroupMember = (contactId: string) => {
      setSelectedMembers(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
  };

  // --- Filtering & Sorting Logic ---
  const displayedContacts = useMemo(() => {
      let filtered = contacts.filter(c => {
          // Search Filter
          const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.username.toLowerCase().includes(searchTerm.toLowerCase());
          if (!matchesSearch) return false;

          // Folder Filter
          if (activeFolder === 'archived') return c.isArchived;
          if (c.isArchived) return false; // Hide archived chats from other tabs

          if (activeFolder === 'personal') return c.type === 'user';
          if (activeFolder === 'groups') return c.type === 'group';
          if (activeFolder === 'channels') return c.type === 'channel';
          return true; // 'all'
      });

      // Sorting: Pinned first, then by last message timestamp
      return filtered.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          
          const sessionA = sessions[a.id];
          const sessionB = sessions[b.id];
          const timeA = sessionA?.messages.length ? sessionA.messages[sessionA.messages.length - 1].timestamp : 0;
          const timeB = sessionB?.messages.length ? sessionB.messages[sessionB.messages.length - 1].timestamp : 0;
          
          return timeB - timeA;
      });
  }, [contacts, sessions, activeFolder, searchTerm]);

  const getSubtitle = (contact: Contact) => {
      if (contact.status === 'typing...') return <span className="text-telegram-primary">در حال نوشتن...</span>;
      
      const session = sessions[contact.id];
      if (session && session.messages.length > 0) {
          const lastMsg = session.messages[session.messages.length - 1];
          if (lastMsg.type === 'image') return '📷 عکس';
          if (lastMsg.type === 'audio') return '🎤 پیام صوتی';
          if (lastMsg.type === 'file') return '📁 فایل';
          if (lastMsg.type === 'video_note') return '⭕ پیام ویدیویی';
          if (lastMsg.type === 'sticker') return '⭐ استیکر';
          return lastMsg.text;
      }
      return contact.bio || (contact.type === 'channel' ? 'کانال' : (contact.type === 'group' ? 'گروه' : ''));
  };

  const handleContextMenu = (e: React.MouseEvent, contactId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, contactId });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-telegram-secondaryDark border-l border-gray-200 dark:border-telegram-borderDark relative">
      {/* Install Help Modal */}
      {showInstallModal && (
          <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowInstallModal(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">نصب وب‌اپلیکیشن (PWA)</h3>
                  <div className="space-y-4 text-sm leading-relaxed">
                      <p>اگر دکمه نصب خودکار کار نکرد، از روش زیر استفاده کنید:</p>
                      <div className="bg-gray-100 dark:bg-black/20 p-3 rounded-lg">
                          <strong className="block mb-1 text-blue-600">در آیفون (iOS - Safari):</strong>
                          1. دکمه Share (اشتراک‌گذاری) در پایین مرورگر را بزنید.<br/>
                          2. گزینه <strong>Add to Home Screen</strong> را انتخاب کنید.
                      </div>
                      <div className="bg-gray-100 dark:bg-black/20 p-3 rounded-lg">
                          <strong className="block mb-1 text-green-600">در اندروید (Chrome):</strong>
                          1. سه نقطه بالای مرورگر را بزنید.<br/>
                          2. گزینه <strong>Install App</strong> یا <strong>Add to Home screen</strong> را انتخاب کنید.
                      </div>
                  </div>
                  <button onClick={() => setShowInstallModal(false)} className="mt-6 w-full py-2 bg-telegram-primary text-white rounded-lg">متوجه شدم</button>
              </div>
          </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
          <div 
            className="fixed z-[200] bg-white dark:bg-gray-800 shadow-xl rounded-xl border dark:border-gray-700 py-1 w-48 animate-fade-in"
            style={{ top: Math.min(contextMenu.y, window.innerHeight - 200), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
            onClick={(e) => e.stopPropagation()}
          >
              {onPinChat && (
                  <button onClick={() => { onPinChat(contextMenu.contactId); setContextMenu(null); }} className="w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      {contacts.find(c => c.id === contextMenu.contactId)?.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                      {contacts.find(c => c.id === contextMenu.contactId)?.isPinned ? 'برداشتن پین' : 'پین کردن'}
                  </button>
              )}
              {onArchiveChat && (
                  <button onClick={() => { onArchiveChat(contextMenu.contactId); setContextMenu(null); }} className="w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <Archive size={16} />
                      {contacts.find(c => c.id === contextMenu.contactId)?.isArchived ? 'خروج از آرشیو' : 'آرشیو کردن'}
                  </button>
              )}
              {onDeleteChat && contextMenu.contactId !== 'saved' && contextMenu.contactId !== 'global_chat' && (
                  <button onClick={() => { onDeleteChat(contextMenu.contactId); setContextMenu(null); }} className="w-full text-right px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 text-sm">
                      <Trash2 size={16} /> حذف گفتگو
                  </button>
              )}
          </div>
      )}

      {/* Drawer Menu */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-white dark:bg-telegram-secondaryDark z-30 shadow-2xl transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-telegram-primary p-6 flex flex-col justify-end text-white relative overflow-hidden">
             <div className="absolute -top-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
             <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-telegram-primary text-2xl font-bold shadow-lg overflow-hidden ring-4 ring-white/20">
                    {userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover"/> : (userProfile.name?.charAt(0) || 'U')}
                </div>
                <button onClick={toggleTheme} className="p-2.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md">
                     {theme === Theme.DARK ? <Sun size={20} /> : <Moon size={20} />}
                </button>
             </div>
             <div className="relative z-10 cursor-pointer" onClick={() => setIsAccountsOpen(!isAccountsOpen)}>
                 <div className="flex justify-between items-center">
                    <div className="font-bold text-lg truncate flex items-center gap-2">
                        {userProfile.name}
                        {isGuest && <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded text-[10px] font-bold">مهمان</span>}
                    </div>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isAccountsOpen ? 'rotate-180' : ''}`} />
                 </div>
                 <div className="text-sm opacity-80 font-mono dir-ltr text-right mt-1">{userProfile.phone || userProfile.username}</div>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
            {!isAccountsOpen ? (
                <div className="flex flex-col animate-fade-in">
                    {!isGuest && (
                        <>
                            <button onClick={() => { setIsCreatingChannel(false); setShowCreateGroup(true); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                                <Users size={22} className="text-gray-500" /> <span className="font-medium">گروه جدید</span>
                            </button>
                            <button onClick={() => { setIsCreatingChannel(true); setShowCreateGroup(true); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                                <Megaphone size={22} className="text-gray-500" /> <span className="font-medium">کانال جدید</span>
                            </button>
                            <button onClick={() => { setShowAddContact(true); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                                <UserPlus size={22} className="text-gray-500" /> <span className="font-medium">افزودن مخاطب</span>
                            </button>
                        </>
                    )}
                    <button onClick={() => { onSelectContact('saved'); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                        <Bookmark size={22} className="text-gray-500" /> <span className="font-medium">پیام‌های ذخیره شده</span>
                    </button>
                    <button onClick={() => { setActiveFolder('archived'); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                        <Archive size={22} className="text-gray-500" /> <span className="font-medium">چت‌های آرشیو شده</span>
                    </button>
                    <button onClick={() => { onOpenSettings(); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                        <Settings size={22} className="text-gray-500" /> <span className="font-medium">تنظیمات</span>
                    </button>
                    
                    {/* New Buttons */}
                    <button onClick={handleClearCache} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                        <Eraser size={22} className="text-gray-500" /> <span className="font-medium">پاکسازی حافظه موقت</span>
                    </button>
                    <button onClick={handleManualUpdate} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                        <RefreshCw size={22} className="text-gray-500" /> <span className="font-medium">بروزرسانی وبسایت</span>
                    </button>

                    <button onClick={handleInstallClick} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                        <Download size={22} className="text-gray-500" /> <span className="font-medium">نصب اپلیکیشن</span>
                    </button>
                    {(userProfile.role === 'owner' || userProfile.role === 'admin' || userProfile.role === 'developer') && (
                        <button onClick={() => { onOpenAdminPanel(); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 transition-colors border-t border-gray-100 dark:border-gray-800 mt-2">
                            <ShieldAlert size={22} /> <span className="font-bold">پنل مدیریت</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="animate-fade-in space-y-1">
                     {storedAccounts.filter(acc => acc.uid !== userProfile.uid).map(acc => (
                        <button key={acc.uid} onClick={() => { onSwitchAccount(acc.uid); setIsMenuOpen(false); setIsAccountsOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                            <img src={acc.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                            <div className="text-right">
                                <div className="font-bold text-sm">{acc.name}</div>
                                <div className="text-xs opacity-60">@{acc.username}</div>
                            </div>
                        </button>
                    ))}
                    <button onClick={() => { onAddAccount(); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center"><Plus size={20} /></div>
                        <span className="font-medium">افزودن حساب کاربری</span>
                    </button>
                </div>
            )}
        </div>
      </div>
      
      {isMenuOpen && <div className="absolute inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>}

      {/* Add Contact Modal */}
      {showAddContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex justify-between items-center">
                      افزودن مخاطب
                      <button onClick={() => setShowAddContact(false)}><X size={20} className="text-gray-500" /></button>
                  </h3>
                  <div className="mb-4">
                      <input 
                        value={addContactQuery} 
                        onChange={(e) => setAddContactQuery(e.target.value)} 
                        placeholder="نام کاربری یا شماره موبایل..." 
                        className="w-full bg-gray-100 dark:bg-black/20 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-telegram-primary text-gray-900 dark:text-white transition-all" 
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                      />
                  </div>
                  
                  {isSearching && <div className="text-center py-4 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" /> در حال جستجو...</div>}
                  {searchError && <div className="text-red-500 text-sm text-center py-2 bg-red-50 dark:bg-red-900/10 rounded-lg">{searchError}</div>}
                  
                  {foundUser && (
                      <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl flex items-center gap-3 mb-4 border border-green-200 dark:border-green-800">
                          <img src={foundUser.avatar} className="w-12 h-12 rounded-full" />
                          <div>
                              <div className="font-bold text-gray-900 dark:text-white">{foundUser.name}</div>
                              <div className="text-xs text-gray-500">@{foundUser.username}</div>
                          </div>
                      </div>
                  )}

                  <button 
                    onClick={foundUser ? executeAddContact : handleSearchUser} 
                    className="w-full bg-telegram-primary text-white font-bold py-3 rounded-xl shadow-lg hover:bg-telegram-primaryDark transition-all"
                  >
                      {foundUser ? 'افزودن به مخاطبین' : 'جستجو'}
                  </button>
              </div>
          </div>
      )}

      {/* Create Group/Channel Modal */}
      {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto border border-white/20">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{isCreatingChannel ? 'کانال جدید' : 'گروه جدید'}</h3>
                      <button onClick={() => setShowCreateGroup(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={24} className="text-gray-500" /></button>
                  </div>
                  <div className="flex justify-center mb-8">
                      <div onClick={() => groupFileInputRef.current?.click()} className="relative w-28 h-28 rounded-full bg-gray-100 dark:bg-black/20 flex items-center justify-center border-4 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden group transition-colors hover:border-telegram-primary">
                          {groupImagePreview ? <img src={groupImagePreview} className="w-full h-full object-cover" /> : <Camera size={36} className="text-gray-400" />}
                      </div>
                      <input type="file" ref={groupFileInputRef} className="hidden" accept="image/*" onChange={handleGroupImageChange} />
                  </div>
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="text-sm font-medium text-gray-500 mb-1 block">نام</label>
                          <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={isCreatingChannel ? "نام کانال" : "نام گروه"} className="w-full bg-gray-100 dark:bg-black/20 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-telegram-primary text-gray-900 dark:text-white transition-all" />
                      </div>
                      <div>
                          <label className="text-sm font-medium text-gray-500 mb-1 block">توضیحات</label>
                          <input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="درباره..." className="w-full bg-gray-100 dark:bg-black/20 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-telegram-primary text-gray-900 dark:text-white transition-all" />
                      </div>
                  </div>
                  {!isCreatingChannel && (
                      <div className="mb-6">
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                              <span>افزودن عضو</span>
                              <span className="bg-telegram-primary/10 text-telegram-primary px-2 py-0.5 rounded-full text-xs">{selectedMembers.length}</span>
                          </h4>
                          <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-black/10 rounded-xl p-2 custom-scrollbar border border-gray-100 dark:border-gray-700">
                              {contacts.filter(c => c.type === 'user' && c.id !== 'saved').map(contact => (
                                  <div key={contact.id} onClick={() => toggleGroupMember(contact.id)} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all mb-1 ${selectedMembers.includes(contact.id) ? 'bg-telegram-primary/10 dark:bg-telegram-primary/20' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                      <div className="relative">
                                          <img src={contact.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                                          {selectedMembers.includes(contact.id) && <div className="absolute -bottom-1 -right-1 bg-telegram-primary text-white rounded-full p-0.5"><CheckSquare size={12} fill="white" /></div>}
                                      </div>
                                      <div className="flex-1"><div className="font-semibold text-sm text-gray-900 dark:text-white">{contact.name}</div></div>
                                      {selectedMembers.includes(contact.id) ? <CheckSquare className="text-telegram-primary" size={20} /> : <Square className="text-gray-300 dark:text-gray-600" size={20} />}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  <button onClick={executeCreateGroup} disabled={!groupName.trim() || isCreatingGroup} className="w-full bg-telegram-primary hover:bg-telegram-primaryDark disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-telegram-primary/30 flex justify-center items-center gap-2">
                      {isCreatingGroup ? <Loader2 className="animate-spin" /> : (isCreatingChannel ? 'ایجاد کانال' : 'ایجاد گروه')}
                  </button>
              </div>
          </div>
      )}

      {/* Main Sidebar UI */}
      <div className="px-3 pt-3 pb-1 shrink-0 bg-white dark:bg-telegram-secondaryDark z-10">
         <div className="flex items-center gap-3 mb-3">
             <button onClick={() => { setIsMenuOpen(true); setIsAccountsOpen(false); }} className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500 transition-colors"><Menu size={24} /></button>
             <div className="relative flex-1 group">
                 <input type="text" placeholder="جستجو..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-full py-2.5 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-telegram-primary/50 text-sm transition-all" />
                 <Search className="absolute right-3.5 top-3 text-gray-400 w-4 h-4" />
             </div>
         </div>
         
         {/* Folder Tabs */}
         <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-gray-100 dark:border-white/5 pb-1">
             {[
                 { id: 'all', label: 'همه' },
                 { id: 'personal', label: 'شخصی' },
                 { id: 'groups', label: 'گروه‌ها' },
                 { id: 'channels', label: 'کانال‌ها' },
                 { id: 'archived', label: 'آرشیو' }
             ].map(tab => (
                 <button 
                    key={tab.id} 
                    onClick={() => setActiveFolder(tab.id as FolderType)}
                    className={`px-3 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${activeFolder === tab.id ? 'bg-telegram-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                 >
                     {tab.label}
                 </button>
             ))}
         </div>
      </div>
      
       <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {displayedContacts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <p className="text-sm">هیچ گفتگویی یافت نشد.</p>
                </div>
            ) : displayedContacts.map(contact => (
                <div 
                    key={contact.id} 
                    onClick={() => onSelectContact(contact.id)} 
                    onContextMenu={(e) => handleContextMenu(e, contact.id)}
                    className={`group relative flex items-center gap-3 p-3 mx-1 mb-1 rounded-2xl cursor-pointer transition-all duration-200 select-none ${activeContactId === contact.id ? 'bg-telegram-primary text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
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
                             <div className="flex items-center gap-1 min-w-0">
                                <h3 className={`font-bold text-sm truncate ${activeContactId === contact.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{contact.name}</h3>
                                {contact.isPinned && <Pin size={12} className={`rotate-45 ${activeContactId === contact.id ? 'text-white/80' : 'text-gray-400'}`} />}
                             </div>
                             {sessions[contact.id]?.unreadCount > 0 && (
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeContactId === contact.id ? 'bg-white text-telegram-primary' : 'bg-telegram-primary text-white'}`}>{sessions[contact.id].unreadCount}</span>
                             )}
                        </div>
                        <p className={`text-sm truncate pr-1 ${activeContactId === contact.id ? 'text-blue-100' : 'text-gray-500'}`}>
                            {getSubtitle(contact)}
                        </p>
                    </div>
                </div>
            ))}
       </div>
    </div>
  );
};

export default Sidebar;

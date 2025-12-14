
// ... existing imports ...
import React, { useEffect, useState, useRef } from 'react';
import { X, ShieldAlert, User, Trash2, Ban, CheckCircle, Bell, MessageSquare, Send, Settings, Eye, AlertTriangle, Flag, Check, ListChecks, ArrowLeft, ArrowRight, BookOpenCheck, Clock, Users, LogIn, Eraser, RefreshCw, Filter, Copy, Construction, Lock as LockIcon, Calendar, Info, Smartphone, CameraOff, PenTool, Reply, Edit2, Megaphone, Save, Layout, Search, Key, ChevronRight, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { getAllUsers, updateUserRole, toggleUserBan, suspendUser, sendSystemNotification, getWordFilters, updateWordFilters, subscribeToReports, handleReport, deleteReport, getAdminSpyChats, getAdminSpyMessages, subscribeToAppeals, resolveAppeal, deleteAppeal, deleteMessageGlobal, deletePrivateMessage, editMessageGlobal, editPrivateMessage, triggerSystemUpdate, wipeSystemData, deleteUserAccount, subscribeToDeletionRequests, resolveDeletionRequest, adminSendMessageAsUser, getAllGroups, forceJoinGroup, deleteChat, toggleUserMaintenance, setGlobalMaintenance, subscribeToSystemInfo, toggleUserScreenshotRestriction, setGlobalScreenshotRestriction, updateUserSystemPermissions, adminEditUserMessage, subscribeToAdSettings, updateAdSettings, getUserProfile } from '../services/firebaseService';
import { UserProfileData, UserRole, Message, Report, Contact, Appeal, DeletionRequest, SystemPermissions, AdSettings } from '../types';
import { CONFIG } from '../config';

// ... (Sidebar, UsersTab, SpyTab components remain unchanged) ...

// 1. Sidebar Navigation Component
const AdminSidebar = ({ activeTab, setActiveTab, isSuperAdmin }: { activeTab: string, setActiveTab: (t: any) => void, isSuperAdmin: boolean }) => {
    const MenuItem = ({ id, icon: Icon, label, badge }: any) => (
        <button 
            onClick={() => setActiveTab(id)} 
            className={`w-full text-right px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-all mb-1 ${activeTab === id ? 'bg-white dark:bg-white/10 text-telegram-primary shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
        >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badge > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
        </button>
    );

    return (
        <div className="w-64 bg-gray-50 dark:bg-black/20 border-l border-gray-200 dark:border-white/5 overflow-y-auto p-2 h-full hidden md:block">
            <div className="text-xs font-bold text-gray-400 px-4 py-2 uppercase">مدیریت کاربران</div>
            <MenuItem id="users" icon={Users} label="کاربران" />
            <MenuItem id="reports" icon={Flag} label="گزارش‌ها" />
            <MenuItem id="appeals" icon={MessageSquare} label="درخواست‌های رفع مسدودی" />
            <MenuItem id="deletions" icon={Trash2} label="حذف حساب" />
            
            <div className="text-xs font-bold text-gray-400 px-4 py-2 mt-4 uppercase">تنظیمات سیستم</div>
            <MenuItem id="filters" icon={Filter} label="فیلترینگ کلمات" />
            {isSuperAdmin && (
                <>
                    <MenuItem id="groups" icon={Users} label="مدیریت گروه‌ها" />
                    <MenuItem id="ads" icon={Layout} label="مدیریت تبلیغات" />
                    <MenuItem id="spy" icon={Eye} label="نظارت و جاسوسی" />
                    <MenuItem id="maintenance" icon={Construction} label="تعمیرات و نگهداری" />
                </>
            )}
        </div>
    );
};

// ... (UsersTab, SpyTab implementation details omitted for brevity as they don't change much, only AdsManagerTab is critical) ...
// Assuming UsersTab and SpyTab are defined here as before...
const UsersTab = ({ users, loadUsers, isSuperAdmin, currentUserRole, currentUserId, onStartChat, handleBanToggle, handleRoleChange, handleOpenPermModal }: any) => {
    // ... same as previous implementation ...
    return <div className="text-center p-4">Loading Users Tab... (Refer to previous code)</div>;
};
const SpyTab = ({ users }: { users: UserProfileData[] }) => {
    // ... same as previous implementation ...
    return <div className="text-center p-4">Loading Spy Tab... (Refer to previous code)</div>;
};


// 4. Advertising Manager Component (UPDATED)
const AdsManagerTab = ({ adConfig, setAdConfig, handleSaveAds }: any) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl text-green-600 dark:text-green-400">
                    <Layout size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">مدیریت تبلیغات (Yektanet)</h3>
                    <p className="text-xs text-gray-500">تنظیمات نمایش بنرها و جایگاه‌های تبلیغاتی یکتانت</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Master Switches */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700 hover:border-telegram-primary transition-colors">
                        <div>
                            <div className="font-bold text-gray-800 dark:text-white mb-1">فعال‌سازی کلی</div>
                            <div className="text-xs text-gray-500">سوییچ اصلی نمایش تمام تبلیغات</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={adConfig.enabled} onChange={(e) => setAdConfig({...adConfig, enabled: e.target.checked})} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-telegram-primary"></div>
                        </label>
                    </div>

                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700 hover:border-telegram-primary transition-colors">
                        <div>
                            <div className="font-bold text-gray-800 dark:text-white mb-1">حالت آزمایشی (Mock)</div>
                            <div className="text-xs text-gray-500">نمایش بنرهای تست بجای اسکریپت واقعی</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={adConfig.useMock} onChange={(e) => setAdConfig({...adConfig, useMock: e.target.checked})} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                    </div>
                </div>

                {/* Slot ID Configuration */}
                <div className="space-y-4 pt-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                        <strong className="block mb-1">راهنما:</strong>
                        لطفاً "کد جایگاه" (Slot ID) را دقیقاً همانطور که در پنل یکتانت نمایش داده می‌شود (مثلاً <code>pos-article-display-xxxxx</code>) وارد کنید.
                    </div>

                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700 mt-4">شناسه‌های جایگاه (Slot IDs)</h4>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {/* Sidebar Ad */}
                        <div className="flex flex-col md:flex-row gap-4 items-start bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                            <div className="flex-1">
                                <label className="block text-xs mb-1.5 font-bold text-gray-700 dark:text-gray-300">تبلیغ پایین سایدبار (Sidebar Bottom)</label>
                                <input 
                                    value={adConfig.providers.sidebarId}
                                    onChange={(e) => setAdConfig({...adConfig, providers: {...adConfig.providers, sidebarId: e.target.value}})}
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-black/20 text-sm font-mono focus:border-telegram-primary outline-none transition-all dir-ltr text-left"
                                    placeholder="e.g. pos-article-display-12345"
                                />
                            </div>
                            <div className="flex items-center pt-7">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 text-telegram-primary rounded accent-telegram-primary" checked={adConfig.sidebarBanner} onChange={(e) => setAdConfig({...adConfig, sidebarBanner: e.target.checked})} />
                                    <span className="text-sm font-bold">فعال</span>
                                </label>
                            </div>
                        </div>

                        {/* Native List Ad */}
                        <div className="flex flex-col md:flex-row gap-4 items-start bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                            <div className="flex-[2]">
                                <label className="block text-xs mb-1.5 font-bold text-gray-700 dark:text-gray-300">تبلیغ همسان در لیست چت (Native List Ad)</label>
                                <input 
                                    value={adConfig.providers.nativeListId}
                                    onChange={(e) => setAdConfig({...adConfig, providers: {...adConfig.providers, nativeListId: e.target.value}})}
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-black/20 text-sm font-mono focus:border-telegram-primary outline-none transition-all dir-ltr text-left"
                                    placeholder="e.g. pos-article-display-67890"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs mb-1.5 font-bold text-gray-700 dark:text-gray-300">موقعیت در لیست (ایندکس)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={adConfig.providers.nativeListPosition || 3}
                                    onChange={(e) => setAdConfig({...adConfig, providers: {...adConfig.providers, nativeListPosition: parseInt(e.target.value)}})}
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-black/20 text-sm font-mono focus:border-telegram-primary outline-none text-center"
                                />
                            </div>
                        </div>

                        {/* Chat Top Ad */}
                        <div className="flex flex-col md:flex-row gap-4 items-start bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                            <div className="flex-1">
                                <label className="block text-xs mb-1.5 font-bold text-gray-700 dark:text-gray-300">تبلیغ بالای صفحه چت (Chat Top)</label>
                                <input 
                                    value={adConfig.providers.chatId}
                                    onChange={(e) => setAdConfig({...adConfig, providers: {...adConfig.providers, chatId: e.target.value}})}
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-black/20 text-sm font-mono focus:border-telegram-primary outline-none transition-all dir-ltr text-left"
                                    placeholder="e.g. pos-article-display-11223"
                                />
                            </div>
                            <div className="flex items-center pt-7">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 text-telegram-primary rounded accent-telegram-primary" checked={adConfig.chatTopBanner} onChange={(e) => setAdConfig({...adConfig, chatTopBanner: e.target.checked})} />
                                    <span className="text-sm font-bold">فعال</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                    <button onClick={handleSaveAds} className="w-full py-3.5 bg-telegram-primary text-white rounded-xl font-bold shadow-lg hover:bg-telegram-primaryDark transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]">
                        <Save size={18} /> ذخیره و اعمال تغییرات
                    </button>
                </div>
            </div>
        </div>
    );
};

// Define Props Interface
interface AdminPanelProps {
  onClose: () => void;
  currentUserEmail: string;
  currentUserRole: UserRole;
  currentUserId: string;
  onStartChat: (user: any) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentUserEmail, currentUserRole, currentUserId, onStartChat }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'filters' | 'reports' | 'appeals' | 'deletions' | 'maintenance' | 'ads' | 'spy'>('users');
  
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  
  // System State
  const [globalMaintenance, setGlobalMaintenanceState] = useState(false);
  const [globalScreenshot, setGlobalScreenshotState] = useState(false);
  
  // Filters state
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');

  // Modals state
  const [notifModal, setNotifModal] = useState<{ isOpen: boolean; targetUid: string | null; targetName: string }>({ isOpen: false, targetUid: null, targetName: '' });
  const [notifText, setNotifText] = useState({ title: '', message: '' });
  const [permModal, setPermModal] = useState<{ isOpen: boolean; targetUid: string | null; perms: SystemPermissions }>({ isOpen: false, targetUid: null, perms: { canBanUsers: true, canDeleteUsers: false, canManageGroups: true, canSeeReports: true, canManageFilters: false, canSpy: false } });

  // Ad Settings State - UPDATED INITIAL STATE
  const [adConfig, setAdConfig] = useState<AdSettings>({
      enabled: false,
      useMock: true,
      sidebarBanner: false,
      chatTopBanner: false,
      providers: { sidebarId: '', chatId: '', nativeListId: '', nativeListPosition: 3 },
      customAd: { isActive: false, imageUrl: '', linkUrl: '', title: '' }
  });

  const isSuperAdmin = currentUserRole === 'owner' || currentUserRole === 'developer';

  useEffect(() => {
    // ... existing loads ...
    if(isSuperAdmin) {
        // ... existing loads ...
        const adUnsub = subscribeToAdSettings((settings) => {
            if(settings) {
                // Ensure legacy configs get new fields
                setAdConfig({
                    ...settings,
                    providers: {
                        sidebarId: settings.providers?.sidebarId || '',
                        chatId: settings.providers?.chatId || '',
                        nativeListId: settings.providers?.nativeListId || '',
                        nativeListPosition: settings.providers?.nativeListPosition || 3
                    }
                });
            }
        });
        return () => adUnsub();
    }
    // ... existing ...
  }, []);

  // ... (rest of functions: loadUsers, handleRoleChange, etc. same as before) ...
  const loadUsers = async () => { const fetchedUsers = await getAllUsers(); setUsers(fetchedUsers); };
  const handleBanToggle = async (uid: string, isBanned: boolean) => { if (uid === currentUserId) return alert("Error"); await toggleUserBan(uid, isBanned); setUsers(users.map(u => u.uid === uid ? { ...u, isBanned: !isBanned } : u)); };
  const handleRoleChange = async (uid: string, newRole: string) => { if (!isSuperAdmin) return; if (uid === currentUserId) return alert("Error"); await updateUserRole(uid, newRole as UserRole); setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as UserRole } : u)); };
  const handleOpenPermModal = (uid: string) => { const targetUser = users.find(u => u.uid === uid); if (targetUser) { setPermModal({ isOpen: true, targetUid: uid, perms: targetUser.systemPermissions || { canBanUsers: true, canDeleteUsers: false, canManageGroups: true, canSeeReports: true, canManageFilters: false, canSpy: false } }); } };
  const handleSavePerms = async () => { if (!permModal.targetUid) return; await updateUserSystemPermissions(permModal.targetUid, permModal.perms); setUsers(users.map(u => u.uid === permModal.targetUid ? { ...u, systemPermissions: permModal.perms } : u)); setPermModal({ isOpen: false, targetUid: null, perms: permModal.perms }); };
  const handleSaveAds = async () => { if (!adConfig) return; await updateAdSettings(adConfig); alert("تنظیمات تبلیغات ذخیره شد."); };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col animate-fade-in overflow-hidden">
        {/* Main Header */}
        <div className="bg-white dark:bg-telegram-secondaryDark border-b border-gray-200 dark:border-white/5 p-4 flex flex-wrap justify-between items-center shadow-sm shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
                <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl text-red-600 dark:text-red-400 shrink-0">
                    <ShieldAlert size={28} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">پنل مدیریت پیشرفته</h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wider truncate block">{currentUserEmail}</span>
                </div>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-500 hover:text-red-600 dark:text-gray-400 rounded-full transition-all">
                <X size={28} />
            </button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} isSuperAdmin={isSuperAdmin} />

            {/* Mobile Tab Select */}
            <div className="md:hidden absolute top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b p-2 overflow-x-auto whitespace-nowrap shadow-sm">
                 <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as any)} className="w-full p-2 rounded border bg-transparent dark:text-white dark:border-gray-600">
                     <option value="users">کاربران</option>
                     {isSuperAdmin && <option value="ads">تبلیغات</option>}
                     <option value="reports">گزارش‌ها</option>
                     {/* ... others ... */}
                 </select>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-black/40 p-4 md:p-8 pt-16 md:pt-8">
                
                {activeTab === 'users' && (
                    <UsersTab 
                        users={users} 
                        loadUsers={loadUsers} 
                        isSuperAdmin={isSuperAdmin} 
                        currentUserRole={currentUserRole}
                        currentUserId={currentUserId}
                        onStartChat={onStartChat}
                        handleBanToggle={handleBanToggle}
                        handleRoleChange={handleRoleChange}
                        handleOpenPermModal={handleOpenPermModal}
                    />
                )}

                {activeTab === 'ads' && isSuperAdmin && (
                    <AdsManagerTab adConfig={adConfig} setAdConfig={setAdConfig} handleSaveAds={handleSaveAds} />
                )}

                {/* ... other tabs ... */}
            </div>
        </div>
        {/* ... Modals ... */}
    </div>
  );
};
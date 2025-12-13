
import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, User, Trash2, Ban, CheckCircle, Bell, MessageSquare, Send, Settings, Eye, AlertTriangle, Flag, Check, ListChecks, ArrowLeft, ArrowRight, BookOpenCheck, Clock, Users, LogIn, Eraser, RefreshCw, Filter, Copy, Construction, Lock as LockIcon, Calendar, Info, Smartphone, CameraOff } from 'lucide-react';
import { getAllUsers, updateUserRole, toggleUserBan, suspendUser, sendSystemNotification, getWordFilters, updateWordFilters, subscribeToReports, handleReport, deleteReport, getAdminSpyChats, getAdminSpyMessages, subscribeToAppeals, resolveAppeal, deleteAppeal, deleteMessageGlobal, deletePrivateMessage, editMessageGlobal, editPrivateMessage, triggerSystemUpdate, wipeSystemData, deleteUserAccount, subscribeToDeletionRequests, resolveDeletionRequest, adminSendMessageAsUser, getAllGroups, forceJoinGroup, deleteChat, toggleUserMaintenance, setGlobalMaintenance, subscribeToSystemInfo, toggleUserScreenshotRestriction, setGlobalScreenshotRestriction } from '../services/firebaseService';
import { UserProfileData, UserRole, Message, Report, Contact, Appeal, DeletionRequest } from '../types';
import { CONFIG } from '../config';

interface AdminPanelProps {
  onClose: () => void;
  currentUserEmail: string;
  currentUserRole: UserRole;
  currentUserId: string; // Added currentUserId
  onStartChat: (user: UserProfileData) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentUserEmail, currentUserRole, currentUserId, onStartChat }) => {
  // Tabs state
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'filters' | 'reports' | 'appeals' | 'deletions' | 'maintenance'>('users');
  
  // Data state
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalMaintenance, setGlobalMaintenanceState] = useState(false);
  const [globalScreenshot, setGlobalScreenshotState] = useState(false);
  
  // Filters state
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');

  // Spy Modal state
  const [spyModal, setSpyModal] = useState<{ isOpen: boolean; targetUid: string | null; targetName: string }>({ isOpen: false, targetUid: null, targetName: '' });
  const [spyChats, setSpyChats] = useState<Contact[]>([]);
  const [activeSpyChat, setActiveSpyChat] = useState<string | null>(null);
  const [spyMessages, setSpyMessages] = useState<Message[]>([]);
  const [spyImpersonateText, setSpyImpersonateText] = useState('');

  // Notification Modal state
  const [notifModal, setNotifModal] = useState<{ isOpen: boolean; targetUid: string | null; targetName: string }>({ isOpen: false, targetUid: null, targetName: '' });
  const [notifText, setNotifText] = useState({ title: '', message: '' });

  const isSuperAdmin = currentUserRole === 'owner' || currentUserRole === 'developer';

  useEffect(() => {
    loadUsers();
    loadFilters();
    if(isSuperAdmin) {
        loadAllGroups();
        subscribeToSystemInfo((info) => {
            setGlobalMaintenanceState(info.maintenanceMode || false);
            setGlobalScreenshotState(info.globalScreenshotRestriction || false);
        });
    }
    
    const unsubReports = subscribeToReports(setReports);
    const unsubAppeals = subscribeToAppeals(setAppeals);
    const unsubDeletions = subscribeToDeletionRequests(setDeletionRequests);
    
    return () => { unsubReports(); unsubAppeals(); unsubDeletions(); };
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const fetchedUsers = await getAllUsers();
    setUsers(fetchedUsers);
    setLoading(false);
  };
  
  const loadAllGroups = async () => {
      const groups = await getAllGroups();
      setAllGroups(groups);
  };

  const loadFilters = async () => { 
      const words = await getWordFilters(); 
      setBannedWords(words); 
  };

  // Helper to translate roles
  const roleToLabel = (role: string) => {
      switch(role) {
          case 'owner': return 'مدیر کل';
          case 'developer': return 'برنامه‌نویس';
          case 'admin': return 'ادمین';
          case 'user': return 'کاربر';
          case 'guest': return 'مهمان';
          default: return role;
      }
  };

  // --- Actions ---

  const handleRoleChange = async (uid: string, newRole: string) => {
    if (!isSuperAdmin) return;
    if (uid === currentUserId) {
        alert("شما نمی‌توانید نقش خودتان را تغییر دهید.");
        return;
    }
    
    const targetUser = users.find(u => u.uid === uid);
    if (!targetUser) return;

    // Permissions logic
    if (currentUserRole !== 'developer') {
        if (targetUser.role === 'developer') {
            alert("شما اجازه تغییر نقش برنامه‌نویس را ندارید.");
            return;
        }
        if (targetUser.role === 'owner') {
            alert("شما اجازه تغییر نقش سایر مدیران کل را ندارید.");
            return;
        }
    }

    if (confirm(`آیا مطمئن هستید که می‌خواهید نقش کاربر را به ${roleToLabel(newRole)} تغییر دهید؟`)) {
        await updateUserRole(uid, newRole as UserRole);
        setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as UserRole } : u));
    }
  };
  
  const handleBanToggle = async (uid: string, isBanned: boolean) => {
    if (uid === currentUserId) {
        alert("شما نمی‌توانید خودتان را مسدود کنید.");
        return;
    }
    const targetUser = users.find(u => u.uid === uid);
    if (!targetUser) return;

    if (targetUser.role === 'developer') return;
    if (targetUser.role === 'owner' && currentUserRole !== 'developer') return;

    await toggleUserBan(uid, isBanned || false);
    setUsers(users.map(u => u.uid === uid ? { ...u, isBanned: !isBanned, banExpiresAt: undefined } : u));
  };

  const handleMaintenanceToggle = async (uid: string, currentStatus: boolean) => {
      if(!isSuperAdmin) return;
      if (uid === currentUserId) {
          alert("شما نمی‌توانید حساب خودتان را به حالت تعمیر ببرید.");
          return;
      }
      await toggleUserMaintenance(uid, !currentStatus);
      setUsers(users.map(u => u.uid === uid ? { ...u, isUnderMaintenance: !currentStatus } : u));
  };

  const handleScreenshotToggle = async (uid: string, currentStatus: boolean) => {
      if(!isSuperAdmin) return;
      await toggleUserScreenshotRestriction(uid, !currentStatus);
      setUsers(users.map(u => u.uid === uid ? { ...u, isScreenshotRestricted: !currentStatus } : u));
      alert(!currentStatus ? "قابلیت اسکرین‌شات برای کاربر محدود شد." : "محدودیت اسکرین‌شات برداشته شد.");
  };

  const handleDeleteUserAccount = async (uid: string) => {
      if (uid === currentUserId) {
          alert("شما نمی‌توانید حساب خودتان را از اینجا حذف کنید.");
          return;
      }
      const targetUser = users.find(u => u.uid === uid);
      if (!targetUser) return;
      if (targetUser.role === 'developer') return;
      if (targetUser.role === 'owner' && currentUserRole !== 'developer') return;

      if (confirm("آیا از حذف کامل حساب کاربری این شخص مطمئن هستید؟ این عمل غیرقابل بازگشت است.")) {
          await deleteUserAccount(uid);
          setUsers(users.filter(u => u.uid !== uid));
          alert("کاربر حذف شد.");
      }
  };

  const handleSendNotification = async () => {
      if (!notifModal.targetUid || !notifText.title || !notifText.message) return;
      await sendSystemNotification(notifModal.targetUid, notifText.title, notifText.message);
      setNotifModal({ isOpen: false, targetUid: null, targetName: '' });
      setNotifText({ title: '', message: '' });
      alert("اعلان ارسال شد.");
  };

  // --- Group Actions ---
  const handleForceJoin = async (groupId: string) => {
      const me = users.find(u => u.email === currentUserEmail);
      if(me && confirm("آیا می‌خواهید به زور عضو این گروه شوید؟")) {
          await forceJoinGroup(groupId, me.uid);
          alert("شما عضو گروه شدید.");
      }
  };
  
  const handleDeleteGroup = async (groupId: string) => {
      if(confirm("حذف کامل گروه؟")) {
          await deleteChat(groupId);
          setAllGroups(prev => prev.filter(g => g.id !== groupId));
          alert("گروه حذف شد.");
      }
  };

  // --- Filter Actions ---
  const handleAddWord = async () => {
      const wordToAdd = newWord.trim();
      if (!wordToAdd) return;
      if (bannedWords.includes(wordToAdd)) {
          setNewWord('');
          return;
      }
      
      const updated = [...bannedWords, wordToAdd];
      setBannedWords(updated);
      setNewWord('');
      
      try {
          await updateWordFilters(updated);
      } catch (e) {
          console.error("Failed to update words", e);
          setBannedWords(bannedWords);
          alert("خطا در ذخیره کلمات");
      }
  };

  const handleRemoveWord = async (word: string) => {
      const updated = bannedWords.filter(w => w !== word);
      setBannedWords(updated);
      await updateWordFilters(updated);
  };

  // --- Report/Appeal Actions ---
  const handleReportAction = async (reportId: string, action: 'dismiss' | 'ban', userId?: string) => {
      if (action === 'ban' && userId) {
          const targetUser = users.find(u => u.uid === userId);
          if (targetUser?.role === 'developer') return;
          await toggleUserBan(userId, false); 
      }
      await handleReport(reportId, currentUserEmail);
      if (action === 'dismiss') await deleteReport(reportId);
  };

  const handleAppealDecision = async (appealId: string, userId: string, approve: boolean) => {
      await resolveAppeal(appealId, approve);
      if (approve) {
          await toggleUserBan(userId, true);
      }
      alert(approve ? "درخواست پذیرفته شد." : "درخواست رد شد.");
  };

  const handleDeletionDecision = async (requestId: string, userId: string, approve: boolean) => {
      if (approve) {
          if (!confirm("آیا از حذف دائم حساب این کاربر مطمئن هستید؟")) return;
      }
      await resolveDeletionRequest(requestId, userId, approve);
      alert(approve ? "حساب کاربر حذف شد." : "درخواست رد شد.");
  };

  // --- Maintenance ---
  const handleForceUpdate = async () => {
      if(confirm("این کار باعث رفرش شدن صفحه تمام کاربران آنلاین می‌شود. ادامه می‌دهید؟")) {
          await triggerSystemUpdate();
          alert("دستور بروزرسانی ارسال شد.");
      }
  };

  const handleWipeData = async () => {
      const confirmation = prompt("برای تایید، کلمه 'DELETE' را بنویسید:");
      if (confirmation === 'DELETE') {
          await wipeSystemData();
          alert("اطلاعات سیستم پاکسازی شد.");
      }
  };

  const toggleGlobalMaintenance = async () => {
      const newState = !globalMaintenance;
      if (confirm(newState ? "فعال‌سازی حالت تعمیرات سراسری؟ فقط مدیران دسترسی خواهند داشت." : "غیرفعال‌سازی حالت تعمیرات؟")) {
          await setGlobalMaintenance(newState);
          setGlobalMaintenanceState(newState);
      }
  };

  const toggleGlobalScreenshot = async () => {
      const newState = !globalScreenshot;
      if (confirm(newState ? "غیرفعال کردن اسکرین‌شات برای تمام کاربران؟" : "آزاد کردن اسکرین‌شات برای همه؟")) {
          await setGlobalScreenshotRestriction(newState);
          setGlobalScreenshotState(newState);
      }
  };

  // --- Spy Mode ---
  const handleSendAsUser = async () => {
      if (!activeSpyChat || !spyModal.targetUid || !spyImpersonateText.trim()) return;
      await adminSendMessageAsUser(activeSpyChat, spyModal.targetUid, spyImpersonateText);
      setSpyImpersonateText('');
      getAdminSpyMessages(spyModal.targetUid, activeSpyChat).then(setSpyMessages);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
                <ShieldAlert className="text-red-600" size={28} />
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">پنل مدیریت پیشرفته</h2>
                    <span className="text-xs text-gray-500 font-mono tracking-wider">{currentUserRole.toUpperCase()} ACCESS</span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500"><X size={24} /></button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar bg-white dark:bg-gray-900">
            {[
                { id: 'users', label: 'کاربران', icon: User },
                ...(isSuperAdmin ? [{ id: 'groups', label: 'گروه‌ها', icon: Users }] : []),
                { id: 'filters', label: 'فیلتر کلمات', icon: Filter },
                { id: 'reports', label: 'گزارشات', icon: Flag },
                { id: 'appeals', label: 'درخواست‌ها', icon: BookOpenCheck },
                { id: 'deletions', label: 'حذفیات', icon: Trash2 },
                ...(isSuperAdmin ? [{ id: 'maintenance', label: 'نگهداری', icon: Settings }] : [])
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`flex-1 py-4 px-4 font-medium text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <tab.icon size={18} /> {tab.label}
                </button>
            ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-black/20">
            
            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {loading ? <div className="col-span-2 text-center py-10">در حال بارگذاری کاربران...</div> : users.map(user => (
                        <div key={user.uid} className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${user.uid === currentUserId ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500' : 'border-gray-100 dark:border-gray-700'}`}>
                            {user.isBanned && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
                            {user.isUnderMaintenance && <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 animate-pulse"></div>}
                            {user.isScreenshotRestricted && <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>}
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">{user.name || 'بدون نام'}</h4>
                                        {user.role === 'guest' && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-bold">مهمان</span>}
                                        {user.uid === currentUserId && <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold">شما</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mb-2 truncate" title={user.uid}>{user.uid}</div>
                                    
                                    <div className="flex flex-wrap items-center gap-2">
                                        {user.isBanned ? (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold">مسدود شده</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded text-xs font-bold flex items-center gap-1"><CheckCircle size={10}/> فعال</span>
                                        )}
                                        {user.isUnderMaintenance && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold flex items-center gap-1"><Construction size={10}/> در حال تعمیر</span>}
                                        {user.isScreenshotRestricted && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold flex items-center gap-1"><CameraOff size={10}/> اسکرین‌شات ممنوع</span>}
                                        
                                        {isSuperAdmin && user.uid !== currentUserId ? (
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs border-none outline-none cursor-pointer"
                                                disabled={user.role === 'developer' && currentUserRole !== 'developer'}
                                            >
                                                <option value="user">کاربر</option>
                                                <option value="admin">ادمین</option>
                                                <option value="owner">مدیر کل</option>
                                                <option value="guest">مهمان</option>
                                                {currentUserRole === 'developer' && <option value="developer">برنامه‌نویس</option>}
                                            </select>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">{roleToLabel(user.role)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0 overflow-hidden ${user.role === 'owner' || user.role === 'developer' ? 'bg-gradient-to-br from-yellow-400 to-orange-600' : (user.role === 'admin' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-600')}`}>
                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.name || 'U').charAt(0).toUpperCase()}
                                </div>
                            </div>
                            
                            {user.uid !== currentUserId && (
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                                    <div className="flex items-center gap-2 justify-between">
                                        <div className="flex gap-2">
                                            {(isSuperAdmin || (currentUserRole === 'admin' && user.role === 'user')) && (
                                                <>
                                                    <button 
                                                        onClick={() => { setSpyModal({ isOpen: true, targetUid: user.uid, targetName: user.name || 'کاربر' }); setSpyChats([]); setActiveSpyChat(null); getAdminSpyChats(user.uid).then(setSpyChats); }}
                                                        className="p-2.5 bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white rounded-xl transition-all" title="نظارت (Spy)"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setNotifModal({ isOpen: true, targetUid: user.uid, targetName: user.name || 'کاربر' })}
                                                        className="p-2.5 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all" title="ارسال اعلان"
                                                    >
                                                        <Bell size={18} />
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => handleMaintenanceToggle(user.uid, user.isUnderMaintenance || false)}
                                                            className={`p-2.5 rounded-xl transition-all ${user.isUnderMaintenance ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-500 hover:text-white'}`}
                                                            title="حالت تعمیر برای کاربر"
                                                        >
                                                            <Construction size={18} />
                                                        </button>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => handleScreenshotToggle(user.uid, user.isScreenshotRestricted || false)}
                                                            className={`p-2.5 rounded-xl transition-all ${user.isScreenshotRestricted ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600 hover:bg-purple-500 hover:text-white'}`}
                                                            title="ممنوعیت اسکرین‌شات"
                                                        >
                                                            <CameraOff size={18} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {(isSuperAdmin) && (
                                                <button 
                                                    onClick={() => handleDeleteUserAccount(user.uid)}
                                                    className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white rounded-xl transition-all" title="حذف حساب"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            {isSuperAdmin && (
                                                <button 
                                                    onClick={() => handleBanToggle(user.uid, user.isBanned || false)}
                                                    className={`p-2.5 rounded-xl transition-all ${user.isBanned ? 'bg-green-100 text-green-600 hover:bg-green-600 hover:text-white' : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`} title={user.isBanned ? 'رفع مسدودی' : 'مسدود کردن'}
                                                >
                                                    <Ban size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* GROUPS TAB */}
            {activeTab === 'groups' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allGroups.length === 0 ? <p className="col-span-2 text-center text-gray-500 py-10">هیچ گروه یا کانالی یافت نشد.</p> : allGroups.map(group => (
                        <div key={group.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                                <img src={group.avatar} className="w-12 h-12 rounded-lg object-cover bg-gray-200" />
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{group.name}</h4>
                                    <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                        <span className={`px-1.5 py-0.5 rounded ${group.type === 'channel' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{group.type === 'channel' ? 'کانال' : 'گروه'}</span>
                                        <span>{group.participants?.length || 0} عضو</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-auto flex gap-2">
                                <button onClick={() => handleForceJoin(group.id)} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors">عضویت اجباری</button>
                                <button onClick={() => handleDeleteGroup(group.id)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors">حذف گروه</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FILTERS TAB */}
            {activeTab === 'filters' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                        <Filter size={20} className="text-blue-500" />
                        مدیریت کلمات ممنوعه
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        پیام‌های حاوی این کلمات به صورت خودکار فیلتر خواهند شد.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mb-6">
                        <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="کلمه ممنوعه جدید..." className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={(e) => e.key === 'Enter' && handleAddWord()} />
                        <button onClick={handleAddWord} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold w-full sm:w-auto">افزودن</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {bannedWords.map(word => (
                            <div key={word} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm flex items-center gap-2 group hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                <span className="text-gray-700 dark:text-gray-300">{word}</span>
                                <button onClick={() => handleRemoveWord(word)} className="text-gray-400 group-hover:text-red-500"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 bg-white dark:bg-gray-800 p-3 rounded-lg">
                        گزارشات کاربران درباره پیام‌های نامناسب در اینجا نمایش داده می‌شود. می‌توانید پیام را حذف یا کاربر خاطی را مسدود کنید.
                    </p>
                    {reports.length === 0 ? <p className="text-center text-gray-500 py-10">گزارش جدیدی وجود ندارد.</p> : reports.map(report => (
                        <div key={report.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-l-4 border-l-red-500 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">{report.reason}</span>
                                <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString('fa-IR')}</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-2"><strong>گزارش دهنده:</strong> {report.reporterId}</p>
                            <div className="bg-gray-100 dark:bg-black/20 p-3 rounded-lg mb-3">
                                <div className="text-xs text-gray-500 mb-1">پیام گزارش شده از {report.reportedUserName}:</div>
                                <div className="text-sm text-gray-900 dark:text-white">{report.messageContent}</div>
                            </div>
                            {report.status === 'pending' ? (
                                <div className="flex gap-2">
                                    <button onClick={() => handleReportAction(report.id, 'dismiss')} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">نادیده گرفتن</button>
                                    <button onClick={() => handleReportAction(report.id, 'ban', report.reportedUserId)} className="px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700">مسدود کردن کاربر</button>
                                </div>
                            ) : (
                                <div className="text-xs text-green-600 font-bold">بررسی شده توسط {report.handledBy}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* MAINTENANCE TAB */}
            {activeTab === 'maintenance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 text-sm text-gray-500 dark:text-gray-400 mb-2 bg-white dark:bg-gray-800 p-3 rounded-lg">
                        ابزارهای زیر برای مدیریت وضعیت سرور و داده‌ها هستند. لطفا با احتیاط استفاده کنید.
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-6 rounded-2xl flex flex-col items-center text-center">
                        <div className="p-4 bg-blue-100 dark:bg-blue-800/30 rounded-full mb-4 text-blue-600"><RefreshCw size={32} /></div>
                        <h3 className="font-bold text-lg text-blue-800 dark:text-blue-300 mb-2">بروزرسانی اجباری</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            با فشردن این دکمه، تمام کاربران آنلاین مجبور به رفرش صفحه می‌شوند.
                        </p>
                        <button onClick={handleForceUpdate} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20">ارسال دستور بروزرسانی</button>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-6 rounded-2xl flex flex-col items-center text-center">
                        <div className="p-4 bg-red-100 dark:bg-red-800/30 rounded-full mb-4 text-red-600"><Eraser size={32} /></div>
                        <h3 className="font-bold text-lg text-red-800 dark:text-red-300 mb-2">پاکسازی کامل داده‌ها (خطرناک)</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            حذف تمام چت‌ها و گروه‌ها. حساب‌های کاربری حذف نمی‌شوند.
                        </p>
                        <button onClick={handleWipeData} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20">پاکسازی کل سرور</button>
                    </div>

                    <div className={`border p-6 rounded-2xl flex flex-col items-center text-center transition-colors ${globalMaintenance ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                        <div className={`p-4 rounded-full mb-4 ${globalMaintenance ? 'bg-yellow-200 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}><Construction size={32} /></div>
                        <h3 className="font-bold text-lg mb-2">حالت تعمیر و نگهداری سراسری</h3>
                        <p className="text-sm opacity-80 mb-6 leading-relaxed">
                            قطع دسترسی کاربران عادی به برنامه.
                        </p>
                        <button onClick={toggleGlobalMaintenance} className={`w-full py-3 rounded-xl font-bold transition-colors shadow-lg ${globalMaintenance ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}>
                            {globalMaintenance ? 'غیرفعال‌سازی حالت تعمیر' : 'فعال‌سازی حالت تعمیر'}
                        </button>
                    </div>

                    <div className={`border p-6 rounded-2xl flex flex-col items-center text-center transition-colors ${globalScreenshot ? 'bg-purple-100 dark:bg-purple-900/20 border-purple-300' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                        <div className={`p-4 rounded-full mb-4 ${globalScreenshot ? 'bg-purple-200 text-purple-700' : 'bg-gray-200 text-gray-600'}`}><CameraOff size={32} /></div>
                        <h3 className="font-bold text-lg mb-2">محدودیت اسکرین‌شات سراسری</h3>
                        <p className="text-sm opacity-80 mb-6 leading-relaxed">
                            تار کردن صفحه و جلوگیری از کپی متن برای همه کاربران.
                        </p>
                        <button onClick={toggleGlobalScreenshot} className={`w-full py-3 rounded-xl font-bold transition-colors shadow-lg ${globalScreenshot ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}>
                            {globalScreenshot ? 'لغو محدودیت اسکرین‌شات' : 'فعال‌سازی محدودیت اسکرین‌شات'}
                        </button>
                    </div>
                </div>
            )}
        </div>
        
        {/* Modals remain mostly unchanged */}
        {spyModal.isOpen && (
             <div className="absolute inset-0 z-[110] bg-black/70 flex items-center justify-center p-4 animate-fade-in">
                 <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-6xl h-[80vh] shadow-2xl flex flex-col overflow-hidden border border-purple-500/30">
                     <div className="p-4 bg-purple-700 text-white flex justify-between items-center shadow-md">
                         <div className="flex items-center gap-3">
                             <Eye className="animate-pulse" />
                             <h3 className="font-bold">نظارت مخفی: {spyModal.targetName}</h3>
                         </div>
                         <button onClick={() => setSpyModal({ isOpen: false, targetUid: null, targetName: '' })} className="hover:bg-white/20 p-1 rounded-full"><X/></button>
                     </div>
                     <div className="flex-1 flex overflow-hidden">
                         <div className="w-1/3 bg-gray-50 dark:bg-gray-900 overflow-y-auto border-l dark:border-gray-700">
                             {spyChats.map(chat => (
                                 <div key={chat.id} onClick={() => { setActiveSpyChat(chat.id); getAdminSpyMessages(spyModal.targetUid!, chat.id).then(setSpyMessages); }} className={`p-4 cursor-pointer border-b dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors ${activeSpyChat === chat.id ? 'bg-purple-100 dark:bg-purple-900/40 border-r-4 border-r-purple-600' : ''}`}>
                                     <div className="font-bold text-sm text-gray-900 dark:text-white">{chat.name}</div>
                                     <div className="flex items-center gap-2 mt-1">
                                         <span className={`text-[10px] px-1.5 py-0.5 rounded ${chat.type === 'group' ? 'bg-blue-100 text-blue-700' : (chat.type === 'channel' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600')}`}>
                                             {chat.type === 'group' ? 'گروه' : (chat.type === 'channel' ? 'کانال' : 'خصوصی')}
                                         </span>
                                         {chat.id.includes('saved') && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Saved Msg</span>}
                                     </div>
                                 </div>
                             ))}
                         </div>
                         <div className="flex-1 flex flex-col bg-white dark:bg-black/20 relative">
                             {activeSpyChat ? (
                                 <>
                                     <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-2">
                                        {spyMessages.map(msg => (
                                            <div key={msg.id} className={`max-w-[80%] p-3 rounded-xl border shadow-sm text-sm ${msg.senderId === spyModal.targetUid ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 self-end rounded-tr-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 self-start rounded-tl-none'}`}>
                                                <div className="text-[10px] font-bold text-purple-600 mb-1 opacity-70">{msg.senderName} ({new Date(msg.timestamp).toLocaleTimeString()})</div>
                                                <div className="text-gray-800 dark:text-gray-200">{msg.text}</div>
                                            </div>
                                        ))}
                                     </div>
                                     <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t dark:border-gray-700 flex gap-2">
                                         <input 
                                            type="text" 
                                            value={spyImpersonateText} 
                                            onChange={(e) => setSpyImpersonateText(e.target.value)} 
                                            placeholder={`ارسال پیام به عنوان ${spyModal.targetName}...`}
                                            className="flex-1 p-3 rounded-xl border dark:border-gray-600 bg-white dark:bg-black/20 focus:ring-2 ring-purple-500 outline-none"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendAsUser()}
                                         />
                                         <button onClick={handleSendAsUser} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/30">
                                             <Send size={18} /> ارسال
                                         </button>
                                     </div>
                                 </>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                     <Eye size={64} className="mb-4 opacity-20" />
                                     <p>یک گفتگو را برای نظارت انتخاب کنید</p>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {notifModal.isOpen && (
            <div className="absolute inset-0 z-[120] bg-black/70 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600">
                        <Bell size={20} />
                        ارسال اعلان سیستمی به {notifModal.targetName}
                    </h3>
                    <div className="space-y-3">
                        <input 
                            value={notifText.title}
                            onChange={(e) => setNotifText({...notifText, title: e.target.value})}
                            placeholder="عنوان اعلان..."
                            className="w-full p-3 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-black/20"
                        />
                        <textarea 
                            value={notifText.message}
                            onChange={(e) => setNotifText({...notifText, message: e.target.value})}
                            placeholder="متن پیام..."
                            className="w-full p-3 h-32 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-black/20 resize-none"
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setNotifModal({ isOpen: false, targetUid: null, targetName: '' })} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">انصراف</button>
                        <button onClick={handleSendNotification} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">ارسال</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;

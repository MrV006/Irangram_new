
import React, { useEffect, useState, useRef } from 'react';
import { X, ShieldAlert, User, Trash2, Ban, CheckCircle, Bell, MessageSquare, Send, Settings, Eye, AlertTriangle, Flag, Check, ListChecks, ArrowLeft, ArrowRight, BookOpenCheck, Clock, Users, LogIn, Eraser, RefreshCw, Filter, Copy, Construction, Lock as LockIcon, Calendar, Info, Smartphone, CameraOff, PenTool, Reply, Edit2, Megaphone, Save, Layout, Search, Key, ChevronRight, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { getAllUsers, updateUserRole, toggleUserBan, suspendUser, sendSystemNotification, getWordFilters, updateWordFilters, subscribeToReports, handleReport, deleteReport, getAdminSpyChats, getAdminSpyMessages, subscribeToAppeals, resolveAppeal, deleteAppeal, deleteMessageGlobal, deletePrivateMessage, editMessageGlobal, editPrivateMessage, triggerSystemUpdate, wipeSystemData, deleteUserAccount, subscribeToDeletionRequests, resolveDeletionRequest, adminSendMessageAsUser, getAllGroups, forceJoinGroup, deleteChat, toggleUserMaintenance, setGlobalMaintenance, subscribeToSystemInfo, toggleUserScreenshotRestriction, setGlobalScreenshotRestriction, updateUserSystemPermissions, adminEditUserMessage, subscribeToAdSettings, updateAdSettings, getUserProfile } from '../services/firebaseService';
import { UserProfileData, UserRole, Message, Report, Contact, Appeal, DeletionRequest, SystemPermissions, AdSettings } from '../types';
import { CONFIG } from '../config';

// --- Types & Interfaces ---
interface AdminPanelProps {
  onClose: () => void;
  currentUserEmail: string;
  currentUserRole: UserRole;
  currentUserId: string;
  onStartChat: (user: UserProfileData) => void;
}

const DEFAULT_ADMIN_PERMISSIONS: SystemPermissions = {
    canBanUsers: true,
    canDeleteUsers: false,
    canManageGroups: true,
    canSeeReports: true,
    canManageFilters: false,
    canSpy: false
};

// --- SUB-COMPONENTS (Modular Architecture) ---

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

// 2. User Management Component
const UsersTab = ({ users, loadUsers, isSuperAdmin, currentUserRole, currentUserId, onStartChat, handleBanToggle, handleRoleChange, handleOpenPermModal }: any) => {
    const [search, setSearch] = useState('');
    
    const filteredUsers = users.filter((u: UserProfileData) => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.includes(search)
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجوی کاربر (نام، نام کاربری، موبایل)..."
                        className="w-full bg-gray-100 dark:bg-black/20 rounded-lg pr-10 pl-4 py-2 outline-none focus:ring-2 ring-telegram-primary transition-all"
                    />
                </div>
                <button onClick={loadUsers} className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg hover:rotate-180 transition-transform duration-500 text-telegram-primary"><RefreshCw size={20}/></button>
            </div>

            <div className="grid gap-3">
                {filteredUsers.map((user: UserProfileData) => (
                    <div key={user.uid} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 flex-1">
                            <img src={user.avatar} className="w-12 h-12 rounded-full bg-gray-200 object-cover" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white">{user.name}</span>
                                    {user.isBanned && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">مسدود</span>}
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${user.role === 'owner' ? 'bg-amber-100 text-amber-700' : (user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 dark:bg-white/10 text-gray-500')}`}>
                                        {user.role}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex gap-2 font-mono dir-ltr">
                                    <span>@{user.username}</span>
                                    {user.phone && <span>• {user.phone}</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 dark:border-white/5">
                            {isSuperAdmin && (
                                <select 
                                    value={user.role} 
                                    onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                                    className="text-xs p-2 rounded-lg border dark:bg-black/20 dark:border-gray-600 dark:text-white outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <option value="user">کاربر</option>
                                    <option value="admin">ادمین</option>
                                    {currentUserRole === 'developer' && <option value="owner">مدیر کل</option>}
                                    {currentUserRole === 'developer' && <option value="developer">برنامه‌نویس</option>}
                                </select>
                            )}
                            
                            {isSuperAdmin && user.role === 'admin' && (
                                <button onClick={() => handleOpenPermModal(user.uid)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="سطح دسترسی">
                                    <ListChecks size={18} />
                                </button>
                            )}

                            <button onClick={() => onStartChat(user)} className="p-2 bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors" title="پیام">
                                <MessageSquare size={18} />
                            </button>

                            <button 
                                onClick={() => handleBanToggle(user.uid, user.isBanned || false)}
                                className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${user.isBanned ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                title={user.isBanned ? 'رفع مسدودی' : 'مسدود کردن'}
                            >
                                {user.isBanned ? <CheckCircle size={18} /> : <Ban size={18} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 3. Spy / Surveillance Component (Improved UI & Fixed Functionality)
const SpyTab = ({ users }: { users: UserProfileData[] }) => {
    const [targetUid, setTargetUid] = useState('');
    const [targetUser, setTargetUser] = useState<UserProfileData | null>(null);
    const [chats, setChats] = useState<Contact[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isEditing, setIsEditing] = useState<Message | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleSearchTarget = async () => {
        if (!targetUid.trim()) return;
        setLoading(true);
        // Try to find in local list first, else fetch
        let user = users.find(u => u.uid === targetUid || u.username === targetUid.replace('@', ''));
        if (!user) {
            user = await getUserProfile(targetUid);
        }
        
        if (user) {
            setTargetUser(user);
            const userChats = await getAdminSpyChats(user.uid);
            setChats(userChats);
            setActiveChatId(null);
            setMessages([]);
        } else {
            alert("کاربر یافت نشد.");
        }
        setLoading(false);
    };

    const handleSelectChat = async (chatId: string) => {
        if (!targetUser) return;
        setActiveChatId(chatId);
        const msgs = await getAdminSpyMessages(targetUser.uid, chatId);
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleAction = async () => {
        if (!targetUser || !activeChatId || !inputText.trim()) return;
        
        if (isEditing) {
            await adminEditUserMessage(activeChatId, isEditing.id, inputText);
            setIsEditing(null);
        } else {
            await adminSendMessageAsUser(activeChatId, targetUser.uid, inputText);
        }
        setInputText('');
        // Refresh messages
        handleSelectChat(activeChatId);
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header / Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 flex gap-2 w-full">
                    <input 
                        value={targetUid}
                        onChange={(e) => setTargetUid(e.target.value)}
                        placeholder="شناسه کاربر (UID) یا نام کاربری..."
                        className="flex-1 p-2.5 rounded-xl border dark:bg-black/20 dark:border-gray-600 outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 text-sm font-mono dir-ltr transition-all"
                    />
                    <button onClick={handleSearchTarget} disabled={loading} className="bg-telegram-primary hover:bg-telegram-primaryDark text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md">
                        {loading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                        جستجو
                    </button>
                </div>
                {targetUser && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 w-full md:w-auto">
                        <img src={targetUser.avatar} className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="text-sm">
                            <div className="font-bold text-gray-900 dark:text-white">{targetUser.name}</div>
                            <div className="text-xs opacity-70 font-mono text-gray-500 dark:text-gray-400">UID: {targetUser.uid}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Chat List */}
                <div className="w-full md:w-1/3 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-black/10">
                    {!targetUser ? (
                        <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                            <User size={32} className="opacity-50"/>
                            لطفاً ابتدا یک کاربر را انتخاب کنید.
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm">هیچ گفتگویی یافت نشد.</div>
                    ) : (
                        chats.map(chat => (
                            <div 
                                key={chat.id} 
                                onClick={() => handleSelectChat(chat.id)}
                                className={`p-3 border-b border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${activeChatId === chat.id ? 'bg-white dark:bg-white/10 shadow-inner border-r-4 border-r-telegram-primary' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        {chat.id === 'saved' || chat.id.startsWith('saved_') ? (
                                            <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center text-white"><BookOpenCheck size={24} /></div>
                                        ) : (
                                            <img src={chat.avatar} className="w-12 h-12 rounded-full bg-gray-200 object-cover" />
                                        )}
                                        {chat.isGlobal && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-0.5 rounded-full text-[8px] border-2 border-white">GL</div>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-sm truncate text-gray-900 dark:text-white">{chat.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{chat.type}</div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 rotate-180"/>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Message View */}
                <div className={`flex-1 flex flex-col bg-[#8e98a3] dark:bg-[#1a1a1a] relative ${!activeChatId ? 'hidden md:flex' : 'absolute inset-0 md:static z-20'}`}>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://web.telegram.org/img/bg_0.png')] pointer-events-none"></div>
                    
                    {/* Mobile Back Button */}
                    <div className="md:hidden p-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center gap-2 sticky top-0 z-30">
                        <button onClick={() => setActiveChatId(null)} className="p-2"><ArrowRight/></button>
                        <span className="font-bold">بازگشت به لیست</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 z-10">
                        {activeChatId ? (
                            messages.map(msg => (
                                <div key={msg.id} className={`group flex ${msg.senderId === targetUser?.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] p-3 rounded-2xl relative shadow-sm transition-all hover:shadow-md ${msg.senderId === targetUser?.uid ? 'bg-[#eeffde] dark:bg-[#766ac8] rounded-tr-sm' : 'bg-white dark:bg-[#212121] rounded-tl-sm'}`}>
                                        {msg.senderId !== targetUser?.uid && <div className="text-xs text-telegram-primary font-bold mb-1">{msg.senderName}</div>}
                                        <div className="text-sm text-black dark:text-white whitespace-pre-wrap">{msg.text}</div>
                                        <div className="text-[10px] text-gray-500 text-left mt-1 flex gap-1 items-center justify-end">
                                            {msg.edited && <span>edited</span>}
                                            {new Date(msg.timestamp).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}
                                            {msg.senderId === targetUser?.uid && <Check size={12} />}
                                        </div>
                                        
                                        {/* Admin Controls Overlay */}
                                        {msg.senderId === targetUser?.uid && (
                                            <div className="absolute -top-3 -left-3 hidden group-hover:flex gap-1 animate-pop">
                                                <button onClick={() => { setIsEditing(msg); setInputText(msg.text); }} className="p-1.5 bg-blue-500 text-white rounded-full shadow-md hover:scale-110 transition-transform" title="ویرایش پیام کاربر">
                                                    <Edit2 size={12} />
                                                </button>
                                                <button onClick={async () => {
                                                    if(confirm('حذف شود؟')) {
                                                        if(activeChatId.includes('global')) await deleteMessageGlobal(msg.id);
                                                        else await deletePrivateMessage(activeChatId, msg.id);
                                                        handleSelectChat(activeChatId);
                                                    }
                                                }} className="p-1.5 bg-red-500 text-white rounded-full shadow-md hover:scale-110 transition-transform" title="حذف پیام">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex h-full items-center justify-center text-white/50 text-sm font-bold bg-black/20 backdrop-blur-sm m-4 rounded-xl">
                                <div className="text-center">
                                    <Eye size={48} className="mx-auto mb-2 opacity-50"/>
                                    یک چت را برای نظارت انتخاب کنید
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Action Bar */}
                    {activeChatId && targetUser && (
                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-20 flex flex-col gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                            {isEditing && (
                                <div className="flex items-center justify-between gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center gap-2">
                                        <Edit2 size={14}/> 
                                        <span>در حال ویرایش پیام کاربر...</span>
                                    </div>
                                    <button onClick={() => { setIsEditing(null); setInputText(''); }} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-1"><X size={14}/></button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={`نوشتن پیام به عنوان ${targetUser.name}...`}
                                    className="flex-1 bg-gray-100 dark:bg-black/20 p-3 rounded-xl outline-none focus:ring-2 ring-telegram-primary text-sm transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAction()}
                                />
                                <button 
                                    onClick={handleAction} 
                                    className={`px-4 py-2 rounded-xl text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 font-bold text-xs ${isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {isEditing ? <Check size={18} /> : <Send size={18} className="rotate-180" />}
                                    <span className="hidden md:inline">{isEditing ? 'ثبت تغییر' : 'جعل پیام'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 4. Advertising Manager Component
const AdsManagerTab = ({ adConfig, setAdConfig, handleSaveAds }: any) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl text-green-600 dark:text-green-400">
                    <Layout size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">مدیریت تبلیغات</h3>
                    <p className="text-xs text-gray-500">تنظیمات نمایش بنرهای تبلیغاتی در اپلیکیشن</p>
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

                {/* Custom Ad Settings */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-2 dark:border-gray-700">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">تبلیغ سفارشی (Custom Banner)</h4>
                        <label className="flex items-center gap-2 text-xs font-bold text-telegram-primary cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={adConfig.customAd?.isActive || false}
                                onChange={(e) => setAdConfig({
                                    ...adConfig, 
                                    customAd: { ...adConfig.customAd, isActive: e.target.checked }
                                })}
                                className="w-4 h-4"
                            />
                            فعال‌سازی سفارشی
                        </label>
                    </div>
                    
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!adConfig.customAd?.isActive ? 'opacity-50 pointer-events-none grayscale' : ''} transition-all`}>
                        <div>
                            <label className="block text-xs mb-1.5 font-bold text-gray-500 flex items-center gap-1"><ImageIcon size={12}/> لینک تصویر بنر</label>
                            <input 
                                value={adConfig.customAd?.imageUrl || ''}
                                onChange={(e) => setAdConfig({...adConfig, customAd: {...adConfig.customAd, imageUrl: e.target.value}})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black/20 text-sm dir-ltr text-left outline-none"
                                placeholder="https://example.com/banner.jpg"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1.5 font-bold text-gray-500 flex items-center gap-1"><LinkIcon size={12}/> لینک مقصد (Click URL)</label>
                            <input 
                                value={adConfig.customAd?.linkUrl || ''}
                                onChange={(e) => setAdConfig({...adConfig, customAd: {...adConfig.customAd, linkUrl: e.target.value}})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black/20 text-sm dir-ltr text-left outline-none"
                                placeholder="https://mysite.com"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs mb-1.5 font-bold text-gray-500">عنوان تبلیغ (اختیاری)</label>
                            <input 
                                value={adConfig.customAd?.title || ''}
                                onChange={(e) => setAdConfig({...adConfig, customAd: {...adConfig.customAd, title: e.target.value}})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black/20 text-sm outline-none"
                                placeholder="عنوان نمایشی..."
                            />
                        </div>
                    </div>
                </div>

                {/* Placement Toggles */}
                <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">جایگاه‌های نمایش</h4>
                    <div className="flex flex-col md:flex-row gap-4">
                        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-white/5 p-4 rounded-xl flex-1 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                            <input type="checkbox" className="w-5 h-5 text-telegram-primary rounded focus:ring-telegram-primary accent-telegram-primary" checked={adConfig.sidebarBanner} onChange={(e) => setAdConfig({...adConfig, sidebarBanner: e.target.checked})} />
                            <div>
                                <span className="text-sm font-bold block text-gray-800 dark:text-gray-200">بنر پایین سایدبار</span>
                                <span className="text-xs text-gray-500">نمایش در نسخه دسکتاپ</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-white/5 p-4 rounded-xl flex-1 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                            <input type="checkbox" className="w-5 h-5 text-telegram-primary rounded focus:ring-telegram-primary accent-telegram-primary" checked={adConfig.chatTopBanner} onChange={(e) => setAdConfig({...adConfig, chatTopBanner: e.target.checked})} />
                            <div>
                                <span className="text-sm font-bold block text-gray-800 dark:text-gray-200">بنر بالای صفحه چت</span>
                                <span className="text-xs text-gray-500">نمایش چسبان در بالای تمام چت‌ها</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Provider IDs */}
                <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">شناسه‌های تبلیغاتی (Provider IDs - برای اسکریپت‌ها)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs mb-1.5 font-bold text-gray-500">Sidebar Slot ID</label>
                            <input 
                                value={adConfig.providers.sidebarId}
                                onChange={(e) => setAdConfig({...adConfig, providers: {...adConfig.providers, sidebarId: e.target.value}})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black/20 text-sm font-mono focus:border-telegram-primary outline-none transition-all"
                                placeholder="e.g. sidebar-ad-slot"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1.5 font-bold text-gray-500">Chat Top Slot ID</label>
                            <input 
                                value={adConfig.providers.chatId}
                                onChange={(e) => setAdConfig({...adConfig, providers: {...adConfig.providers, chatId: e.target.value}})}
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-black/20 text-sm font-mono focus:border-telegram-primary outline-none transition-all"
                                placeholder="e.g. chat-ad-slot"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                    <button onClick={handleSaveAds} className="w-full py-3.5 bg-telegram-primary text-white rounded-xl font-bold shadow-lg hover:bg-telegram-primaryDark transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]">
                        <Save size={18} /> ذخیره تنظیمات تبلیغات
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN ADMIN PANEL COMPONENT ---

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
  const [permModal, setPermModal] = useState<{ isOpen: boolean; targetUid: string | null; perms: SystemPermissions }>({ isOpen: false, targetUid: null, perms: DEFAULT_ADMIN_PERMISSIONS });

  // Ad Settings State
  const [adConfig, setAdConfig] = useState<AdSettings>({
      enabled: false,
      useMock: true,
      sidebarBanner: false,
      chatTopBanner: false,
      providers: { sidebarId: '', chatId: '' },
      customAd: { isActive: false, imageUrl: '', linkUrl: '', title: '' }
  });

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
        const adUnsub = subscribeToAdSettings((settings) => {
            if(settings) setAdConfig(settings);
        });
        return () => adUnsub();
    }
    
    const unsubReports = subscribeToReports(setReports);
    const unsubAppeals = subscribeToAppeals(setAppeals);
    const unsubDeletions = subscribeToDeletionRequests(setDeletionRequests);
    
    return () => { unsubReports(); unsubAppeals(); unsubDeletions(); };
  }, []);

  const loadUsers = async () => {
    const fetchedUsers = await getAllUsers();
    setUsers(fetchedUsers);
  };
  
  const loadAllGroups = async () => {
      const groups = await getAllGroups();
      setAllGroups(groups);
  };

  const loadFilters = async () => { 
      const words = await getWordFilters(); 
      setBannedWords(words); 
  };

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

  const handleRoleChange = async (uid: string, newRole: string) => {
    if (!isSuperAdmin) return;
    if (uid === currentUserId) return alert("شما نمی‌توانید نقش خودتان را تغییر دهید.");
    if (confirm(`آیا مطمئن هستید که می‌خواهید نقش کاربر را به ${roleToLabel(newRole)} تغییر دهید؟`)) {
        await updateUserRole(uid, newRole as UserRole);
        setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as UserRole } : u));
    }
  };
  
  const handleOpenPermModal = (uid: string) => {
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser) {
          setPermModal({ isOpen: true, targetUid: uid, perms: targetUser.systemPermissions || DEFAULT_ADMIN_PERMISSIONS });
      }
  };

  const handleSavePerms = async () => {
      if (!permModal.targetUid) return;
      await updateUserSystemPermissions(permModal.targetUid, permModal.perms);
      setUsers(users.map(u => u.uid === permModal.targetUid ? { ...u, systemPermissions: permModal.perms } : u));
      setPermModal({ isOpen: false, targetUid: null, perms: DEFAULT_ADMIN_PERMISSIONS });
      alert("دسترسی‌های ادمین به‌روزرسانی شد.");
  };

  const handleBanToggle = async (uid: string, isBanned: boolean) => {
    if (uid === currentUserId) return alert("شما نمی‌توانید خودتان را مسدود کنید.");
    await toggleUserBan(uid, isBanned);
    setUsers(users.map(u => u.uid === uid ? { ...u, isBanned: !isBanned } : u));
  };

  const handleSaveAds = async () => {
      if (!adConfig) return;
      await updateAdSettings(adConfig);
      alert("تنظیمات تبلیغات ذخیره شد.");
  };

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

            {/* Mobile Tab Select (Visible only on small screens) */}
            <div className="md:hidden absolute top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b p-2 overflow-x-auto whitespace-nowrap shadow-sm">
                 <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as any)} className="w-full p-2 rounded border bg-transparent dark:text-white dark:border-gray-600">
                     <option value="users">کاربران</option>
                     <option value="reports">گزارش‌ها</option>
                     <option value="appeals">درخواست‌ها</option>
                     <option value="deletions">حذف حساب</option>
                     <option value="filters">فیلترها</option>
                     {isSuperAdmin && <option value="spy">نظارت (Spy)</option>}
                     {isSuperAdmin && <option value="ads">تبلیغات</option>}
                     {isSuperAdmin && <option value="maintenance">تعمیرات</option>}
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

                {activeTab === 'spy' && isSuperAdmin && (
                    <SpyTab users={users} />
                )}

                {activeTab === 'ads' && isSuperAdmin && (
                    <AdsManagerTab adConfig={adConfig} setAdConfig={setAdConfig} handleSaveAds={handleSaveAds} />
                )}

                {/* Maintenance Tab */}
                {activeTab === 'maintenance' && isSuperAdmin && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 flex flex-col">
                            <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2 text-lg"><Construction /> حالت تعمیرات سراسری</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 flex-1 leading-relaxed">
                                با فعال‌سازی این گزینه، تمام کاربران عادی از برنامه خارج شده و صفحه "در حال بروزرسانی" را مشاهده خواهند کرد. فقط مدیران دسترسی خواهند داشت.
                            </p>
                            <button onClick={() => { if(confirm("هشدار: همه کاربران خارج خواهند شد. ادامه می‌دهید؟")) setGlobalMaintenance(!globalMaintenance) }} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${globalMaintenance ? 'bg-red-600 text-white animate-pulse shadow-red-500/50 shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300'}`}>
                                {globalMaintenance ? 'غیرفعال‌سازی حالت تعمیرات' : 'فعال‌سازی حالت تعمیرات'}
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 flex flex-col">
                            <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2 text-lg"><CameraOff /> امنیت محتوا (ضد اسکرین‌شات)</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 flex-1 leading-relaxed">
                                جلوگیری از ثبت اسکرین‌شات و کپی متون در کل برنامه برای همه کاربران. این قابلیت امنیت محتوا را به شدت افزایش می‌دهد.
                            </p>
                            <button onClick={() => setGlobalScreenshotRestriction(!globalScreenshot)} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${globalScreenshot ? 'bg-blue-600 text-white shadow-blue-500/50 shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300'}`}>
                                {globalScreenshot ? 'غیرفعال‌سازی محافظت' : 'فعال‌سازی محافظت کلی'}
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm flex flex-col">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-lg text-gray-800 dark:text-white"><RefreshCw /> بروزرسانی اجباری</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 flex-1">
                                ارسال فرمان ریلود به تمام کلاینت‌های متصل برای دریافت آخرین نسخه.
                            </p>
                            <button onClick={() => { if(confirm("همه کاربران ریلود خواهند شد. ادامه می‌دهید؟")) triggerSystemUpdate(); }} className="w-full py-4 bg-telegram-primary text-white rounded-xl font-bold hover:bg-telegram-primaryDark transition-all">
                                اعمال بروزرسانی همگانی
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-red-500/20 flex flex-col">
                            <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2 text-lg"><Trash2 /> پاکسازی داده‌ها</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 flex-1">
                                حذف تمام پیام‌های چت عمومی.
                            </p>
                            <button onClick={() => { if(confirm("هشدار: چت عمومی کاملاً پاک خواهد شد. این عمل قابل برگشت نیست.")) wipeSystemData(); }} className="w-full py-4 bg-red-50 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all">
                                پاکسازی چت عمومی
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters Tab */}
                {activeTab === 'filters' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                        <h3 className="font-bold mb-4 text-gray-900 dark:text-white">کلمات فیلتر شده</h3>
                        <div className="flex gap-2 mb-6">
                            <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="کلمه جدید..." className="flex-1 p-3 border rounded-xl dark:bg-black/20 dark:border-gray-600 outline-none focus:ring-2 ring-telegram-primary" />
                            <button onClick={() => { if(newWord) { updateWordFilters([...bannedWords, newWord]); setNewWord(''); }}} className="bg-green-600 text-white px-6 rounded-xl font-bold hover:bg-green-700 transition-colors">افزودن</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {bannedWords.map(word => (
                                <span key={word} className="bg-gray-100 dark:bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-white/20">
                                    {word} <X size={16} className="cursor-pointer text-red-500 hover:text-red-700" onClick={() => updateWordFilters(bannedWords.filter(w => w !== word))} />
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reports Tab */}
                {activeTab === 'reports' && (
                    <div className="space-y-4">
                        {reports.length === 0 && <div className="text-center text-gray-500 p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">هیچ گزارش بررسی نشده‌ای وجود ندارد.</div>}
                        {reports.map(report => (
                            <div key={report.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border-l-4 border-red-500 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-red-600 text-lg mb-1">{report.reason}</div>
                                        <div className="text-xs text-gray-400 font-mono">{new Date(report.createdAt).toLocaleString('fa-IR')}</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                                        گزارش جدید
                                    </div>
                                </div>
                                <div className="text-sm space-y-1 mb-4 bg-gray-50 dark:bg-black/20 p-3 rounded-xl">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">گزارش‌دهنده:</span> 
                                        <span className="font-mono">{report.reporterId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">کاربر متخلف:</span> 
                                        <span className="font-bold">{report.reportedUserName}</span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 italic">
                                        "{report.messageContent}"
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => deleteMessageGlobal(report.messageId)} className="text-sm bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors">حذف پیام</button>
                                    <button onClick={() => handleBanToggle(report.reportedUserId, true)} className="text-sm bg-black text-white px-4 py-2 rounded-lg font-bold hover:opacity-80 transition-colors">مسدودسازی کاربر</button>
                                    <button onClick={() => deleteReport(report.id)} className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors">بستن گزارش</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Modals (Notification, Permissions) */}
        {permModal.isOpen && (
            <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
                    <h3 className="font-bold mb-6 text-xl text-gray-900 dark:text-white text-center">دسترسی‌های ادمین</h3>
                    <div className="space-y-2 mb-6">
                        {Object.entries(permModal.perms).map(([key, val]) => (
                            <label key={key} className="flex items-center justify-between p-3 border rounded-xl cursor-pointer dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <span className="font-medium">{key}</span>
                                <input type="checkbox" checked={val} onChange={(e) => setPermModal({...permModal, perms: {...permModal.perms, [key]: e.target.checked}})} className="w-5 h-5 accent-telegram-primary"/>
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setPermModal({...permModal, isOpen: false})} className="flex-1 py-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-bold transition-colors">لغو</button>
                        <button onClick={handleSavePerms} className="flex-1 py-3 bg-telegram-primary text-white rounded-xl font-bold shadow-lg hover:bg-telegram-primaryDark transition-colors">ذخیره</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

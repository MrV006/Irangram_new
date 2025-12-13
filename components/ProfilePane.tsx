
import React, { useState, useEffect } from 'react';
import { X, Phone, AtSign, Bell, Image as ImageIcon, Video, FileText, Link as LinkIcon, MessageSquare, Globe, Users, Ban, Unlock, LogOut, Trash2, UserPlus, CheckCircle, Shield, Copy, UserMinus, Crown, Settings, Clock, CheckSquare, Bookmark, Cloud, ArrowRightCircle, Search, HardDrive, Music, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact, UserProfileData, AdminPermissions, Message } from '../types';
import { checkBlockedStatus, blockUser, unblockUser, getGroupMembers, isGroupAdmin, removeGroupMember, addGroupMember, leaveGroup, searchUser, getGroupInviteLink, promoteToGroupAdmin, demoteGroupAdmin, updateChatSlowMode, updateGroupAdminPermissions, getGroupDetails, getChatId, getSharedMedia } from '../services/firebaseService';

interface ProfilePaneProps {
  contact: Contact;
  onClose: () => void;
  onStartChat?: (contact: Contact) => void;
  currentUserId?: string;
  currentUserRole?: string;
}

const ProfilePane: React.FC<ProfilePaneProps> = ({ contact, onClose, onStartChat, currentUserId, currentUserRole }) => {
  const isGlobal = contact.id === 'global_chat';
  const isSaved = contact.id === 'saved';
  const isGroup = contact.type === 'group';
  const isChannel = contact.type === 'channel';
  
  const [isBlocked, setIsBlocked] = useState(false);
  const [groupMembers, setGroupMembers] = useState<UserProfileData[]>([]);
  const [isGroupManager, setIsGroupManager] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [slowMode, setSlowMode] = useState(0);
  const [chatCreatorId, setChatCreatorId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'media' | 'files'>('media');
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Permission Modal
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [perms, setPerms] = useState<AdminPermissions>({
      canDeleteMessages: true,
      canBanUsers: false,
      canPinMessages: true,
      canChangeInfo: false,
      canAddAdmins: false
  });

  const isSystemAdmin = currentUserRole === 'owner' || currentUserRole === 'developer';

  useEffect(() => {
      if(currentUserId && !isGlobal && !isSaved) {
          if (!isGroup && !isChannel) {
              checkBlockedStatus(currentUserId, contact.id).then(setIsBlocked);
          } else {
              loadGroupData();
              setInviteLink(getGroupInviteLink(contact.id));
          }
      }
      
      // Load Media
      loadSharedMedia();

  }, [contact.id, currentUserId, isGroup, isChannel]);

  const loadGroupData = async () => {
      if (!currentUserId) return;
      const members = await getGroupMembers(contact.id);
      setGroupMembers(members);
      
      const adminStatus = await isGroupAdmin(contact.id, currentUserId);
      setIsGroupManager(adminStatus || isSystemAdmin);

      const details: any = await getGroupDetails(contact.id);
      if (details) {
          setSlowMode(details.slowMode || 0);
          setChatCreatorId(details.creatorId);
      }
  };

  const loadSharedMedia = async () => {
      if (!currentUserId) return;
      setLoadingMedia(true);
      let chatId = contact.id;
      if (!isGlobal && !isGroup && !isChannel && contact.type === 'user') {
          chatId = getChatId(currentUserId, contact.id);
      }
      // Special case for Saved Messages
      if (isSaved) {
          chatId = getChatId(currentUserId, 'saved');
      }

      const media = await getSharedMedia(chatId, isGlobal);
      setSharedMedia(media);
      setLoadingMedia(false);
  };

  const toggleBlock = async () => {
      if(!currentUserId) return;
      if (isBlocked) {
          await unblockUser(currentUserId, contact.id);
          setIsBlocked(false);
          alert("کاربر رفع مسدودی شد.");
      } else {
          if(confirm("آیا مطمئن هستید؟")) {
              await blockUser(currentUserId, contact.id);
              setIsBlocked(true);
              alert("کاربر مسدود شد.");
          }
      }
  };

  const handleLeaveGroup = async () => {
      if (!currentUserId) return;
      if(confirm(`آیا از ترک این ${isChannel ? 'کانال' : 'گروه'} مطمئن هستید؟`)) {
          await leaveGroup(contact.id, currentUserId);
          alert(`شما از ${isChannel ? 'کانال' : 'گروه'} خارج شدید.`);
          onClose();
          window.location.reload(); 
      }
  };

  const handleRemoveMember = async (memberId: string) => {
      if (confirm("آیا این کاربر حذف شود؟")) {
          await removeGroupMember(contact.id, memberId);
          setGroupMembers(prev => prev.filter(m => m.uid !== memberId));
      }
  };

  const handlePromoteMember = async (memberId: string) => {
      if (confirm("این کاربر به مدیر ارتقا یابد؟")) {
          await promoteToGroupAdmin(contact.id, memberId);
          alert("کاربر مدیر شد.");
      }
  };

  const handleDemoteMember = async (memberId: string) => {
      if (confirm("مدیریت این کاربر لغو شود؟")) {
          await demoteGroupAdmin(contact.id, memberId);
          alert("مدیریت کاربر لغو شد.");
      }
  };

  const handleAddMember = async () => {
      if (!addMemberQuery.trim()) return;
      const user = await searchUser(addMemberQuery);
      if (user) {
          if (groupMembers.some(m => m.uid === user.uid)) {
              alert("کاربر عضو است.");
              return;
          }
          await addGroupMember(contact.id, user.uid);
          setGroupMembers(prev => [...prev, user]);
          setAddMemberQuery('');
          setIsAddingMember(false);
          alert(`${user.name} اضافه شد.`);
      } else {
          alert("کاربر یافت نشد.");
      }
  };

  const copyInviteLink = () => {
      navigator.clipboard.writeText(inviteLink);
      alert("لینک دعوت کپی شد.");
  };

  const handleSlowModeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      setSlowMode(val);
      await updateChatSlowMode(contact.id, val);
  };

  const openPermsModal = (adminId: string) => {
      setEditingAdminId(adminId);
      setShowPermsModal(true);
  };

  const savePermissions = async () => {
      if (editingAdminId) {
          await updateGroupAdminPermissions(contact.id, editingAdminId, perms);
          setShowPermsModal(false);
          setEditingAdminId(null);
          alert("دسترسی‌ها به‌روزرسانی شد.");
      }
  };

  // --- Render Helpers ---

  const renderMediaGrid = () => {
      const imagesAndVideos = sharedMedia.filter(m => m.type === 'image' || m.type === 'video_note');
      
      if (loadingMedia) return <div className="text-center py-4 text-gray-500">در حال بارگذاری...</div>;
      if (imagesAndVideos.length === 0) return <div className="text-center py-8 text-gray-400 text-sm">هیچ تصویر یا ویدیویی وجود ندارد.</div>;

      return (
          <div className="grid grid-cols-3 gap-1">
              {imagesAndVideos.map((m) => (
                  <div key={m.id} className="aspect-square bg-gray-100 dark:bg-white/5 cursor-pointer hover:opacity-80 transition-opacity relative group">
                      {m.type === 'image' ? (
                          <img src={m.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                          <video src={m.fileUrl} className="w-full h-full object-cover" />
                      )}
                      {m.type === 'video_note' && <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white"><PlayCircle size={24}/></div>}
                  </div>
              ))}
          </div>
      );
  };

  const renderFileList = () => {
      const files = sharedMedia.filter(m => m.type === 'file' || m.type === 'audio');
      
      if (loadingMedia) return <div className="text-center py-4 text-gray-500">در حال بارگذاری...</div>;
      if (files.length === 0) return <div className="text-center py-8 text-gray-400 text-sm">هیچ فایلی وجود ندارد.</div>;

      return (
          <div className="space-y-2">
              {files.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.type === 'audio' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {m.type === 'audio' ? <Music size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{m.fileName || 'فایل بدون نام'}</div>
                          <div className="text-xs text-gray-500">{m.fileSize || 'Unknown Size'} • {new Date(m.timestamp).toLocaleDateString('fa-IR')}</div>
                      </div>
                      <a href={m.fileUrl} download target="_blank" className="p-2 text-telegram-primary hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                          <Cloud size={18} />
                      </a>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full flex flex-col bg-white dark:bg-telegram-secondaryDark border-l border-gray-200 dark:border-telegram-borderDark overflow-y-auto relative"
    >
      
      {/* Permission Modal */}
      {showPermsModal && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">دسترسی‌های مدیر</h3>
                  <div className="space-y-3">
                      {[
                          { key: 'canDeleteMessages', label: 'حذف پیام‌ها' },
                          { key: 'canBanUsers', label: 'مسدود کردن کاربران' },
                          { key: 'canPinMessages', label: 'سنجاق کردن پیام' },
                          { key: 'canChangeInfo', label: 'تغییر اطلاعات گروه' },
                          { key: 'canAddAdmins', label: 'افزودن مدیر جدید' },
                      ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => setPerms({...perms, [item.key]: !perms[item.key as keyof AdminPermissions]})}>
                              <span className="text-sm">{item.label}</span>
                              <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${perms[item.key as keyof AdminPermissions] ? 'bg-telegram-primary border-telegram-primary' : 'border-gray-400'}`}>
                                  {perms[item.key as keyof AdminPermissions] && <CheckCircle size={14} className="text-white" />}
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={() => setShowPermsModal(false)} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">انصراف</button>
                      <button onClick={savePermissions} className="flex-1 py-2 bg-telegram-primary text-white rounded-lg text-sm">ذخیره</button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 p-4 sticky top-0 bg-white/80 dark:bg-telegram-secondaryDark/80 backdrop-blur-md z-10 border-b border-gray-100 dark:border-white/5">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <X size={24} />
        </button>
        <span className="font-semibold text-lg">{isGlobal ? 'اطلاعات چت' : (isSaved ? 'فضای ابری' : (isChannel ? 'کانال' : (isGroup ? 'گروه' : 'کاربر')))}</span>
      </div>

      {/* Profile Info Header */}
      <div className="px-6 py-8 flex flex-col items-center bg-white dark:bg-telegram-secondaryDark">
        
        {/* Dynamic Avatar */}
        {isSaved ? (
            <div className="w-28 h-28 mb-4 shadow-xl rounded-full bg-blue-500 flex items-center justify-center text-white ring-4 ring-blue-100 dark:ring-blue-900/30">
                <Bookmark size={48} fill="currentColor" />
            </div>
        ) : (
            <img 
              src={contact.avatar} 
              alt={contact.name} 
              className={`w-28 h-28 object-cover mb-4 shadow-xl ${isGlobal || isGroup || isChannel ? 'rounded-3xl' : 'rounded-full ring-4 ring-gray-100 dark:ring-white/5'}`}
            />
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center flex items-center gap-1">
            {contact.name}
            {isGlobal && <Globe size={20} className="text-blue-500"/>}
        </h2>
        
        {/* Subtitle */}
        <p className="text-gray-500 text-sm font-medium mb-4">
          {isSaved ? (
             <span className="text-blue-500">چت با خودتان</span>
          ) : isGlobal ? (
             <span className="text-blue-500">چت عمومی سراسری</span>
          ) : (isGroup || isChannel) ? (
             <span>{groupMembers.length} {isChannel ? 'مشترک' : 'عضو'}</span>
          ) : (
             contact.status === 'online' ? (
                <span className="text-blue-500">آنلاین</span>
             ) : (
                <span className="opacity-70">آخرین بازدید {contact.lastSeen ? new Date(contact.lastSeen).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}) : 'نامشخص'}</span>
             )
          )}
        </p>
      </div>
      
      {/* Detailed Info List */}
      <div className="p-4 space-y-1 bg-gray-50 dark:bg-black/10 flex-1">
          
          {/* User Bio / Group Desc */}
          {(!isSaved) && (
             <div className="bg-white dark:bg-telegram-secondaryDark p-4 rounded-xl shadow-sm mb-2">
                 <div className="text-xs font-bold text-telegram-primary mb-1">
                     {isChannel || isGroup ? 'توضیحات' : 'بیوگرافی'}
                 </div>
                 <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                     {contact.bio || 'بدون توضیحات'}
                 </div>
             </div>
          )}

          {/* User Specifics */}
          {!isGroup && !isChannel && !isGlobal && !isSaved && (
             <div className="bg-white dark:bg-telegram-secondaryDark rounded-xl shadow-sm mb-2 overflow-hidden">
                 {contact.username && (
                     <div className="p-4 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                         <div>
                             <div className="text-xs font-bold text-telegram-primary mb-1">نام کاربری</div>
                             <div className="text-sm dir-ltr text-right">@{contact.username}</div>
                         </div>
                         <AtSign size={18} className="text-gray-400" />
                     </div>
                 )}
                 {contact.phone && (
                     <div className="p-4 flex items-center justify-between">
                         <div>
                             <div className="text-xs font-bold text-telegram-primary mb-1">موبایل</div>
                             <div className="text-sm dir-ltr text-right">{contact.phone}</div>
                         </div>
                         <Phone size={18} className="text-gray-400" />
                     </div>
                 )}
             </div>
          )}

          {/* Group/Channel Invite Link */}
          {!isGlobal && (isGroup || isChannel) && (
             <div className="bg-white dark:bg-telegram-secondaryDark p-4 rounded-xl shadow-sm mb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors" onClick={copyInviteLink}>
                 <div className="overflow-hidden">
                     <div className="text-xs font-bold text-telegram-primary mb-1">لینک دعوت</div>
                     <div className="text-sm font-mono truncate text-gray-600 dark:text-gray-400">{inviteLink}</div>
                 </div>
                 <Copy size={18} className="text-blue-500 shrink-0 ml-2" />
             </div>
          )}

          {/* Saved Messages Info */}
          {isSaved && (
              <div className="bg-white dark:bg-telegram-secondaryDark p-4 rounded-xl shadow-sm mb-2 space-y-3">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg"><HardDrive size={20}/></div>
                      <div className="text-sm">ارسال فایل جهت ذخیره‌سازی</div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><ArrowRightCircle size={20}/></div>
                      <div className="text-sm">فوروارد پیام‌ها به اینجا</div>
                  </div>
              </div>
          )}

          {/* Slow Mode (Admin Only) */}
          {(isGroup || isChannel) && !isGlobal && (chatCreatorId === currentUserId || isSystemAdmin) && (
             <div className="bg-white dark:bg-telegram-secondaryDark p-4 rounded-xl shadow-sm mb-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><Clock size={14} /> حالت آهسته</span>
                    <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">{slowMode}s</span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max="60" 
                    step="5" 
                    value={slowMode} 
                    onChange={handleSlowModeChange}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-telegram-primary"
                />
             </div>
          )}

          {/* Members List (Group/Channel) */}
          {(isGroup || isChannel) && !isGlobal && (
             <div className="bg-white dark:bg-telegram-secondaryDark rounded-xl shadow-sm mb-2 overflow-hidden">
                 <div className="p-3 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                     <div className="text-sm font-bold flex items-center gap-2">
                         <Users size={16} /> اعضا ({groupMembers.length})
                     </div>
                     {isGroupManager && (
                        <button onClick={() => setIsAddingMember(!isAddingMember)} className="text-telegram-primary text-xs font-bold flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-white/5 px-2 py-1 rounded transition-colors">
                            <UserPlus size={14} /> افزودن
                        </button>
                     )}
                 </div>
                 
                 {isAddingMember && (
                    <div className="p-3 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 flex gap-2">
                        <input value={addMemberQuery} onChange={(e) => setAddMemberQuery(e.target.value)} placeholder="نام کاربری..." className="flex-1 bg-white dark:bg-black/20 border dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-telegram-primary outline-none" />
                        <button onClick={handleAddMember} className="bg-telegram-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold">تایید</button>
                    </div>
                 )}

                 <div className="max-h-60 overflow-y-auto">
                     {groupMembers.map(member => (
                         <div key={member.uid} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                             <div className="flex items-center gap-3">
                                 <img src={member.avatar} className="w-9 h-9 rounded-full bg-gray-200 object-cover" />
                                 <div>
                                     <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1">
                                         {member.name}
                                         {member.uid === currentUserId && <span className="text-[10px] text-gray-400 font-normal">(شما)</span>}
                                         {chatCreatorId === member.uid && <Crown size={12} className="text-yellow-500 fill-current" />}
                                     </div>
                                     <div className="text-[10px] text-gray-500 font-mono truncate max-w-[100px]">@{member.username}</div>
                                 </div>
                             </div>
                             
                             {/* Admin Actions */}
                             {isGroupManager && member.uid !== currentUserId && (
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     {(chatCreatorId === currentUserId || isSystemAdmin) && (
                                         <button onClick={() => openPermsModal(member.uid)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded"><Settings size={14} /></button>
                                     )}
                                     <button onClick={() => handlePromoteMember(member.uid)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Crown size={14} /></button>
                                     <button onClick={() => handleRemoveMember(member.uid)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                 </div>
                             )}
                         </div>
                     ))}
                 </div>
             </div>
          )}
          
          {/* Shared Media Tabs */}
          <div className="bg-white dark:bg-telegram-secondaryDark rounded-xl shadow-sm mb-2 overflow-hidden min-h-[200px]">
              <div className="flex border-b border-gray-100 dark:border-white/5">
                  <button 
                    onClick={() => setActiveTab('media')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'media' ? 'text-telegram-primary border-b-2 border-telegram-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                      رسانه ({sharedMedia.filter(m => m.type === 'image' || m.type === 'video_note').length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('files')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'files' ? 'text-telegram-primary border-b-2 border-telegram-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                      فایل ({sharedMedia.filter(m => m.type === 'file' || m.type === 'audio').length})
                  </button>
              </div>
              <div className="p-1">
                  {activeTab === 'media' ? renderMediaGrid() : renderFileList()}
              </div>
          </div>

          {/* Danger Zone Actions */}
          <div className="space-y-2 mt-4 pb-4">
              {onStartChat && !isGlobal && !isSaved && (
                <button 
                    onClick={() => { onStartChat(contact); onClose(); }}
                    className="w-full bg-white dark:bg-telegram-secondaryDark p-3 rounded-xl shadow-sm text-telegram-primary font-bold flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
                >
                    <MessageSquare size={18} />
                    شروع گفتگو
                </button>
              )}

              {!isGlobal && !isSaved && !isGroup && !isChannel && currentUserId && (
                <button 
                    onClick={toggleBlock}
                    className={`w-full p-3 rounded-xl shadow-sm font-bold flex items-center justify-center gap-2 transition-colors ${isBlocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-white dark:bg-telegram-secondaryDark text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10'}`}
                >
                    {isBlocked ? <Unlock size={18} /> : <Ban size={18} />}
                    {isBlocked ? 'رفع مسدودی کاربر' : 'مسدود کردن کاربر'}
                </button>
              )}

              {(isGroup || isChannel) && !isGlobal && (
                 <button onClick={handleLeaveGroup} className="w-full bg-white dark:bg-telegram-secondaryDark text-red-600 p-3 rounded-xl shadow-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                     <LogOut size={18} />
                     ترک {isChannel ? 'کانال' : 'گروه'}
                 </button>
              )}
          </div>

      </div>
    </motion.div>
  );
};

export default ProfilePane;

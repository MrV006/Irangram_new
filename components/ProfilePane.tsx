
import React, { useState, useEffect } from 'react';
import { X, Phone, AtSign, Bell, Image as ImageIcon, Video, FileText, Link as LinkIcon, MessageSquare, Globe, Users, Ban, Unlock, LogOut, Trash2, UserPlus, CheckCircle, Shield, Copy, UserMinus, Crown, Settings, Clock, CheckSquare } from 'lucide-react';
import { Contact, UserProfileData, AdminPermissions } from '../types';
import { checkBlockedStatus, blockUser, unblockUser, getGroupMembers, isGroupAdmin, removeGroupMember, addGroupMember, leaveGroup, searchUser, getGroupInviteLink, promoteToGroupAdmin, demoteGroupAdmin, updateChatSlowMode, updateGroupAdminPermissions, getGroupDetails } from '../services/firebaseService';

interface ProfilePaneProps {
  contact: Contact;
  onClose: () => void;
  onStartChat?: (contact: Contact) => void;
  currentUserId?: string;
  currentUserRole?: string; // Passed from App
}

const ProfilePane: React.FC<ProfilePaneProps> = ({ contact, onClose, onStartChat, currentUserId, currentUserRole }) => {
  const isGlobal = contact.id === 'global_chat';
  const isSaved = contact.id === 'saved';
  const isGroup = contact.type === 'group';
  const isChannel = contact.type === 'channel';
  
  const [isBlocked, setIsBlocked] = useState(false);
  const [groupMembers, setGroupMembers] = useState<UserProfileData[]>([]);
  const [isGroupManager, setIsGroupManager] = useState(false); // True if Group Admin or System Admin
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [slowMode, setSlowMode] = useState(0);
  const [chatCreatorId, setChatCreatorId] = useState<string | null>(null);
  
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
      // In a real app, we would fetch existing perms. For now, reset to default.
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-telegram-secondaryDark border-l border-gray-200 dark:border-telegram-borderDark overflow-y-auto animate-slide-in relative">
      
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
        <span className="font-semibold text-lg">{isGlobal ? 'چت جهانی' : (isChannel ? 'اطلاعات کانال' : (isGroup ? 'اطلاعات گروه' : 'پروفایل کاربر'))}</span>
      </div>

      {/* Profile Header */}
      <div className="px-6 py-8 flex flex-col items-center border-b-8 border-gray-50 dark:border-black/20 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-black/10">
        <img 
          src={contact.avatar} 
          alt={contact.name} 
          className={`w-32 h-32 object-cover mb-4 shadow-2xl ${isGlobal || isSaved || isGroup || isChannel ? 'rounded-3xl p-2 bg-white dark:bg-white/5' : 'rounded-full ring-4 ring-white dark:ring-gray-700'}`}
        />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{contact.name}</h2>
        <p className="text-gray-500 text-sm font-medium mb-4">
          {isGlobal ? (
             <span className="text-telegram-primary bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">سرور جهانی آنلاین</span>
          ) : (isGroup || isChannel) ? (
             <span className="text-gray-500">{groupMembers.length} {isChannel ? 'دنبال‌کننده' : 'عضو'}</span>
          ) : (
             contact.status === 'online' ? (
                <span className="text-telegram-primary bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">آنلاین</span>
             ) : (
                <span className="opacity-70">آخرین بازدید {contact.lastSeen || 'به تازگی'}</span>
             )
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-2">
            {!isGroup && !isChannel && !isGlobal && !isSaved && (
                <>
                    <button onClick={() => alert("در حال توسعه...")} className="p-3 bg-telegram-primary text-white rounded-full hover:bg-telegram-primaryDark shadow-lg">
                        <Phone size={20} />
                    </button>
                    <button onClick={() => alert("در حال توسعه...")} className="p-3 bg-telegram-primary text-white rounded-full hover:bg-telegram-primaryDark shadow-lg">
                        <Video size={20} />
                    </button>
                </>
            )}

            {onStartChat && !isGlobal && !isSaved && (
            <button 
                onClick={() => { onStartChat(contact); onClose(); }}
                className="flex items-center gap-2 bg-telegram-primary hover:bg-telegram-primaryDark text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-telegram-primary/30"
            >
                <MessageSquare size={20} />
                {isChannel ? 'مشاهده کانال' : 'گفتگو'}
            </button>
            )}

            {!isGlobal && !isSaved && !isGroup && !isChannel && currentUserId && (
                <button 
                    onClick={toggleBlock}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold transition-colors ${isBlocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                    {isBlocked ? <Unlock size={20} /> : <Ban size={20} />}
                </button>
            )}
        </div>
      </div>

      {/* Info List */}
      <div className="p-6 space-y-6 border-b-8 border-gray-50 dark:border-black/20">
        
        <div className="flex items-start gap-4 group">
            <div className="mt-1 text-gray-400 group-hover:text-telegram-primary transition-colors"><FileText size={24} /></div>
            <div>
                <p className="text-gray-900 dark:text-white text-base leading-relaxed">{contact.bio || (isChannel ? 'توضیحات کانال' : (isGroup ? 'توضیحات گروه' : 'بدون بیوگرافی'))}</p>
                <p className="text-gray-500 text-xs mt-1">توضیحات</p>
            </div>
        </div>

        {(isGroup || isChannel) && !isGlobal && (
             <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                 <LinkIcon size={20} className="text-gray-400" />
                 <div className="flex-1 overflow-hidden">
                     <p className="text-xs text-gray-500 mb-1">لینک دعوت:</p>
                     <p className="text-sm font-mono truncate select-all">{inviteLink}</p>
                 </div>
                 <button onClick={copyInviteLink} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg">
                     <Copy size={18} />
                 </button>
             </div>
        )}

        {/* Slow Mode Settings (Owner Only) */}
        {(isGroup || isChannel) && !isGlobal && (chatCreatorId === currentUserId || isSystemAdmin) && (
            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                    <span className="flex items-center gap-2"><Clock size={18} className="text-telegram-primary" /> حالت آهسته (Slow Mode)</span>
                    <span className="bg-telegram-primary text-white px-2 py-0.5 rounded text-xs">{slowMode} ثانیه</span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max="60" 
                    step="5" 
                    value={slowMode} 
                    onChange={handleSlowModeChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-telegram-primary"
                />
                <p className="text-xs text-gray-500 mt-2">اعضا باید بین هر پیام {slowMode} ثانیه صبر کنند.</p>
            </div>
        )}

        {/* Group/Channel Members Management */}
        {(isGroup || isChannel) && !isGlobal && (
            <div className="mt-4 border-t pt-4 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Users size={20} /> اعضا ({groupMembers.length})
                        </h3>
                        {isGroupManager && (
                            <button onClick={() => setIsAddingMember(!isAddingMember)} className="text-telegram-primary text-sm font-bold flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-white/5 px-2 py-1 rounded">
                                <UserPlus size={16} /> افزودن
                            </button>
                        )}
                </div>
                
                {isAddingMember && (
                    <div className="mb-4 flex gap-2">
                        <input value={addMemberQuery} onChange={(e) => setAddMemberQuery(e.target.value)} placeholder="نام کاربری یا موبایل..." className="flex-1 bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2 text-sm" />
                        <button onClick={handleAddMember} className="bg-telegram-primary text-white px-3 py-2 rounded-lg text-xs">افزودن</button>
                    </div>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {groupMembers.map(member => (
                        <div key={member.uid} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg group">
                            <div className="flex items-center gap-3">
                                <img src={member.avatar} className="w-8 h-8 rounded-full bg-gray-200" />
                                <div>
                                    <div className="font-bold text-sm flex items-center gap-1">
                                        {member.name} 
                                        {member.uid === currentUserId && '(شما)'}
                                    </div>
                                    <div className="text-xs text-gray-500">@{member.username}</div>
                                </div>
                            </div>
                            
                            {/* Admin Controls */}
                            {isGroupManager && member.uid !== currentUserId && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     {/* Manage Permissions Button */}
                                     {(chatCreatorId === currentUserId || isSystemAdmin) && (
                                         <button 
                                            onClick={() => openPermsModal(member.uid)} 
                                            className="p-1.5 text-purple-500 hover:bg-purple-50 rounded" title="تنظیم دسترسی‌ها"
                                         >
                                             <Settings size={16} />
                                         </button>
                                     )}

                                     <button 
                                        onClick={() => handlePromoteMember(member.uid)} 
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="ارتقا به مدیر"
                                     >
                                         <Crown size={16} />
                                     </button>
                                     <button 
                                        onClick={() => handleDemoteMember(member.uid)} 
                                        className="p-1.5 text-orange-500 hover:bg-orange-50 rounded" title="عزل مدیر"
                                     >
                                         <UserMinus size={16} />
                                     </button>
                                     <button 
                                        onClick={() => handleRemoveMember(member.uid)} 
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="حذف از گروه"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {(isGroup || isChannel) && !isGlobal && (
             <button onClick={handleLeaveGroup} className="flex items-center gap-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 w-full p-2 rounded-lg transition-colors mt-4">
                 <LogOut size={24} />
                 <span className="font-bold">ترک {isChannel ? 'کانال' : 'گروه'}</span>
             </button>
        )}
      </div>

      <div className="p-4">
         <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button className="flex-1 py-3 text-telegram-primary border-b-2 border-telegram-primary font-bold text-sm">رسانه</button>
            <button className="flex-1 py-3 text-gray-500 font-medium text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors">فایل‌ها</button>
            <button className="flex-1 py-3 text-gray-500 font-medium text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors">لینک‌ها</button>
         </div>
         <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-80 transition-opacity">
                    <img src={`https://picsum.photos/200/200?random=${i + (contact.id.length || 10)}`} className="w-full h-full object-cover" alt="media" />
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default ProfilePane;

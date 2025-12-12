

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Check, User, Info, Phone, AtSign, Image as ImageIcon, Layout, Type, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { UserProfileData } from '../types';
import { uploadMedia, requestAccountDeletion } from '../services/firebaseService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfileData;
  onSave: (profile: Partial<UserProfileData>) => void;
  wallpaper: string;
  onSaveWallpaper: (wallpaper: string) => void;
}

const WALLPAPER_PRESETS = [
    { id: 'default', name: 'آبی آسمانی (پیش‌فرض)', value: 'default', color: '#99bad0' },
    { id: 'blue', name: 'آبی روشن', value: '#dbeafe', color: '#dbeafe' },
    { id: 'green', name: 'سبز نعنایی', value: '#dcfce7', color: '#dcfce7' },
    { id: 'dark', name: 'تاریک', value: '#18181b', color: '#18181b' },
    { id: 'pink', name: 'صورتی', value: '#fce7f3', color: '#fce7f3' },
    { id: 'pattern1', name: 'طرح ۱', value: 'https://img.freepik.com/free-vector/hand-drawn-contact-sheet-template_23-2150937449.jpg', color: '#e5e7eb' },
    { id: 'pattern2', name: 'طرح ۲', value: 'https://img.freepik.com/free-vector/seamless-pattern-with-cute-cats_23-2147665476.jpg', color: '#e5e7eb' }
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userProfile, onSave, wallpaper, onSaveWallpaper }) => {
  const [formData, setFormData] = useState<UserProfileData>(userProfile);
  const [activeTab, setActiveTab] = useState<'profile' | 'chat'>('profile');
  const [tempWallpaper, setTempWallpaper] = useState(wallpaper);
  const [customUrl, setCustomUrl] = useState('');
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion State
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  useEffect(() => {
    setFormData(userProfile);
    setTempWallpaper(wallpaper);
  }, [userProfile, wallpaper, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onSaveWallpaper(tempWallpaper);
    onClose();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingAvatar(true);
      try {
          const path = `avatars/${userProfile.uid}/${Date.now()}_${file.name}`;
          const downloadUrl = await uploadMedia(file, path);
          
          setFormData(prev => ({
              ...prev,
              avatar: downloadUrl
          }));
      } catch (error) {
          console.error("Storage failed, attempting base64 fallback", error);
          
          try {
              if (file.size > 1024 * 1024) {
                  alert("خطا در آپلود: سرویس ذخیره‌سازی در دسترس نیست و فایل شما برای ذخیره مستقیم حجیم است.");
              } else {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      const base64 = reader.result as string;
                      setFormData(prev => ({ ...prev, avatar: base64 }));
                  };
                  reader.readAsDataURL(file);
              }
          } catch (innerError) {
             alert("خطا در تغییر عکس پروفایل.");
          }
      } finally {
          setIsUploadingAvatar(false);
      }
  };

  const handleRequestDeletion = async () => {
      if(!deletionReason.trim()) {
          alert("لطفاً دلیل حذف حساب را بنویسید.");
          return;
      }
      try {
          await requestAccountDeletion(userProfile.uid, userProfile.name, deletionReason);
          alert("درخواست شما ثبت شد و پس از بررسی مدیر، حساب شما حذف خواهد شد.");
          setShowDeletionConfirm(false);
      } catch (e: any) {
          alert(e.message || "خطا در ارسال درخواست.");
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-telegram-secondaryDark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex flex-col border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center justify-center relative p-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">تنظیمات</h2>
                <button onClick={onClose} className="absolute left-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} className="text-gray-500 dark:text-gray-300" />
                </button>
            </div>
            
            {/* Tabs */}
            <div className="flex px-4">
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-telegram-primary text-telegram-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <User size={18} />
                        پروفایل
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chat' ? 'border-telegram-primary text-telegram-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <ImageIcon size={18} />
                        پس‌زمینه چت
                    </div>
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-0">
            {activeTab === 'profile' ? (
                <>
                    {/* Cover / Avatar Area */}
                    <div className="relative bg-telegram-secondary dark:bg-black/20 p-6 flex flex-col items-center justify-center gap-4">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                        <div 
                            className="relative group cursor-pointer"
                            onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                        >
                            <div className="w-24 h-24 rounded-full bg-telegram-primary text-white flex items-center justify-center text-3xl font-bold shadow-lg overflow-hidden border-4 border-white dark:border-gray-700">
                                {isUploadingAvatar ? (
                                    <Loader2 className="animate-spin" size={32} />
                                ) : (
                                    formData.avatar ? (
                                        <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        formData.name.charAt(0)
                                    )
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>
                        <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">برای تغییر عکس پروفایل کلیک کنید</p>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 space-y-6">
                        {/* Name */}
                        <div className="relative group">
                            <div className="absolute top-3 right-0 text-gray-400"><User size={20} /></div>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-3 pr-8 focus:outline-none focus:border-telegram-primary transition-colors text-gray-900 dark:text-white"
                                placeholder="نام نمایشی"
                            />
                            <label className="text-xs text-telegram-primary mt-1 block">نام (اجباری)</label>
                        </div>

                        {/* Bio */}
                        <div className="relative group">
                            <div className="absolute top-3 right-0 text-gray-400"><Info size={20} /></div>
                            <input 
                                type="text" 
                                value={formData.bio}
                                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-3 pr-8 focus:outline-none focus:border-telegram-primary transition-colors text-gray-900 dark:text-white"
                                placeholder="بیوگرافی"
                            />
                            <label className="text-xs text-gray-500 mt-1 block">کمی درباره خودتان بنویسید</label>
                        </div>

                        {/* Username */}
                        <div className="relative group">
                            <div className="absolute top-3 right-0 text-gray-400"><AtSign size={20} /></div>
                            <input 
                                type="text" 
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-3 pr-8 focus:outline-none focus:border-telegram-primary transition-colors text-gray-900 dark:text-white dir-ltr text-right"
                                placeholder="نام کاربری"
                            />
                            <label className="text-xs text-gray-500 mt-1 block">نام کاربری عمومی</label>
                        </div>

                        {/* Phone */}
                        <div className="relative group">
                            <div className="absolute top-3 right-0 text-gray-400"><Phone size={20} /></div>
                            <input 
                                type="tel" 
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-3 pr-8 focus:outline-none focus:border-telegram-primary transition-colors text-gray-900 dark:text-white dir-ltr text-right"
                                placeholder="شماره موبایل"
                            />
                            <label className="text-xs text-gray-500 mt-1 block">شماره موبایل</label>
                        </div>

                        {/* Account Deletion */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                             {!showDeletionConfirm ? (
                                 <button 
                                    onClick={() => setShowDeletionConfirm(true)}
                                    className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/10 py-3 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors font-medium"
                                 >
                                     <Trash2 size={18} />
                                     حذف حساب کاربری
                                 </button>
                             ) : (
                                 <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-800 animate-fade-in">
                                     <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold mb-2">
                                         <AlertTriangle size={18} />
                                         درخواست حذف حساب
                                     </div>
                                     <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                                         آیا مطمئن هستید؟ با ارسال این درخواست، مدیریت حساب شما را بررسی و به صورت دائم حذف خواهد کرد. این عمل غیرقابل بازگشت است.
                                     </p>
                                     <textarea 
                                        value={deletionReason}
                                        onChange={(e) => setDeletionReason(e.target.value)}
                                        placeholder="دلیل حذف حساب..."
                                        className="w-full p-2 text-sm border rounded-lg mb-3 dark:bg-black/20 dark:border-gray-700 dark:text-white"
                                     />
                                     <div className="flex gap-2">
                                         <button 
                                            onClick={() => setShowDeletionConfirm(false)}
                                            className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                                         >
                                             انصراف
                                         </button>
                                         <button 
                                            onClick={handleRequestDeletion}
                                            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                                         >
                                             ارسال درخواست
                                         </button>
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-6 space-y-6">
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                         یک تصویر پس‌زمینه برای گفتگوهای خود انتخاب کنید.
                     </p>
                     
                     <div className="grid grid-cols-3 gap-3">
                         {WALLPAPER_PRESETS.map(wp => (
                             <div 
                                key={wp.id} 
                                onClick={() => setTempWallpaper(wp.value)}
                                className={`
                                    relative aspect-[3/4] rounded-lg cursor-pointer overflow-hidden border-2 transition-all shadow-sm
                                    ${tempWallpaper === wp.value ? 'border-telegram-primary scale-105' : 'border-transparent hover:scale-105'}
                                `}
                             >
                                 <div 
                                    className="w-full h-full"
                                    style={{ 
                                        backgroundColor: wp.color,
                                        backgroundImage: wp.value.startsWith('http') ? `url(${wp.value})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                 >
                                     {wp.value === 'default' && (
                                         <div className="w-full h-full opacity-30" style={{
                                             backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
                                         }}></div>
                                     )}
                                 </div>
                                 <div className="absolute bottom-0 w-full bg-black/40 text-white text-[10px] text-center py-1">
                                     {wp.name}
                                 </div>
                                 {tempWallpaper === wp.value && (
                                     <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                         <Check className="text-white drop-shadow-md" size={32} />
                                     </div>
                                 )}
                             </div>
                         ))}
                     </div>
                     
                     <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">لینک تصویر دلخواه</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-telegram-primary"
                            />
                            <button 
                                onClick={() => { if(customUrl) setTempWallpaper(customUrl); }}
                                className="bg-telegram-secondary dark:bg-white/10 text-telegram-primary rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20"
                            >
                                اعمال
                            </button>
                        </div>
                     </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-black/20 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-telegram-primary hover:bg-telegram-primary/10 rounded-lg transition-colors font-medium"
            >
                انصراف
            </button>
            <button 
                onClick={handleSave}
                disabled={isUploadingAvatar}
                className="px-6 py-2 bg-telegram-primary hover:bg-telegram-primaryDark disabled:opacity-50 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
                <Check size={18} />
                ذخیره تغییرات
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
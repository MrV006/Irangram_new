

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Send, LogOut, Lock, MessageSquare, Clock } from 'lucide-react';
import { sendBanAppeal } from '../services/firebaseService';

interface BanScreenProps {
  currentUser: { uid: string; name: string };
  onLogout: () => void;
  banExpiresAt?: number;
}

const BanScreen: React.FC<BanScreenProps> = ({ currentUser, onLogout, banExpiresAt }) => {
  const [appealText, setAppealText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (banExpiresAt) {
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = banExpiresAt - now;
        
        if (diff <= 0) {
          setTimeLeft('زمان مسدودی پایان یافت. لطفا صفحه را ریلود کنید.');
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${hours} ساعت و ${minutes} دقیقه باقی‌مانده`);
        }
      }, 60000);
      
      // Initial set
      const diff = banExpiresAt - Date.now();
      if (diff > 0) {
         const hours = Math.floor(diff / (1000 * 60 * 60));
         const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
         setTimeLeft(`${hours} ساعت و ${minutes} دقیقه باقی‌مانده`);
      }
      return () => clearInterval(interval);
    }
  }, [banExpiresAt]);

  const handleSendAppeal = async () => {
    if (!appealText.trim()) return;
    setIsSending(true);
    try {
      await sendBanAppeal(currentUser.uid, currentUser.name, appealText);
      setSent(true);
      setAppealText('');
    } catch (error) {
      console.error("Error sending appeal", error);
      alert("خطا در ارسال پیام. لطفا دوباره تلاش کنید.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-100 dark:bg-black flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Header Section */}
        <div className="bg-red-600 p-8 flex flex-col items-center text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm animate-pulse">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">حساب مسدود شده است</h1>
          {banExpiresAt ? (
             <div className="bg-red-800/50 px-4 py-2 rounded-lg mt-2 flex items-center gap-2">
                 <Clock size={16} />
                 <span className="font-mono text-sm">{timeLeft || 'در حال محاسبه...'}</span>
             </div>
          ) : (
             <p className="opacity-90 text-sm leading-relaxed">
               دسترسی شما به دلیل نقض قوانین به طور دائم محدود شده است.
             </p>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-red-800 dark:text-red-200 text-sm border border-red-100 dark:border-red-800">
             <Lock className="shrink-0 mt-1" size={18} />
             <p className="leading-relaxed">
               شما اجازه چت یا فعالیت در گروه‌ها را ندارید. {banExpiresAt ? 'پس از پایان زمان، دسترسی شما خودکار باز می‌شود.' : 'تنها راه ارتباطی شما، ارسال پیام مستقیم به مدیریت یا ادمین جهت درخواست رفع مسدودی است.'}
             </p>
          </div>

          {!sent ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                <MessageSquare size={16} />
                ارسال پیام مستقیم به مدیریت/ادمین
              </label>
              <textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="متن درخواست یا عذرخواهی خود را اینجا بنویسید..."
                className="w-full h-32 p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-red-500 outline-none resize-none text-gray-900 dark:text-white transition-all"
              />
              <button
                onClick={handleSendAppeal}
                disabled={isSending || !appealText.trim()}
                className="w-full bg-telegram-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {isSending ? 'در حال ارسال...' : (
                  <>
                    <Send size={18} className="rotate-180" />
                    ارسال درخواست
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-xl text-center animate-fade-in">
               <div className="w-12 h-12 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-200 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Send size={24} className="rotate-180" />
               </div>
               <h3 className="font-bold text-green-700 dark:text-green-300 mb-1">پیام ارسال شد</h3>
               <p className="text-sm text-green-600 dark:text-green-400">پیام شما برای تیم مدیریت ارسال گردید. لطفاً منتظر بررسی بمانید.</p>
               <button onClick={() => setSent(false)} className="text-xs text-gray-400 underline mt-4 hover:text-gray-600 dark:hover:text-gray-200">ارسال پیام مجدد</button>
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
             <button 
               onClick={onLogout}
               className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-500 transition-colors py-2 text-sm"
             >
               <LogOut size={16} />
               خروج و تعویض حساب
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BanScreen;


import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Phone, ArrowRight, Loader2, AlertCircle, Users, Plus, X, Github, Smartphone, Eye, Key, UserCheck, Edit2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { registerUser, loginUser, loginWithGoogle, sendPasswordReset, loginAnonymously } from '../services/firebaseService';
import { StoredAccount } from '../types';
import { CONFIG } from '../config';

interface AuthPageProps {
  onSuccess: (user: any) => void;
  storedAccounts?: StoredAccount[];
  initialEmail?: string;
}

const DUCK_ANIMATION_URL = "https://assets9.lottiefiles.com/packages/lf20_5njp3vgg.json"; // Telegram Duck Waving

const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, storedAccounts = [], initialEmail = '' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAccountChooser, setShowAccountChooser] = useState(storedAccounts.length > 0 && !initialEmail);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [duckAnimation, setDuckAnimation] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: initialEmail || '',
    phone: '',
    password: ''
  });

  // Load Lottie Animation
  useEffect(() => {
      fetch(DUCK_ANIMATION_URL)
        .then(res => res.json())
        .then(data => setDuckAnimation(data))
        .catch(err => console.log("Failed to load animation"));
  }, []);

  useEffect(() => {
      if (initialEmail) {
          setFormData(prev => ({ ...prev, email: initialEmail }));
          setShowAccountChooser(false);
      }
  }, [initialEmail]);

  useEffect(() => {
      const err = localStorage.getItem('irangram_auth_error');
      if (err === 'user-not-found') {
          setIsLogin(false);
          const retryEmail = localStorage.getItem('irangram_auth_retry_email') || '';
          if (retryEmail === CONFIG.OWNER_EMAIL) {
               setError('حساب مدیریت یافت نشد (احتمالا حذف شده). لطفاً مجدداً ثبت‌نام کنید تا دسترسی‌ها بازیابی شود.');
          } else {
               setError('حساب کاربری با این ایمیل یافت نشد. لطفا ابتدا ثبت نام کنید.');
          }
          
          setFormData(prev => ({
              ...prev,
              email: retryEmail,
              name: localStorage.getItem('irangram_auth_retry_name') || ''
          }));
          localStorage.removeItem('irangram_auth_error');
          localStorage.removeItem('irangram_auth_retry_email');
          localStorage.removeItem('irangram_auth_retry_name');
      }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) throw new Error('لطفا ایمیل و رمز عبور را وارد کنید');
        await loginUser(formData.email, formData.password);
      } else {
        if (!formData.name || !formData.email || !formData.password || !formData.phone) throw new Error('لطفا تمام فیلدها را پر کنید');
        if (formData.password.length < 6) throw new Error('رمز عبور باید حداقل ۶ کاراکتر باشد');
        await registerUser(formData.email, formData.password, formData.name, formData.phone);
      }
    } catch (err: any) {
      console.error(err);
      
      if (err.code === 'auth/invalid-credential' && isLogin) {
           setError('ایمیل یا رمز عبور اشتباه است.');
           setLoading(false);
           return;
      }

      if (err.code === 'auth/user-not-found' && isLogin) {
           setIsLogin(false); // Switch to signup
           setError('حساب کاربری با این ایمیل یافت نشد. فرم زیر را برای ثبت‌نام پر کنید.');
           setLoading(false);
           return;
      }

      if (err.code === 'auth/email-already-in-use') {
          setIsLogin(true); 
          setError('این ایمیل قبلا ثبت شده است. لطفاً وارد شوید.');
      }
      else if (err.code === 'auth/wrong-password') {
           setError('رمز عبور اشتباه است.');
      } 
      else if (err.code === 'auth/invalid-email') setError('فرمت ایمیل نامعتبر است');
      else if (err.code === 'auth/too-many-requests') setError('تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.');
      else if (err.code === 'auth/network-request-failed') setError('خطا در اتصال به اینترنت. لطفاً اتصال خود را بررسی کنید.');
      else setError(err.message || 'خطایی رخ داد. لطفا دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
        await loginWithGoogle(isLogin);
    } catch (err: any) {
        if (err.code === 'custom/user-not-found') {
             setIsLogin(false);
             setError('حساب کاربری یافت نشد. لطفا ثبت نام کنید.');
        } else if (err.code === 'auth/popup-closed-by-user') {
            setError('پنجره ورود بسته شد.');
        } else {
            setError('خطا در ورود با گوگل: ' + err.message);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
      setLoading(true);
      setError('');
      try {
          await loginAnonymously();
      } catch (e: any) {
          setError('خطا در ورود مهمان.');
      } finally {
          setLoading(false);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) {
          setError('لطفا ایمیل خود را وارد کنید.');
          return;
      }
      setLoading(true);
      try {
          await sendPasswordReset(resetEmail);
          setSuccessMsg('لینک بازیابی رمز عبور به ایمیل شما ارسال شد.');
          setShowForgotPassword(false);
          setResetEmail('');
      } catch (e: any) {
          setError('خطا در ارسال ایمیل بازیابی.');
      } finally {
          setLoading(false);
      }
  };

  const handleAccountSelect = (account: StoredAccount) => {
      setFormData(prev => ({ ...prev, email: account.email }));
      setShowAccountChooser(false);
      setIsLogin(true);
  };

  if (showForgotPassword) {
      return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-white dark:bg-[#1c1c1d] p-4">
            <div className="w-full max-w-[360px] animate-fade-in flex flex-col items-center">
                <div className="w-32 h-32 mb-6">
                    {duckAnimation && <Lottie animationData={duckAnimation} loop={true} />}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">بازیابی رمز عبور</h2>
                <p className="text-gray-500 text-center mb-8 text-sm">ایمیل خود را وارد کنید تا لینک بازیابی ارسال شود.</p>
                
                {error && <div className="mb-4 text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/10 p-2 rounded w-full">{error}</div>}
                
                <form onSubmit={handleForgotPassword} className="w-full space-y-6">
                    <div className="relative group">
                        <input 
                            type="email" 
                            value={resetEmail} 
                            onChange={(e) => setResetEmail(e.target.value)} 
                            className="peer w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3.5 outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 text-gray-900 dark:text-white transition-all dir-ltr text-right placeholder-transparent" 
                            placeholder="ایمیل"
                            id="reset-email"
                            required 
                        />
                        <label htmlFor="reset-email" className="absolute right-4 top-[-10px] bg-white dark:bg-[#1c1c1d] px-1 text-xs text-telegram-primary transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-telegram-primary pointer-events-none">
                            ایمیل شما
                        </label>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowForgotPassword(false)} className="flex-1 py-3 text-telegram-primary hover:bg-telegram-primary/5 rounded-xl transition-colors font-medium">انصراف</button>
                        <button type="submit" disabled={loading} className="flex-1 bg-telegram-primary hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center shadow-lg shadow-telegram-primary/30 transition-all">
                             {loading ? <Loader2 className="animate-spin" /> : 'ارسال'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      );
  }

  // Account Chooser (Telegram Style)
  if (showAccountChooser && storedAccounts.length > 0) {
      return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-white dark:bg-[#1c1c1d] p-4">
             <div className="w-full max-w-[360px] animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-32 h-32 mx-auto mb-4">
                        {duckAnimation && <Lottie animationData={duckAnimation} loop={true} />}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">حساب کاربری</h1>
                    <p className="text-gray-500 text-sm">برای ادامه یکی از حساب‌های خود را انتخاب کنید</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-black/20 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5">
                    {storedAccounts.map((account, idx) => (
                        <div key={account.uid} onClick={() => handleAccountSelect(account)} className={`w-full hover:bg-gray-100 dark:hover:bg-white/5 p-4 flex items-center gap-4 transition-colors cursor-pointer ${idx !== storedAccounts.length - 1 ? 'border-b border-gray-200 dark:border-white/5' : ''}`}>
                            <div className="relative">
                                <img src={account.avatar} className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-[#1c1c1d]"></div>
                            </div>
                            <div className="text-right flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{account.name}</h3>
                                <p className="text-xs text-gray-500 truncate font-mono">{account.email}</p>
                            </div>
                            <ChevronRight size={20} className="text-gray-400 rotate-180" />
                        </div>
                    ))}
                </div>

                <button onClick={() => setShowAccountChooser(false)} className="w-full mt-6 text-telegram-primary font-bold py-3 hover:bg-telegram-primary/5 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Plus size={20} />
                    افزودن حساب کاربری
                </button>
             </div>
        </div>
      );
  }

  // Main Login/Signup Form (Telegram Style)
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-white dark:bg-[#1c1c1d] p-6 transition-colors duration-300">
      
      <div className="w-full max-w-[380px] animate-fade-in flex flex-col items-center">
          
          {/* Logo Animation */}
          <div className="w-36 h-36 mb-6">
              {duckAnimation ? (
                  <Lottie animationData={duckAnimation} loop={true} />
              ) : (
                  <div className="w-full h-full bg-telegram-primary/10 rounded-full flex items-center justify-center">
                      <img src="https://cdn-icons-png.flaticon.com/512/2111/2111615.png" className="w-20 h-20" />
                  </div>
              )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {isLogin ? 'ورود به ایران‌گرام' : 'ثبت نام'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8 px-4 leading-relaxed">
              {isLogin ? 'لطفاً اطلاعات حساب کاربری خود را وارد کنید.' : 'برای شروع گفتگو، حساب کاربری جدید بسازید.'}
          </p>

          {/* Error/Success Messages */}
          <AnimatePresence>
            {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2 text-right dir-rtl">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                </motion.div>
            )}
            {successMsg && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full mb-6 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-xl flex items-center gap-2 text-right dir-rtl">
                    <UserCheck size={18} className="shrink-0" />
                    <span>{successMsg}</span>
                </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
              {!isLogin && (
                  <div className="flex gap-4">
                      <div className="relative group flex-1">
                          <input 
                            type="text" 
                            id="name"
                            className="peer w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 text-gray-900 dark:text-white transition-all placeholder-transparent" 
                            placeholder="Name" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                          />
                          <label htmlFor="name" className="absolute right-4 top-[-10px] bg-white dark:bg-[#1c1c1d] px-1 text-xs text-telegram-primary transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-telegram-primary pointer-events-none">
                              نام
                          </label>
                      </div>
                  </div>
              )}

              <div className="relative group">
                  <input 
                    type="email" 
                    id="email"
                    className="peer w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 text-gray-900 dark:text-white transition-all dir-ltr text-right placeholder-transparent" 
                    placeholder="Email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                  <label htmlFor="email" className="absolute right-4 top-[-10px] bg-white dark:bg-[#1c1c1d] px-1 text-xs text-telegram-primary transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-telegram-primary pointer-events-none">
                      ایمیل
                  </label>
              </div>

              {!isLogin && (
                  <div className="relative group">
                      <input 
                        type="tel" 
                        id="phone"
                        className="peer w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 text-gray-900 dark:text-white transition-all dir-ltr text-right placeholder-transparent" 
                        placeholder="Phone" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      />
                      <label htmlFor="phone" className="absolute right-4 top-[-10px] bg-white dark:bg-[#1c1c1d] px-1 text-xs text-telegram-primary transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-telegram-primary pointer-events-none">
                          موبایل
                      </label>
                  </div>
              )}

              <div className="relative group">
                  <input 
                    type="password" 
                    id="password"
                    className="peer w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 text-gray-900 dark:text-white transition-all dir-ltr text-right placeholder-transparent" 
                    placeholder="Password" 
                    value={formData.password} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  />
                  <label htmlFor="password" className="absolute right-4 top-[-10px] bg-white dark:bg-[#1c1c1d] px-1 text-xs text-telegram-primary transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-telegram-primary pointer-events-none">
                      رمز عبور
                  </label>
              </div>

              {isLogin && (
                  <div className="flex justify-end">
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-telegram-primary font-medium hover:underline">فراموشی رمز عبور؟</button>
                  </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-telegram-primary hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-telegram-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-wide text-sm">
                  {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'شروع گفتگو' : 'ثبت نام')}
              </button>
          </form>

          {/* Social Logins */}
          <div className="mt-8 w-full space-y-3">
              <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-3 transition-colors text-sm">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  ورود با حساب گوگل
              </button>

              <button type="button" onClick={handleGuestLogin} disabled={loading} className="w-full bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                  <Eye size={18} />
                  ورود مهمان
              </button>
          </div>

          {/* Toggle Login/Signup */}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="mt-8 text-telegram-primary text-sm font-bold hover:underline transition-all">
              {isLogin ? 'حساب کاربری ندارید؟ ثبت نام کنید' : 'حساب دارید؟ وارد شوید'}
          </button>

          {storedAccounts.length > 0 && (
              <button onClick={() => setShowAccountChooser(true)} className="mt-4 text-gray-400 text-xs flex items-center gap-1 hover:text-gray-600 transition-colors">
                  <Users size={12} /> حساب‌های ذخیره شده
              </button>
          )}
      </div>
      
      {/* Footer */}
      <div className="fixed bottom-4 text-center w-full text-[10px] text-gray-400">
          Irangram for Web v{CONFIG.VERSION} • Designed by Mr.V
      </div>
    </div>
  );
};

export default AuthPage;

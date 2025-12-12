
import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Phone, ArrowRight, Loader2, AlertCircle, Users, Plus, X, Github, Smartphone, Eye, Key, UserCheck } from 'lucide-react';
import { registerUser, loginUser, loginWithGoogle, sendPasswordReset, loginAnonymously } from '../services/firebaseService';
import { StoredAccount } from '../types';
import { CONFIG } from '../config';

interface AuthPageProps {
  onSuccess: (user: any) => void;
  storedAccounts?: StoredAccount[];
  initialEmail?: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, storedAccounts = [], initialEmail = '' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAccountChooser, setShowAccountChooser] = useState(storedAccounts.length > 0 && !initialEmail);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: initialEmail || '',
    phone: '',
    password: ''
  });

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
               setError('حساب کاربری با این جیمیل یافت نشد. لطفا ابتدا ثبت نام کنید.');
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
      
      // Auto-switch logic
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && isLogin) {
           setIsLogin(false); // Switch to signup
           setError('حساب کاربری با این مشخصات یافت نشد. به صفحه ثبت‌نام منتقل شدید. لطفاً اطلاعات را تکمیل کنید.');
           setLoading(false);
           return;
      }

      if (err.code === 'auth/email-already-in-use') {
          setIsLogin(true); // Auto switch to login
          if (formData.email === CONFIG.OWNER_EMAIL) {
              setError('حساب شما موجود است. لطفاً از دکمه "ورود با حساب گوگل" در پایین استفاده کنید تا بدون نیاز به رمز وارد شوید.');
          } else {
              setError('این ایمیل قبلا ثبت شده است. سیستم شما را به حالت "ورود" برد. رمز خود را وارد کنید.');
          }
      }
      else if (err.code === 'auth/wrong-password' && formData.email === CONFIG.OWNER_EMAIL) {
           setError('رمز عبور اشتباه است یا حساب مشکل دارد. لطفاً از دکمه "ورود با حساب گوگل" استفاده کنید.');
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
             if (formData.email === CONFIG.OWNER_EMAIL) {
                 setError('حساب مدیریت حذف شده است. لطفاً ثبت‌نام کنید تا دوباره ساخته شود.');
             } else {
                 setError('حساب کاربری با این جیمیل یافت نشد. لطفا ابتدا ثبت نام کنید.');
             }
        } else if (err.code === 'auth/too-many-requests') {
            setError('تعداد درخواست‌ها زیاد است. لطفاً چند دقیقه صبر کنید.');
        } else if (err.code === 'auth/popup-closed-by-user') {
            setError('پنجره ورود بسته شد.');
        } else if (err.code === 'auth/invalid-credential') {
             setError('اختلال در ارتباط با گوگل. لطفاً صفحه را رفرش کنید و دوباره تلاش کنید.');
        } else {
            setError(err.message || 'خطا در ورود با گوگل');
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
          setError('خطا در ورود مهمان. لطفا دوباره تلاش کنید.');
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
          if (e.code === 'auth/user-not-found') setError('کاربری با این ایمیل یافت نشد.');
          else setError('خطا در ارسال ایمیل بازیابی.');
      } finally {
          setLoading(false);
      }
  };

  const handleAccountSelect = (account: StoredAccount) => {
      setFormData(prev => ({ ...prev, email: account.email }));
      setShowAccountChooser(false);
      setIsLogin(true);
  };

  const renderFooter = () => (
      <div className="py-6 flex justify-center w-full mt-8 sm:mt-auto relative z-10">
          <div className="bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 dark:border-white/10 px-6 py-2.5 rounded-full shadow-lg flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
              <a href="https://github.com/mrv006" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-telegram-primary dark:hover:text-telegram-primary transition-colors group">
                  <div className="p-1.5 bg-white/20 rounded-full group-hover:bg-white/40 transition-colors">
                    <Github size={18} />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] opacity-60 font-medium leading-none mb-0.5">Designed & Developed by</span>
                      <span className="text-sm font-bold leading-none tracking-wide font-mono">Mr.V</span>
                  </div>
              </a>
              <div className="w-px h-8 bg-gray-400/30 dark:bg-white/20"></div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                   <Smartphone size={16} className="opacity-70" />
                   <span className="text-xs font-mono font-bold tracking-wider opacity-90">09902076468</span>
              </div>
          </div>
      </div>
  );

  if (showForgotPassword) {
      return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center bg-telegram-bg dark:bg-telegram-bgDark p-4 relative overflow-y-auto">
            <div className="absolute inset-0 opacity-10 chat-bg-pattern pointer-events-none fixed"></div>
            <div className="w-full flex-1 flex flex-col items-center justify-center z-10 py-10">
                <div className="w-full max-w-md bg-white dark:bg-telegram-secondaryDark rounded-3xl shadow-2xl p-8 animate-fade-in relative">
                    <button onClick={() => setShowForgotPassword(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full mx-auto flex items-center justify-center mb-4">
                            <Key size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">بازیابی رمز عبور</h2>
                        <p className="text-sm text-gray-500 mt-2">ایمیل خود را وارد کنید تا لینک بازیابی ارسال شود.</p>
                    </div>
                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute right-3 top-3 text-gray-400" size={20} />
                            <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="ایمیل شما" className="w-full bg-gray-100 dark:bg-white/5 rounded-xl py-3 pr-10 pl-4 outline-none text-gray-900 dark:text-white dir-ltr text-right" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-telegram-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                             {loading ? <Loader2 className="animate-spin" /> : 'ارسال لینک'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      );
  }

  if (showAccountChooser && storedAccounts.length > 0) {
      return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center bg-telegram-bg dark:bg-telegram-bgDark p-4 relative overflow-y-auto">
             <div className="absolute inset-0 opacity-10 chat-bg-pattern pointer-events-none fixed"></div>
             <div className="w-full flex-1 flex flex-col items-center justify-center z-10 py-10">
                <div className="w-full max-w-md bg-white dark:bg-telegram-secondaryDark rounded-3xl shadow-2xl p-8 animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-telegram-primary/30 p-2 overflow-hidden border-4 border-telegram-primary">
                            <img src="https://www.tarhbama.com/cities-vector/147566" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">انتخاب حساب کاربری</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">برای ورود یکی از حساب‌های ذخیره شده را انتخاب کنید</p>
                    </div>
                    <div className="space-y-3 mb-6">
                        {storedAccounts.map(account => (
                            <button key={account.uid} onClick={() => handleAccountSelect(account)} className="w-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 p-3 rounded-xl flex items-center gap-4 transition-colors border border-gray-100 dark:border-gray-700">
                                <img src={account.avatar} className="w-12 h-12 rounded-full object-cover" />
                                <div className="text-right flex-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white">{account.name}</h3>
                                    <p className="text-sm text-gray-500">{account.email}</p>
                                </div>
                                <ArrowRight size={20} className="text-gray-400 rotate-180" />
                            </button>
                        ))}
                        <button onClick={() => setShowAccountChooser(false)} className="w-full bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 p-3 rounded-xl flex items-center gap-4 transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-telegram-primary">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center"><Plus size={24} /></div>
                            <div className="text-right flex-1"><h3 className="font-bold">استفاده از حساب دیگر</h3></div>
                        </button>
                    </div>
                </div>
             </div>
            {renderFooter()}
        </div>
      );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-telegram-bg dark:bg-telegram-bgDark p-4 relative overflow-y-auto">
      <div className="absolute inset-0 opacity-10 chat-bg-pattern pointer-events-none fixed"></div>
      
      <div className="w-full flex-1 flex flex-col items-center justify-center z-10 py-10">
          <div className="w-full max-w-md bg-white dark:bg-telegram-secondaryDark rounded-3xl shadow-2xl p-8 animate-fade-in border border-white/50 dark:border-white/5 relative">
            <div className="text-center mb-8 relative">
                {storedAccounts.length > 0 && (
                    <button onClick={() => setShowAccountChooser(true)} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600" title="بازگشت به لیست حساب‌ها">
                        <Users size={20} />
                    </button>
                )}
                <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-xl shadow-telegram-primary/30 ring-4 ring-telegram-primary dark:ring-telegram-secondaryDark p-2 overflow-hidden transform hover:scale-105 transition-transform duration-500">
                    <img src="https://www.tarhbama.com/cities-vector/147566" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                    {isLogin ? 'ورود به ایران‌گرام' : 'ساخت حساب کاربری'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    {isLogin ? 'به گفتگوهای خود بازگردید' : 'به جمع هزاران کاربر ایرانی بپیوندید'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2 text-right dir-rtl border border-red-100 dark:border-red-900/30" dir="rtl">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{error}</span>
                </div>
            )}
            {successMsg && (
                <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-start gap-2 text-right dir-rtl border border-green-100 dark:border-green-900/30" dir="rtl">
                    <UserCheck size={16} className="mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{successMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <>
                        <div className="relative group">
                            <User className="absolute right-3 top-3 text-gray-400 group-focus-within:text-telegram-primary transition-colors" size={20} />
                            <input type="text" name="name" autoComplete="name" placeholder="نام و نام خانوادگی" className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-telegram-primary rounded-xl py-3 pr-10 pl-4 outline-none transition-all text-gray-900 dark:text-white font-medium placeholder:font-normal" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="relative group">
                            <Phone className="absolute right-3 top-3 text-gray-400 group-focus-within:text-telegram-primary transition-colors" size={20} />
                            <input type="tel" name="phone" autoComplete="tel" placeholder="شماره موبایل" className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-telegram-primary rounded-xl py-3 pr-10 pl-4 outline-none transition-all text-gray-900 dark:text-white dir-ltr text-right font-medium placeholder:font-normal" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </>
                )}

                <div className="relative group">
                    <Mail className="absolute right-3 top-3 text-gray-400 group-focus-within:text-telegram-primary transition-colors" size={20} />
                    <input type="email" name="email" autoComplete="username" placeholder="ایمیل" className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-telegram-primary rounded-xl py-3 pr-10 pl-4 outline-none transition-all text-gray-900 dark:text-white dir-ltr text-right font-medium placeholder:font-normal" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>

                <div className="relative group">
                    <Lock className="absolute right-3 top-3 text-gray-400 group-focus-within:text-telegram-primary transition-colors" size={20} />
                    <input type="password" name="password" autoComplete={isLogin ? "current-password" : "new-password"} placeholder="رمز عبور" className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black/20 focus:border-telegram-primary rounded-xl py-3 pr-10 pl-4 outline-none transition-all text-gray-900 dark:text-white dir-ltr text-right font-medium placeholder:font-normal" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>

                {isLogin && (
                    <div className="text-left">
                        <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-telegram-primary hover:underline">فراموشی رمز عبور؟</button>
                    </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-telegram-primary hover:bg-telegram-primaryDark text-white font-bold py-3 rounded-xl shadow-lg shadow-telegram-primary/30 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-6">
                    {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'ورود' : 'ثبت نام')}
                    {!loading && <ArrowRight size={20} className="rotate-180" />}
                </button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-white/10"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-telegram-secondaryDark text-gray-500">یا</span></div>
            </div>
            
            <div className="space-y-3">
                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-3 transition-colors">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    ورود با حساب گوگل
                </button>

                <button type="button" onClick={handleGuestLogin} disabled={loading} className="w-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-medium py-3 rounded-xl flex items-center justify-center gap-3 transition-colors text-sm">
                    <Eye size={18} />
                    ورود به عنوان مهمان (فقط مشاهده)
                </button>
            </div>

            <div className="mt-6 text-center">
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-telegram-primary hover:underline text-sm font-medium">
                    {isLogin ? 'حساب کاربری ندارید؟ ثبت نام کنید' : 'قبلا ثبت نام کرده‌اید؟ وارد شوید'}
                </button>
            </div>
          </div>
      </div>
      
      {renderFooter()}
    </div>
  );
};

export default AuthPage;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/useUIStore';

const API_URL = 'http://localhost:3001/api';

export function LoginScreen() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { setToken, setUser } = useUIStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error(t('auth.enterCredentials'));
    
    setIsLoggingIn(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { token, user } = res.data;
      
      setToken(token);
      setUser(user);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      toast.success(t('auth.loginSuccessful'));
    } catch (e: any) {
      console.error('Login failed', e);
      toast.error(e.response?.data?.error || t('auth.invalidCredentials'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0d14] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Login Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
        <div className="bg-[#121422]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">{t('auth.welcomeBack')}</h1>
            <p className="text-sm text-slate-400">{t('auth.signInToDashboard')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-slate-400 pl-1">{t('auth.username')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                  <User size={16} className="text-slate-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1A1D30] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-slate-400 pl-1">{t('auth.password')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                  <Lock size={16} className="text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1A1D30] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              aria-busy={isLoggingIn}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('auth.signingIn')}
                </>
              ) : (
                t('auth.signIn')
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

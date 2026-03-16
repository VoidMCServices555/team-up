import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { db } from '../lib/database';
import { useI18n } from '../lib/i18n';
import type { StoredUser } from '../lib/database';

interface LoginScreenProps {
  onLogin: (user: StoredUser) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t } = useI18n();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(t('login.passwordTooShort')); return; }
    setLoading(true);
    try {
      if (isRegistering) {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
        const discriminator = Math.floor(1000 + Math.random() * 9000).toString();
        const avatarColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const newUser: StoredUser = {
          id: firebaseUser.uid, username, discriminator, displayName: username,
          avatarColor, status: 'online', roles: [], joinedAt: new Date(), email,
        };
        await db.saveUser(newUser);
        onLogin(newUser);
      } else {
        const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
        const profile = await db.getUser(firebaseUser.uid);
        if (!profile) { setError('Could not load user profile.'); return; }
        onLogin(profile);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError(t('login.emailRegistered'));
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setError(t('login.invalidCredentials'));
      else setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#181825] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="pattern-circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="2" fill="#cdd6f4" />
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" />
        </svg>
      </div>
      <div className="w-full max-w-[480px] bg-[#1e1e2e] rounded-[5px] shadow-2xl overflow-hidden z-10">
        <div className="p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#cba6f7] flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h2 className="text-2xl font-bold text-[#cdd6f4] mb-2">
              {isRegistering ? t('login.createAccount') : t('login.welcomeBack')}
            </h2>
            <p className="text-[#bac2de] text-[16px]">
              {isRegistering ? t('login.excitedJoin') : t('login.excitedAgain')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#f38ba8]/20 border border-[#f38ba8]/40 text-[#f38ba8] text-sm p-3 rounded text-center font-medium">{error}</div>
            )}
            <div>
              <label className={`block text-xs font-bold uppercase mb-2 ${error ? 'text-[#f38ba8]' : 'text-[#bac2de]'}`}>{t('login.email')}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading}
                className="w-full bg-[#313244] border border-[#11111b] rounded-[3px] p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition-colors disabled:opacity-50" />
            </div>
            {isRegistering && (
              <div>
                <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('login.username')}</label>
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading}
                  className="w-full bg-[#313244] border border-[#11111b] rounded-[3px] p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition-colors disabled:opacity-50" />
              </div>
            )}
            <div>
              <label className={`block text-xs font-bold uppercase mb-2 ${error ? 'text-[#f38ba8]' : 'text-[#bac2de]'}`}>{t('login.password')}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading}
                  className="w-full bg-[#313244] border border-[#11111b] rounded-[3px] p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition-colors disabled:opacity-50" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-[#bac2de] hover:text-[#cdd6f4]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-xs text-[#bac2de] mt-1">{t('login.passwordMin')}</div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#cba6f7] hover:bg-[#b4befe] text-white font-medium py-3 rounded-[3px] transition-colors mt-4 mb-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Please wait...' : isRegistering ? t('login.continue') : t('login.login')}
            </button>
            <div className="text-sm text-[#6c7086]">
              {isRegistering ? (
                <a href="#" className="text-[#89b4fa] hover:underline" onClick={(e) => { e.preventDefault(); setIsRegistering(false); setError(''); }}>{t('login.alreadyHaveAccount')}</a>
              ) : (
                <span>{t('login.needAccount')}{' '}<a href="#" className="text-[#89b4fa] hover:underline" onClick={(e) => { e.preventDefault(); setIsRegistering(true); setError(''); }}>{t('login.register')}</a></span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

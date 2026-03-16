import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  LogOut,
  Palette,
  Camera,
  Check,
  Eye,
  EyeOff,
  Upload,
  Circle,
  Moon,
  MinusCircle,
  ChevronDownIcon,
  AlignLeft,
  AlignRight,
  ChevronLeft,
  Loader2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { StatusPicker } from './StatusPicker';
import { StatusText } from './StatusText';
import { db } from '../lib/database';
import { useI18n } from '../lib/i18n';
import { processImageFile } from '../lib/cloudinary';
import type { Language, LayoutDirection } from '../lib/i18n';
interface User {
  id?: string;
  username: string;
  discriminator: string;
  avatarColor: string;
  avatar?: string;
  aboutMe?: string;
  customStatus?: string;
  email?: string;
  phone?: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  banner?: string;
  bannerColor?: string;
}
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updatedUser: Partial<User>) => void;
  onLogout: () => void;
}
const AVATAR_COLORS = [
'#89b4fa','#a6e3a1','#f9e2af','#f38ba8','#f5c2e7',
'#e67e22','#3498db','#1abc9c','#9b59b6','#e91e63'];

const BANNER_COLORS = [
'#89b4fa','#a6e3a1','#f9e2af','#f38ba8','#f5c2e7',
'#cba6f7','#fab387','#94e2d5','#74c7ec','#b4befe',
'#45475a','#313244','#1e1e2e','#585b70','#181825'];

const STATUS_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  online: { icon: Circle, color: '#a6e3a1' },
  idle: { icon: Moon, color: '#f9e2af' },
  dnd: { icon: MinusCircle, color: '#f38ba8' },
  offline: { icon: EyeOff, color: '#6c7086' }
};
export function SettingsModal({
  isOpen, onClose, currentUser, onUpdateUser, onLogout
}: SettingsModalProps) {
  const { t, language, setLanguage, dir, isRTL, layoutDirection, setLayoutDirection } = useI18n();
  const [activeTab, setActiveTab] = useState('My Account');
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [pendingUser, setPendingUser] = useState<User>(currentUser);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeAccordion, setActiveAccordion] = useState<'username' | 'email' | 'phone' | 'password' | null>(null);
  const [revealEmail, setRevealEmail] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editEmail, setEditEmail] = useState(currentUser.email || '');
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // ✅ Cloudinary upload loading states
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [chatFontSize, setChatFontSize] = useState<number>(() => {
    try { const stored = localStorage.getItem('teamup_font_size'); if (stored) return Math.min(24, Math.max(12, parseInt(stored, 10))); } catch {}
    return 16;
  });
  const [uiScale, setUiScale] = useState<number>(() => {
    try { const stored = localStorage.getItem('teamup_ui_scale'); if (stored) return Math.min(120, Math.max(80, parseInt(stored, 10))); } catch {}
    return 100;
  });
  const [serverBarPosition, setServerBarPosition] = useState<'left' | 'right'>(() => {
    try { const stored = localStorage.getItem('teamup_server_bar_position'); if (stored === 'left' || stored === 'right') return stored; } catch {}
    return 'left';
  });
  useEffect(() => {
    document.documentElement.style.setProperty('--chat-font-size', `${chatFontSize}px`);
    try { localStorage.setItem('teamup_font_size', chatFontSize.toString()); } catch {}
  }, [chatFontSize]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale}%`;
    try { localStorage.setItem('teamup_ui_scale', uiScale.toString()); } catch {}
  }, [uiScale]);
  useEffect(() => {
    try { localStorage.setItem('teamup_server_bar_position', serverBarPosition); } catch {}
    window.dispatchEvent(new StorageEvent('storage', { key: 'teamup_server_bar_position', newValue: serverBarPosition }));
  }, [serverBarPosition]);
  useEffect(() => {
    try {
      const storedFont = localStorage.getItem('teamup_font_size');
      if (storedFont) { const val = Math.min(24, Math.max(12, parseInt(storedFont, 10))); setChatFontSize(val); document.documentElement.style.setProperty('--chat-font-size', `${val}px`); }
      const storedScale = localStorage.getItem('teamup_ui_scale');
      if (storedScale) { const val = Math.min(120, Math.max(80, parseInt(storedScale, 10))); setUiScale(val); document.documentElement.style.fontSize = `${val}%`; }
    } catch {}
  }, []);
  useEffect(() => {
    setPendingUser(currentUser); setHasChanges(false);
    setEditUsername(currentUser.username); setEditEmail(currentUser.email || ''); setEditPhone(currentUser.phone || '');
    setShowMobileSidebar(true);
  }, [currentUser, isOpen]);
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  const handleSave = () => { onUpdateUser(pendingUser); setHasChanges(false); };
  const handleReset = () => { setPendingUser(currentUser); setHasChanges(false); };
  const handleChange = (field: keyof User, value: any) => {
    setPendingUser((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };
  // ✅ Avatar upload with Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    setAvatarUploading(true);
    try {
      const url = await processImageFile(file);
      handleChange('avatar', url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  // ✅ Banner upload with Cloudinary
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    setBannerUploading(true);
    try {
      const url = await processImageFile(file);
      handleChange('banner', url);
      handleChange('bannerColor', undefined);
    } catch (err) {
      console.error('Banner upload failed:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };
  const showSuccessToast = () => { setShowToast(true); setTimeout(() => setShowToast(false), 2500); };
  const handleSaveField = (field: keyof User, value: string) => { onUpdateUser({ [field]: value }); setActiveAccordion(null); showSuccessToast(); };
  const handleSavePassword = () => {
    if (newPassword.length < 8) { setPasswordError(t('settings.passwordMinLength')); return; }
    if (newPassword !== confirmPassword) { setPasswordError(t('settings.passwordMismatch')); return; }
    setActiveAccordion(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError('');
    showSuccessToast();
  };
  const handleStatusChange = (status: 'online' | 'idle' | 'dnd' | 'offline') => { onUpdateUser({ status }); };
  const handleCustomStatusChange = (text: string) => { onUpdateUser({ customStatus: text }); };
  const getMaskedEmail = (email?: string) => { if (!email) return ''; const [user, domain] = email.split('@'); return `${user[0]}***@${domain}`; };
  if (!isOpen) return null;
  const userStatus = currentUser.status || 'online';
  const statusInfo = STATUS_ICONS[userStatus];
  const statusLabels: Record<string, string> = { online: t('status.online'), idle: t('status.idle'), dnd: t('status.dnd'), offline: t('status.invisible') };
  const tabIds: Record<string, string> = {
    'My Account': 'settings.myAccount', 'User Profile': 'settings.userProfile',
    'Privacy & Safety': 'settings.privacySafety', Connections: 'settings.connections',
    Appearance: 'settings.appearance', 'Voice & Video': 'settings.voiceVideo',
    Notifications: 'settings.notifications', Language: 'settings.language', 'Log Out': 'settings.logOut'
  };
  const SidebarItem = ({ label, isDestructive = false, onClick }: { label: string; isDestructive?: boolean; onClick?: () => void }) => {
    const displayLabel = tabIds[label] ? t(tabIds[label]) : label;
    return (
      <div onClick={() => { if (onClick) { onClick(); } else { setActiveTab(label); setShowMobileSidebar(false); } }}
        className={`px-2.5 py-1.5 rounded cursor-pointer mb-0.5 flex items-center justify-between group ${activeTab === label && !isDestructive ? 'bg-[#313244] text-[#cdd6f4]' : ''} ${!isDestructive && activeTab !== label ? 'text-[#bac2de] hover:bg-[#313244] hover:text-[#cdd6f4]' : ''} ${isDestructive ? 'text-[#f38ba8] hover:bg-[#f38ba81a]' : ''}`}>
        <span className="font-medium text-[15px]">{displayLabel}</span>
        {isDestructive && <LogOut size={16} />}
      </div>
    );
  };
  const activeTabDisplay = tabIds[activeTab] ? t(tabIds[activeTab]) : activeTab;
  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#181825] animate-in fade-in duration-200 overflow-hidden">
      <div className="md:hidden h-12 bg-[#181825] border-b border-[#11111b] flex items-center px-3 flex-shrink-0">
        {!showMobileSidebar && <button onClick={() => setShowMobileSidebar(true)} className="text-[#bac2de] hover:text-[#cdd6f4] mr-3 p-1"><ChevronLeft size={22} /></button>}
        <h2 className="text-[#cdd6f4] font-bold text-base flex-1 truncate">{showMobileSidebar ? t('settings.title') : activeTabDisplay}</h2>
        <button onClick={onClose} className="text-[#bac2de] hover:text-[#cdd6f4] p-1"><X size={22} /></button>
      </div>
      <div className={`${showMobileSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-[218px] bg-[#181825] flex-col pt-4 md:pt-[60px] pb-4 px-1.5 overflow-y-auto flex-shrink-0 min-h-0 flex-1 md:flex-initial justify-start ltr:md:ml-auto rtl:md:mr-auto md:border-r md:border-[#11111b] rtl:md:border-r-0 rtl:md:border-l rtl:md:border-[#11111b]`}>
        <div className="px-2.5 pb-1.5">
          <h3 className="text-[#a6adc8] text-xs font-bold uppercase mb-2 px-2.5">{t('settings.title')}</h3>
          <SidebarItem label="My Account" /><SidebarItem label="User Profile" /><SidebarItem label="Privacy & Safety" /><SidebarItem label="Connections" />
        </div>
        <div className="h-[1px] bg-[#45475a] mx-2.5 my-2" />
        <div className="px-2.5 pb-1.5">
          <h3 className="text-[#a6adc8] text-xs font-bold uppercase mb-2 px-2.5">{t('settings.appSettings')}</h3>
          <SidebarItem label="Appearance" /><SidebarItem label="Voice & Video" /><SidebarItem label="Notifications" /><SidebarItem label="Language" />
        </div>
        <div className="h-[1px] bg-[#45475a] mx-2.5 my-2" />
        <div className="px-2.5 pb-1.5"><SidebarItem label="Log Out" isDestructive onClick={onLogout} /></div>
      </div>

      <div className={`${showMobileSidebar ? 'hidden' : 'flex'} md:flex flex-1 bg-[#1e1e2e] flex-col min-w-0 min-h-0 relative overflow-hidden`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 md:pt-[60px] px-4 md:px-10 pb-20 max-w-[740px]">
          <div className="hidden md:flex fixed top-[60px] ltr:right-[40px] rtl:left-[40px] flex-col items-center group cursor-pointer z-50" onClick={onClose}>
            <div className="w-9 h-9 rounded-full border-2 border-[#bac2de] flex items-center justify-center text-[#bac2de] group-hover:bg-[#45475a] transition-colors"><X size={20} strokeWidth={2.5} /></div>
            <span className="text-[#bac2de] text-xs font-bold mt-2 group-hover:text-[#cdd6f4]">ESC</span>
          </div>

          {activeTab === 'My Account' &&
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-[#cdd6f4] mb-5">{t('settings.myAccount')}</h2>
            <div className="bg-[#181825] rounded-lg overflow-hidden mb-8">
              {currentUser.banner ? <div className="h-[100px] bg-cover bg-center" style={{ backgroundImage: `url(${currentUser.banner})` }} /> : <div className="h-[100px]" style={{ backgroundColor: currentUser.bannerColor || currentUser.avatarColor }} />}
              <div className="px-4 pb-4 relative">
                <div className="absolute -top-[40px] ltr:left-4 rtl:right-4 p-[6px] bg-[#181825] rounded-full">
                  <UserAvatar user={currentUser as any} size="lg" className="w-[80px] h-[80px] text-3xl" />
                </div>
                <div className="flex ltr:justify-end rtl:justify-start pt-4 mb-4">
                  <button onClick={() => setActiveTab('User Profile')} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">{t('settings.editUserProfile')}</button>
                </div>
                <div className="mt-2">
                  <div className="text-[#cdd6f4] font-bold text-xl">{currentUser.username}<span className="text-[#bac2de] font-medium">#{currentUser.discriminator}</span></div>
                  {currentUser.customStatus && <div className="text-[#bac2de] text-sm mt-1">💬 <StatusText text={currentUser.customStatus} /></div>}
                </div>
                <div className="mt-3 relative">
                  <button onClick={() => setShowStatusPicker(!showStatusPicker)} className="flex items-center gap-2 bg-[#1e1e2e] px-3 py-2 rounded hover:bg-[#313244] transition-colors">
                    <statusInfo.icon size={14} style={{ color: statusInfo.color }} className={userStatus === 'online' ? 'fill-current' : ''} />
                    <span className="text-[#cdd6f4] text-sm font-medium">{statusLabels[userStatus]}</span>
                  </button>
                  {showStatusPicker && <div className="absolute bottom-full ltr:left-0 rtl:right-0 mb-2 z-50"><StatusPicker currentStatus={userStatus} customStatus={currentUser.customStatus} onStatusChange={handleStatusChange} onCustomStatusChange={handleCustomStatusChange} onClose={() => setShowStatusPicker(false)} currentUserId={currentUser.id} /></div>}
                </div>
                <div className="bg-[#1e1e2e] rounded-lg mt-4 p-4 space-y-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <div><div className="text-[#bac2de] text-xs font-bold uppercase mb-1">{t('settings.username')}</div><div className="text-[#cdd6f4] text-sm">{currentUser.username}<span className="text-[#bac2de]">#{currentUser.discriminator}</span></div></div>
                      <button onClick={() => setActiveAccordion(activeAccordion === 'username' ? null : 'username')} className="bg-[#45475a] hover:bg-[#585b70] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">{t('settings.edit')}</button>
                    </div>
                    <div className={`grid transition-all duration-300 ease-in-out ${activeAccordion === 'username' ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden bg-[#181825] rounded p-4">
                        <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.username')}</label>
                        <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors mb-4" />
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setActiveAccordion(null)} className="text-white hover:underline text-sm font-medium">{t('settings.cancel')}</button>
                          <button onClick={() => handleSaveField('username', editUsername)} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2 rounded text-sm font-medium transition-colors">{t('settings.done')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <div><div className="text-[#bac2de] text-xs font-bold uppercase mb-1">{t('settings.email')}</div>
                        <div className="text-[#cdd6f4] text-sm flex items-center gap-2">{revealEmail ? currentUser.email : getMaskedEmail(currentUser.email)}<button onClick={() => setRevealEmail(!revealEmail)} className="text-[#bac2de] hover:text-[#cdd6f4] ms-1">{revealEmail ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                      </div>
                      <button onClick={() => setActiveAccordion(activeAccordion === 'email' ? null : 'email')} className="bg-[#45475a] hover:bg-[#585b70] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">{t('settings.edit')}</button>
                    </div>
                    <div className={`grid transition-all duration-300 ease-in-out ${activeAccordion === 'email' ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden bg-[#181825] rounded p-4">
                        <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.email')}</label>
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors mb-4" />
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setActiveAccordion(null)} className="text-white hover:underline text-sm font-medium">{t('settings.cancel')}</button>
                          <button onClick={() => handleSaveField('email', editEmail)} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2 rounded text-sm font-medium transition-colors">{t('settings.done')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <div><div className="text-[#bac2de] text-xs font-bold uppercase mb-1">{t('settings.phoneNumber')}</div><div className="text-[#cdd6f4] text-sm">{currentUser.phone || t('settings.noPhone')}</div></div>
                      <button onClick={() => setActiveAccordion(activeAccordion === 'phone' ? null : 'phone')} className="bg-[#45475a] hover:bg-[#585b70] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">{currentUser.phone ? t('settings.edit') : t('settings.add')}</button>
                    </div>
                    <div className={`grid transition-all duration-300 ease-in-out ${activeAccordion === 'phone' ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                      <div className="overflow-hidden bg-[#181825] rounded p-4">
                        <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.phoneNumber')}</label>
                        <input type="tel" placeholder="(555) 555-5555" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors mb-4" />
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setActiveAccordion(null)} className="text-white hover:underline text-sm font-medium">{t('settings.cancel')}</button>
                          <button onClick={() => handleSaveField('phone', editPhone)} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2 rounded text-sm font-medium transition-colors">{t('settings.done')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[1px] bg-[#45475a] w-full mb-8" />
            <h3 className="text-[#cdd6f4] font-bold text-lg mb-4">{t('settings.passwordAuth')}</h3>
            <button onClick={() => setActiveAccordion(activeAccordion === 'password' ? null : 'password')} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-2 rounded text-sm font-medium transition-colors mb-4">{t('settings.changePassword')}</button>
            <div className={`grid transition-all duration-300 ease-in-out ${activeAccordion === 'password' ? 'grid-rows-[1fr] opacity-100 mb-8' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden bg-[#181825] rounded p-4 max-w-md">
                <div className="space-y-4">
                  <div><label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.currentPassword')}</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors" /></div>
                  <div><label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.newPassword')}</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors" /></div>
                  <div><label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.confirmPassword')}</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors" /></div>
                  {passwordError && <div className="text-[#f38ba8] text-xs font-medium mt-1">{passwordError}</div>}
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setActiveAccordion(null)} className="text-white hover:underline text-sm font-medium">{t('settings.cancel')}</button>
                    <button onClick={handleSavePassword} className="bg-[#a6e3a1] hover:bg-[#a6e3a1]/80 text-white px-6 py-2 rounded text-sm font-medium transition-colors">{t('settings.done')}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>}

          {activeTab === 'User Profile' &&
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-[#cdd6f4] mb-2">{t('settings.customizeProfile')}</h2>
            <p className="text-[#bac2de] text-sm mb-6">{t('settings.customizeProfileDesc')}</p>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.displayName')}</label>
                  <input type="text" value={pendingUser.username} onChange={(e) => handleChange('username', e.target.value)} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors" />
                </div>
                <div>
                  <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.avatar')}</label>
                  <div className="flex items-center gap-4">
                    {/* ✅ Avatar upload button with Cloudinary loading */}
                    <button onClick={() => !avatarUploading && fileInputRef.current?.click()} disabled={avatarUploading}
                      className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                      {avatarUploading ? <><Loader2 size={16} className="animate-spin" />Uploading...</> : <><Upload size={16} />{t('settings.uploadImage')}</>}
                    </button>
                    <button onClick={() => handleChange('avatar', undefined)} className="text-[#bac2de] hover:text-[#cdd6f4] text-sm font-medium">{t('settings.removeAvatar')}</button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </div>
                </div>
                <div>
                  <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.profileBanner')}</label>
                  <div className="flex items-center gap-4 mb-3">
                    {/* ✅ Banner upload button with Cloudinary loading */}
                    <button onClick={() => !bannerUploading && bannerInputRef.current?.click()} disabled={bannerUploading}
                      className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                      {bannerUploading ? <><Loader2 size={16} className="animate-spin" />Uploading...</> : <><Upload size={16} />{t('settings.uploadBanner')}</>}
                    </button>
                    {pendingUser.banner && <button onClick={() => handleChange('banner', undefined)} className="text-[#f38ba8] hover:text-[#f38ba8]/80 text-sm font-medium">{t('settings.remove')}</button>}
                    <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  </div>
                  <div className="text-[#bac2de] text-xs mb-2">{t('settings.pickBannerColor')}</div>
                  <div className="flex flex-wrap gap-2">
                    {BANNER_COLORS.map((color) => (
                      <button key={color} onClick={() => { handleChange('bannerColor', color); handleChange('banner', undefined); }}
                        className="w-8 h-8 rounded cursor-pointer transition-transform hover:scale-110 flex items-center justify-center border border-[#45475a]" style={{ backgroundColor: color }}>
                        {!pendingUser.banner && pendingUser.bannerColor === color && <Check size={14} className="text-white drop-shadow-md" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.aboutMe')}</label>
                  <textarea value={pendingUser.aboutMe || ''} onChange={(e) => handleChange('aboutMe', e.target.value)} maxLength={190} rows={4} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors resize-none" />
                  <div className="ltr:text-right rtl:text-left text-xs text-[#bac2de] mt-1">{pendingUser.aboutMe?.length || 0}/190</div>
                </div>
                <div>
                  <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.avatarColor')}</label>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <button key={color} onClick={() => handleChange('avatarColor', color)} className="w-10 h-10 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center" style={{ backgroundColor: color }}>
                        {pendingUser.avatarColor === color && <Check size={20} className="text-white drop-shadow-md" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-[300px] flex-shrink-0">
                <div className="text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.preview')}</div>
                <div className="bg-[#11111b] rounded-lg shadow-lg overflow-hidden">
                  {pendingUser.banner ? <div className="h-[60px] bg-cover bg-center" style={{ backgroundImage: `url(${pendingUser.banner})` }} /> : <div className="h-[60px]" style={{ backgroundColor: pendingUser.bannerColor || pendingUser.avatarColor }} />}
                  <div className="px-4 pb-4 relative">
                    <div className="absolute -top-[36px] ltr:left-4 rtl:right-4 p-[5px] bg-[#11111b] rounded-full"><UserAvatar user={pendingUser as any} size="lg" className="w-[80px] h-[80px] text-3xl" /></div>
                    <div className="pt-[48px] mb-3"><span className="text-[#cdd6f4] font-bold text-xl">{pendingUser.username}</span><span className="text-[#bac2de] text-lg">#{pendingUser.discriminator}</span></div>
                    {pendingUser.customStatus && <div className="text-[#bac2de] text-sm mb-2">💬 <StatusText text={pendingUser.customStatus} /></div>}
                    <div className="h-[1px] bg-[#181825] w-full mb-4" />
                    <div className="mb-4"><h3 className="text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.aboutMe')}</h3><p className="text-[#cdd6f4] text-sm whitespace-pre-wrap">{pendingUser.aboutMe || t('settings.aboutMeDefault')}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>}

          {activeTab === 'Appearance' &&
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-[#cdd6f4] mb-5">{t('settings.appearance')}</h2>
            <div className="mb-8">
              <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.theme')}</h3>
              <div className="flex space-x-4">
                <div className="flex-1 bg-[#181825] p-4 rounded cursor-pointer border-2 border-[#cba6f7] relative">
                  <div className="absolute top-2 ltr:right-2 rtl:left-2 w-5 h-5 bg-[#cba6f7] rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>
                  <div className="h-12 bg-[#1e1e2e] rounded mb-2" /><div className="h-4 bg-[#11111b] rounded w-3/4" />
                  <div className="mt-4 text-center text-[#cdd6f4] font-bold">{t('settings.dark')}</div>
                </div>
                <div className="flex-1 bg-white p-4 rounded cursor-not-allowed opacity-50 border-2 border-transparent">
                  <div className="h-12 bg-[#f2f3f5] rounded mb-2" /><div className="h-4 bg-[#e3e5e8] rounded w-3/4" />
                  <div className="mt-4 text-center text-black font-bold">{t('settings.light')}</div>
                </div>
              </div>
            </div>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3"><h3 className="text-[#bac2de] text-xs font-bold uppercase">Chat Font Scaling</h3><span className="text-[#cba6f7] text-sm font-semibold tabular-nums">{chatFontSize}px</span></div>
              <div className="relative">
                <input type="range" min={12} max={24} step={1} value={chatFontSize} onChange={(e) => setChatFontSize(Number(e.target.value))} className="w-full accent-[#cba6f7] h-1.5 bg-[#45475a] rounded-full appearance-none cursor-pointer" />
                <div className="flex justify-between mt-2 px-0.5">
                  {[12, 14, 16, 18, 20, 24].map((tick) => { const pct = (tick - 12) / (24 - 12) * 100; return (
                    <button key={tick} onClick={() => setChatFontSize(tick)} className="flex flex-col items-center gap-1 group" style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)' }}>
                      <div className={`w-1 h-2 rounded-full transition-colors ${chatFontSize === tick ? 'bg-[#cba6f7]' : 'bg-[#585b70] group-hover:bg-[#bac2de]'}`} />
                      <span className={`text-[10px] tabular-nums transition-colors ${chatFontSize === tick ? 'text-[#cba6f7] font-semibold' : 'text-[#6c7086] group-hover:text-[#bac2de]'}`}>{tick}</span>
                    </button>); })}
                </div>
              </div>
            </div>
            <div className="mb-8 mt-12">
              <div className="flex items-center justify-between mb-3"><h3 className="text-[#bac2de] text-xs font-bold uppercase">UI Scale</h3><span className="text-[#cba6f7] text-sm font-semibold tabular-nums">{uiScale}%</span></div>
              <div className="relative">
                <input type="range" min={80} max={120} step={1} value={uiScale} onChange={(e) => setUiScale(Number(e.target.value))} className="w-full accent-[#cba6f7] h-1.5 bg-[#45475a] rounded-full appearance-none cursor-pointer" />
                <div className="flex justify-between mt-2 px-0.5">
                  {[80, 90, 100, 110, 120].map((tick) => { const pct = (tick - 80) / (120 - 80) * 100; return (
                    <button key={tick} onClick={() => setUiScale(tick)} className="flex flex-col items-center gap-1 group" style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)' }}>
                      <div className={`w-1 h-2 rounded-full transition-colors ${uiScale === tick ? 'bg-[#cba6f7]' : 'bg-[#585b70] group-hover:bg-[#bac2de]'}`} />
                      <span className={`text-[10px] tabular-nums transition-colors ${uiScale === tick ? 'text-[#cba6f7] font-semibold' : 'text-[#6c7086] group-hover:text-[#bac2de]'}`}>{tick}%</span>
                    </button>); })}
                </div>
              </div>
            </div>
            <div className="mb-8 mt-12">
              <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-2">Server Bar Position</h3>
              <div className="max-w-xs relative">
                <select value={serverBarPosition} onChange={(e) => setServerBarPosition(e.target.value as 'left' | 'right')} className="w-full bg-[#11111b] text-[#cdd6f4] border border-[#45475a] rounded-lg px-4 py-3 ltr:pr-10 rtl:pl-10 appearance-none cursor-pointer focus:outline-none focus:border-[#cba6f7] transition-colors text-sm font-medium">
                  <option value="left">Left Side</option><option value="right">Right Side</option>
                </select>
                <ChevronDownIcon className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6c7086] pointer-events-none" />
              </div>
            </div>
            <div className="mt-12">
              <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-3">Preview</h3>
              <div className="bg-[#181825] rounded-lg overflow-hidden border border-[#313244]">
                <div className="h-9 px-3 flex items-center gap-2 border-b border-[#11111b] bg-[#1e1e2e]"><span className="text-[#a6adc8] text-xs">#</span><span className="text-[#cdd6f4] text-xs font-semibold">general</span></div>
                <div className="p-3 space-y-3" style={{ fontSize: `${chatFontSize}px` }}>
                  {[{name:'Alice',color:'#89b4fa',init:'AL',msg:"Hey everyone! How's the new update looking? 🎉",time:'3:42 PM'},{name:'Bob',color:'#a6e3a1',init:'BO',msg:'Looking great! The font scaling is really smooth 👀',time:'3:43 PM'},{name:'Charlie',color:'#f5c2e7',init:'CH',msg:'Agreed! Much easier to read now 📖',time:'3:44 PM'}].map(m => (
                    <div key={m.name} className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{backgroundColor:m.color}}>{m.init}</div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2"><span className="font-semibold" style={{color:m.color,fontSize:`${chatFontSize}px`}}>{m.name}</span><span className="text-[10px] text-[#6c7086]">Today at {m.time}</span></div>
                        <p className="text-[#cdd6f4] leading-relaxed" style={{fontSize:`${chatFontSize}px`}}>{m.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>}

          {activeTab === 'Voice & Video' &&
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-[#cdd6f4] mb-5">{t('settings.voiceVideo')}</h2>
            <div className="mb-6"><h3 className="text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.inputVolume')}</h3><input type="range" className="w-full accent-[#cba6f7]" defaultValue={100} /></div>
            <div className="mb-6"><h3 className="text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.outputVolume')}</h3><input type="range" className="w-full accent-[#cba6f7]" defaultValue={100} /></div>
            <div className="mb-6"><h3 className="text-[#bac2de] text-xs font-bold uppercase mb-2">{t('settings.videoSettings')}</h3><div className="bg-[#11111b] h-[200px] rounded flex items-center justify-center text-[#6c7086]"><div className="text-center"><Camera size={48} className="mx-auto mb-2 opacity-50" /><p>{t('settings.noCamera')}</p></div></div></div>
          </div>}

          {activeTab === 'Language' &&
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-[#cdd6f4] mb-2">{t('language.title')}</h2>
            <p className="text-[#bac2de] text-sm mb-6">{t('language.description')}</p>
            <div className="max-w-md">
              <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">{t('language.selectLanguage')}</label>
              <div className="relative">
                <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full bg-[#11111b] text-[#cdd6f4] border border-[#45475a] rounded-lg px-4 py-3 ltr:pr-10 rtl:pl-10 appearance-none cursor-pointer focus:outline-none focus:border-[#cba6f7] transition-colors text-sm font-medium">
                  <option value="en">{t('language.english')}</option><option value="ar">{t('language.arabic')}</option>
                </select>
                <ChevronDownIcon className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6c7086] pointer-events-none" />
              </div>
              <div className="mt-6 space-y-3">
                <div onClick={() => setLanguage('en')} className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer border-2 transition-all ${language === 'en' ? 'border-[#cba6f7] bg-[#cba6f7]/5' : 'border-[#313244] hover:border-[#45475a] bg-[#181825]'}`}>
                  <div className="w-10 h-10 rounded-full bg-[#89b4fa]/20 flex items-center justify-center text-lg flex-shrink-0">🇺🇸</div>
                  <div className="flex-1"><p className="text-[#cdd6f4] font-semibold">English</p><p className="text-xs text-[#6c7086]">{t('language.defaultLang')}</p></div>
                  {language === 'en' && <div className="w-5 h-5 rounded-full bg-[#cba6f7] flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                </div>
                <div onClick={() => setLanguage('ar')} className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer border-2 transition-all ${language === 'ar' ? 'border-[#cba6f7] bg-[#cba6f7]/5' : 'border-[#313244] hover:border-[#45475a] bg-[#181825]'}`}>
                  <div className="w-10 h-10 rounded-full bg-[#a6e3a1]/20 flex items-center justify-center text-lg flex-shrink-0">عربي</div>
                  <div className="flex-1"><p className="text-[#cdd6f4] font-semibold" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>العربية</p><p className="text-xs text-[#6c7086]">{t('language.arabicRtl')}</p></div>
                  {language === 'ar' && <div className="w-5 h-5 rounded-full bg-[#cba6f7] flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                </div>
              </div>
              <div className="mt-10">
                <h3 className="text-[#cdd6f4] font-bold text-lg mb-2">{t('layout.title')}</h3>
                <p className="text-[#bac2de] text-sm mb-4">{t('layout.description')}</p>
                <div className="space-y-3">
                  <div onClick={() => setLayoutDirection(layoutDirection === 'ltr' ? 'auto' : 'ltr')} className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer border-2 transition-all ${layoutDirection === 'ltr' || layoutDirection === 'auto' && language === 'en' ? 'border-[#cba6f7] bg-[#cba6f7]/5' : 'border-[#313244] hover:border-[#45475a] bg-[#181825]'}`}>
                    <div className="w-10 h-10 rounded-full bg-[#89b4fa]/20 flex items-center justify-center flex-shrink-0"><AlignLeft size={20} className="text-[#89b4fa]" /></div>
                    <div className="flex-1"><p className="text-[#cdd6f4] font-semibold">{t('layout.ltr')}</p><p className="text-xs text-[#6c7086]">{t('layout.ltrDesc')}</p></div>
                    {(layoutDirection === 'ltr' || layoutDirection === 'auto' && language === 'en') && <div className="w-5 h-5 rounded-full bg-[#cba6f7] flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                  </div>
                  <div onClick={() => setLayoutDirection(layoutDirection === 'rtl' ? 'auto' : 'rtl')} className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer border-2 transition-all ${layoutDirection === 'rtl' || layoutDirection === 'auto' && language === 'ar' ? 'border-[#cba6f7] bg-[#cba6f7]/5' : 'border-[#313244] hover:border-[#45475a] bg-[#181825]'}`}>
                    <div className="w-10 h-10 rounded-full bg-[#a6e3a1]/20 flex items-center justify-center flex-shrink-0"><AlignRight size={20} className="text-[#a6e3a1]" /></div>
                    <div className="flex-1"><p className="text-[#cdd6f4] font-semibold">{t('layout.rtl')}</p><p className="text-xs text-[#6c7086]">{t('layout.rtlDesc')}</p></div>
                    {(layoutDirection === 'rtl' || layoutDirection === 'auto' && language === 'ar') && <div className="w-5 h-5 rounded-full bg-[#cba6f7] flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                  </div>
                </div>
              </div>
            </div>
          </div>}

          {['Connections', 'Notifications'].includes(activeTab) &&
          <div className="animate-in slide-in-from-bottom-4 duration-300 flex flex-col items-center justify-center h-[400px]">
            <div className="w-40 h-40 bg-[#181825] rounded-full flex items-center justify-center mb-6"><Palette size={64} className="text-[#cdd6f4] opacity-20" /></div>
            <h2 className="text-xl font-bold text-[#cdd6f4] mb-2">{t('settings.wip')}</h2>
            <p className="text-[#bac2de] text-center max-w-md">{t('settings.wipDesc')}</p>
          </div>}

          {activeTab === 'Privacy & Safety' &&
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold text-[#cdd6f4] mb-2">{t('privacy.title')}</h2>
            <p className="text-[#bac2de] text-sm mb-8">{t('privacy.description')}</p>
            <div className="mb-8">
              <h3 className="text-[#cdd6f4] font-bold text-base mb-1">{t('privacy.dmPrivacy')}</h3>
              <p className="text-[#6c7086] text-sm mb-4">{t('privacy.dmPrivacyDesc')}</p>
              <div className="space-y-2">
                {[{value:'everyone',label:t('privacy.everyone'),desc:t('privacy.everyoneDesc')},{value:'server_members',label:t('privacy.serverMembers'),desc:t('privacy.serverMembersDesc')},{value:'friends',label:t('privacy.friends'),desc:t('privacy.friendsDesc')},{value:'none',label:t('privacy.noOne'),desc:t('privacy.noOneDesc')}].map((option) => {
                  const ps = db.getPrivacySettings(currentUser.id); const isSelected = ps.allowDMsFrom === option.value;
                  return (<div key={option.value} onClick={() => { db.savePrivacySettings({...ps,allowDMsFrom:option.value as any}); setActiveTab('Privacy & Safety'); }} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-all ${isSelected ? 'border-[#cba6f7] bg-[#cba6f7]/5' : 'border-[#313244] hover:border-[#45475a] bg-[#181825]'}`}>
                    <div className="flex-1"><p className="text-[#cdd6f4] font-medium">{option.label}</p><p className="text-xs text-[#6c7086]">{option.desc}</p></div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#cba6f7] border-[#cba6f7]' : 'border-[#585b70]'}`}>{isSelected && <Check size={12} className="text-white" />}</div>
                  </div>);
                })}
              </div>
            </div>
            <div className="h-[1px] bg-[#45475a] w-full mb-8" />
            <div className="mb-8">
              <h3 className="text-[#cdd6f4] font-bold text-base mb-1">{t('privacy.friendRequestPrivacy')}</h3>
              <p className="text-[#6c7086] text-sm mb-4">{t('privacy.friendRequestDesc')}</p>
              <div className="space-y-2">
                {[{value:'everyone',label:t('privacy.everyone'),desc:t('privacy.everyoneDesc')},{value:'server_members',label:t('privacy.serverMembers'),desc:t('privacy.serverMembersDesc')},{value:'friends_of_friends',label:t('privacy.friendsOfFriends'),desc:t('privacy.friendsOfFriendsDesc')},{value:'none',label:t('privacy.noOne'),desc:t('privacy.noOneDesc')}].map((option) => {
                  const ps = db.getPrivacySettings(currentUser.id); const isSelected = ps.allowFriendRequestsFrom === option.value;
                  return (<div key={option.value} onClick={() => { db.savePrivacySettings({...ps,allowFriendRequestsFrom:option.value as any}); setActiveTab('Privacy & Safety'); }} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-all ${isSelected ? 'border-[#cba6f7] bg-[#cba6f7]/5' : 'border-[#313244] hover:border-[#45475a] bg-[#181825]'}`}>
                    <div className="flex-1"><p className="text-[#cdd6f4] font-medium">{option.label}</p><p className="text-xs text-[#6c7086]">{option.desc}</p></div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#cba6f7] border-[#cba6f7]' : 'border-[#585b70]'}`}>{isSelected && <Check size={12} className="text-white" />}</div>
                  </div>);
                })}
              </div>
            </div>
          </div>}
        </div>

        {hasChanges && activeTab === 'User Profile' &&
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[700px] bg-[#11111b] rounded-lg p-3 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="text-white font-medium px-2">{t('settings.unsavedChanges')}</div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button onClick={handleReset} className="text-white hover:underline text-sm font-medium">{t('settings.reset')}</button>
            <button onClick={handleSave} className="bg-[#a6e3a1] hover:bg-[#a6e3a1]/80 text-white px-6 py-2 rounded text-sm font-medium transition-colors">{t('settings.saveChanges')}</button>
          </div>
        </div>}

        {showToast &&
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-[#a6e3a1] text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white/20 p-1 rounded-full"><Check size={16} strokeWidth={3} /></div>
          <span className="font-medium">{t('settings.saved')}</span>
        </div>}
      </div>
    </div>
  );
}

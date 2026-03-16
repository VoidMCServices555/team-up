import React, { useEffect, useState, useRef } from 'react';
import {
  UserPlus, Settings, PlusCircle, FolderPlus, Bell, BellOff,
  Shield, LogOut, PenSquare, Trash2, Copy, Check, RefreshCw,
  Clock, Users, Wifi, Send, Search, X, Link,
} from 'lucide-react';
import { db, StoredUser } from '../lib/database';
import { useI18n } from '../lib/i18n';

interface ServerDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  serverName?: string;
  serverMemberCount?: number;
  serverOnlineCount?: number;
  serverIcon?: string;
  currentUser: { id: string };
  onServerSettings: () => void;
  onCreateChannel: (categoryId?: string) => void;
  onCreateCategory: () => void;
  onNotificationSettings: () => void;
  onPrivacySettings: () => void;
  onEditServerProfile: () => void;
  onLeaveServer: () => void;
  onDeleteServer: () => void;
  isOwner: boolean;
}

type ExpiryOption = '1h' | '12h' | '1d' | '7d' | '14d' | '30d' | 'never';

const EXPIRY_OPTIONS: { value: ExpiryOption; labelEn: string; labelAr: string; ms: number | null }[] = [
  { value: '1h',  labelEn: '1 Hour',    labelAr: 'ساعة واحدة',    ms: 60 * 60 * 1000 },
  { value: '12h', labelEn: '12 Hours',  labelAr: '12 ساعة',       ms: 12 * 60 * 60 * 1000 },
  { value: '1d',  labelEn: '1 Day',     labelAr: 'يوم واحد',      ms: 24 * 60 * 60 * 1000 },
  { value: '7d',  labelEn: '7 Days',    labelAr: '7 أيام',        ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '14d', labelEn: '14 Days',   labelAr: '14 يوم',        ms: 14 * 24 * 60 * 60 * 1000 },
  { value: '30d', labelEn: '30 Days',   labelAr: '30 يوم',        ms: 30 * 24 * 60 * 60 * 1000 },
  { value: 'never', labelEn: 'No Expiry', labelAr: 'بلا حدود',   ms: null },
];

export function ServerDropdownMenu({
  isOpen, onClose, serverId, serverName = '', serverMemberCount = 0,
  serverOnlineCount = 0, serverIcon, currentUser, onServerSettings,
  onCreateChannel, onCreateCategory, onNotificationSettings,
  onPrivacySettings, onEditServerProfile, onLeaveServer, onDeleteServer, isOwner,
}: ServerDropdownMenuProps) {
  const { t, language } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryOption>('7d');
  const [isMuted, setIsMuted] = useState(db.isServerMuted(currentUser.id, serverId));
  const [friends, setFriends] = useState<StoredUser[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'link' | 'friends'>('link');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    setIsMuted(db.isServerMuted(currentUser.id, serverId));
  }, [isOpen, currentUser.id, serverId]);

  const getExpiryMs = (expiry: ExpiryOption): number | null =>
    EXPIRY_OPTIONS.find((o) => o.value === expiry)?.ms ?? null;

  const getExpiryLabel = (expiry: ExpiryOption): string => {
    const opt = EXPIRY_OPTIONS.find((o) => o.value === expiry);
    return language === 'ar' ? (opt?.labelAr ?? '') : (opt?.labelEn ?? '');
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const expiryMs = getExpiryMs(selectedExpiry);
      const code = crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
      const expiresAt = expiryMs ? new Date(Date.now() + expiryMs) : null;
      const { setDoc, doc, serverTimestamp, Timestamp } = await import('firebase/firestore');
      const { db: firestore } = await import('../lib/firebase');
      await setDoc(doc(firestore, 'invites', code), {
        code, serverId, createdBy: currentUser.id, uses: 0,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
      });
      setInviteCode(code);
    } catch (err) {
      console.error('Failed to create invite:', err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleOpenInvite = async () => {
    setShowInviteModal(true);
    setActiveTab('link');
    setSentTo(new Set());
    setFriendSearch('');
    // جيب الأصدقاء
    const fr = await db.getFriends(currentUser.id);
    setFriends(fr);
    // اعمل invite تلقائي
    if (!inviteCode) await handleCreateInvite();
  };

  const getInviteLink = () => `${window.location.origin}/invite/${inviteCode}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToFriend = async (friendId: string) => {
    if (!inviteCode) return
    // ✅ optimistic - Sent يظهر فوراً
    setSentTo((prev) => new Set([...prev, friendId]))
    try {
      const dmChannelId = db.getDMChannelId(currentUser.id, friendId)
      const me = await db.getUser(currentUser.id)
      if (!me) return
      const inviteMsg = {
        id: crypto.randomUUID(),
        // ✅ بعت الـ URL كـ text عادي - MessageBubble هيعمل invite card تلقائياً
        content: getInviteLink(),
        author: me,
        timestamp: new Date(),
      }
      await db.saveMessage(dmChannelId, inviteMsg as any)
      await db.addOpenDM(friendId, currentUser.id, 'user')
    } catch (err) {
      console.error('Failed to send invite:', err)
      setSentTo((prev) => { const n = new Set(prev); n.delete(friendId); return n })
    }
  }

  const handleToggleMute = () => {
    const newMuted = db.toggleMuteServer(currentUser.id, serverId);
    setIsMuted(newMuted);
  };

  if (!isOpen && !showInviteModal) return null;

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(friendSearch.toLowerCase()) ||
    f.displayName.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const MenuItem = ({ label, icon: Icon, onClick, variant = 'default' }: {
    label: string; icon: React.ElementType; onClick: () => void; variant?: 'default' | 'danger' | 'premium';
  }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); onClose(); }}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm font-medium group transition-colors mb-0.5
        ${variant === 'danger' ? 'text-[#f38ba8] hover:bg-[#f38ba8] hover:text-white'
        : variant === 'premium' ? 'text-[#f5c2e7] hover:bg-[#cba6f7] hover:text-white'
        : 'text-[#bac2de] hover:bg-[#cba6f7] hover:text-white'}`}>
      <span>{label}</span><Icon size={16} />
    </button>
  );

  return (
    <>
      {isOpen && (
        <div ref={menuRef} className="absolute top-[56px] left-4 w-[220px] bg-[#11111b] rounded-md shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
          <div className="space-y-0.5">
            <MenuItem label={t('server.invitePeople')} icon={UserPlus} onClick={handleOpenInvite} variant="premium" />
            {isOwner && <MenuItem label={t('server.serverSettings')} icon={Settings} onClick={onServerSettings} />}
            {isOwner && <MenuItem label={t('server.createChannel')} icon={PlusCircle} onClick={() => onCreateChannel()} />}
            {isOwner && <MenuItem label={t('server.createCategory')} icon={FolderPlus} onClick={onCreateCategory} />}
            <div className="h-[1px] bg-[#181825] my-1 mx-1" />
            <button onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm font-medium transition-colors mb-0.5 text-[#bac2de] hover:bg-[#cba6f7] hover:text-white">
              <span>{isMuted ? t('server.unmuteServer') : t('server.muteServer')}</span>
              {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
            </button>
            <MenuItem label={t('server.privacySettings')} icon={Shield} onClick={onPrivacySettings} />
            <div className="h-[1px] bg-[#181825] my-1 mx-1" />
            <MenuItem label={t('server.editProfile')} icon={PenSquare} onClick={onEditServerProfile} />
            <div className="h-[1px] bg-[#181825] my-1 mx-1" />
            {isOwner
              ? <MenuItem label={t('server.deleteServer')} icon={Trash2} onClick={onDeleteServer} variant="danger" />
              : <MenuItem label={t('server.leaveServer')} icon={LogOut} onClick={onLeaveServer} variant="danger" />
            }
          </div>
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1e1e2e] rounded-xl w-full max-w-[480px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-[#313244]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-[#cdd6f4]">{t('server.inviteTitle')}</h2>
                <button onClick={() => { setShowInviteModal(false); onClose(); }} className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors"><X size={20} /></button>
              </div>
              <p className="text-[#bac2de] text-sm">{t('server.inviteToServer')} <strong className="text-[#cdd6f4]">{serverName}</strong></p>
            </div>

            {/* Server Preview Embed */}
            <div className="mx-6 mt-4 bg-[#181825] rounded-lg p-4 border border-[#313244]">
              <div className="flex items-center gap-3">
                {serverIcon
                  ? <img src={serverIcon} className="w-12 h-12 rounded-full object-cover" alt="" />
                  : <div className="w-12 h-12 rounded-full bg-[#cba6f7] flex items-center justify-center text-white font-bold text-lg">{serverName.substring(0, 2).toUpperCase()}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-[#cdd6f4] font-bold truncate">{serverName}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-[#a6adc8]">
                      <span className="w-2 h-2 rounded-full bg-[#a6e3a1] inline-block" />{serverOnlineCount} {t('server.online')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#a6adc8]">
                      <Users size={12} />{serverMemberCount} {t('server.members')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex mx-6 mt-4 gap-1 bg-[#181825] rounded-lg p-1">
              {(['link', 'friends'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === tab ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#6c7086] hover:text-[#bac2de]'}`}>
                  {tab === 'link' ? t('server.inviteLink') : t('server.sendToFriend')}
                </button>
              ))}
            </div>

            {/* Tab: Link */}
            {activeTab === 'link' && (
              <div className="px-6 py-4 space-y-4">
                {/* Expiry Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#bac2de] uppercase mb-2 flex items-center gap-1.5">
                    <Clock size={12} />{t('server.expireAfter')}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPIRY_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => { setSelectedExpiry(opt.value); setInviteCode(''); }}
                        className={`py-1.5 rounded text-xs font-medium transition-colors ${selectedExpiry === opt.value ? 'bg-[#cba6f7] text-white' : 'bg-[#313244] text-[#bac2de] hover:bg-[#45475a]'}`}>
                        {language === 'ar' ? opt.labelAr : opt.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Invite Link */}
                <div>
                  <label className="block text-xs font-bold text-[#bac2de] uppercase mb-2 flex items-center gap-1.5">
                    <Link size={12} />{t('server.inviteLink')}
                  </label>
                  {inviteLoading ? (
                    <div className="bg-[#11111b] rounded-lg p-3 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#cba6f7] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : inviteCode ? (
                    <div className="space-y-2">
                      <div className="bg-[#11111b] rounded-lg p-3 flex items-center gap-2">
                        <span className="flex-1 text-[#cdd6f4] font-mono text-sm truncate">{getInviteLink()}</span>
                        <button onClick={() => copyToClipboard(getInviteLink())}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${copied ? 'bg-[#a6e3a1] text-white' : 'bg-[#cba6f7] hover:bg-[#b4befe] text-white'}`}>
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          {copied ? t('server.copied') : t('server.copy')}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#6c7086] flex items-center gap-1">
                          <Clock size={11} />
                          {selectedExpiry === 'never' ? t('server.noExpiry') : `${t('server.expiresIn')} ${getExpiryLabel(selectedExpiry)}`}
                        </p>
                        <button onClick={handleCreateInvite} disabled={inviteLoading}
                          className="flex items-center gap-1 text-xs text-[#bac2de] hover:text-[#cdd6f4] transition-colors">
                          <RefreshCw size={12} />{t('server.generateNew')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={handleCreateInvite} disabled={inviteLoading}
                      className="w-full bg-[#cba6f7] hover:bg-[#b4befe] text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <Link size={16} />{t('server.generateInvite')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Friends */}
            {activeTab === 'friends' && (
              <div className="px-6 py-4">
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7086]" />
                  <input type="text" value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن صديق...' : 'Search friends...'}
                    className="w-full bg-[#11111b] text-[#cdd6f4] text-sm pl-8 pr-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#cba6f7] placeholder-[#585b70]" />
                </div>
                <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                  {filteredFriends.length === 0 ? (
                    <p className="text-center text-[#6c7086] text-sm py-6">{t('general.noFriendsFound')}</p>
                  ) : filteredFriends.map((friend) => {
                    const hasSent = sentTo.has(friend.id);
                    return (
                      <div key={friend.id} className="flex items-center gap-3 p-2 rounded hover:bg-[#313244] transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: friend.avatarColor || '#cba6f7' }}>
                          {friend.avatar ? <img src={friend.avatar} className="w-full h-full object-cover" alt="" /> : friend.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#cdd6f4] font-medium truncate">{friend.displayName || friend.username}</p>
                          <p className="text-xs text-[#6c7086] truncate">{friend.username}#{friend.discriminator}</p>
                        </div>
                        <button onClick={() => !hasSent && handleSendToFriend(friend.id)}
                          disabled={hasSent || !inviteCode}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${hasSent ? 'bg-[#313244] text-[#a6e3a1] cursor-default' : 'bg-[#cba6f7] hover:bg-[#b4befe] text-white'}`}>
                          {hasSent ? <><Check size={12} />{language === 'ar' ? 'أُرسل' : 'Sent'}</> : <><Send size={12} />{language === 'ar' ? 'إرسال' : 'Send'}</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-[#181825] px-6 py-3 flex justify-end">
              <button onClick={() => { setShowInviteModal(false); onClose(); }}
                className="text-[#cdd6f4] text-sm font-medium hover:underline">{t('general.close')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

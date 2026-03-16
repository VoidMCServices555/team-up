import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import {
  MessageSquare, Phone, UserPlusIcon, UserMinusIcon, ShieldBanIcon,
  ShieldOffIcon, ChevronDownIcon, ChevronRightIcon, MoreHorizontalIcon,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { StatusText } from './StatusText';
import { db, syncChannel, StoredUser, ServerProfile } from '../lib/database';
import { useI18n } from '../lib/i18n';
import type { Member } from '../App';

interface UserProfilePopupProps {
  user: Member;
  position: { x: number; y: number };
  onClose: () => void;
  serverId?: string;
  onOpenDM?: (userId: string) => void;
  onStartCall?: (userId: string) => void;
  currentUserId?: string;
  presenceMap?: Record<string, string>;
}

export function UserProfilePopup({
  user, position, onClose, serverId, onOpenDM, onStartCall,
  currentUserId = '', presenceMap = {},
}: UserProfilePopupProps) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: position.x, y: position.y });
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [canAddFriend, setCanAddFriend] = useState(false);
  const [serverProfile, setServerProfile] = useState<ServerProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mutualServers, setMutualServers] = useState<any[]>([]);
  const [mutualFriends, setMutualFriends] = useState<StoredUser[]>([]);
  const [showMutualServers, setShowMutualServers] = useState(false);
  const [showMutualFriends, setShowMutualFriends] = useState(false);

  useEffect(() => {
    setIsLoaded(false); setIsFriend(false); setIsPending(false); setCanAddFriend(false);
    const fetchData = async () => {
      const userData = await db.getUser(user.id);
      if (userData) setStoredUser(userData);

      if (!currentUserId) { setIsLoaded(true); return; }

      const [friends, blocked, requests, profile] = await Promise.all([
        db.getFriends(currentUserId),
        db.isBlocked(currentUserId, user.id),
        db.getFriendRequests(currentUserId),
        serverId ? db.getServerProfile(serverId, user.id) : Promise.resolve(undefined),
      ]);

      const friendFound = friends.some(f => f.id === user.id);
      const pendingFound = requests.some(r => r.status === 'pending' && r.fromUserId === currentUserId && r.toUserId === user.id);
      let addAllowed = false;
      if (!friendFound && !pendingFound && !blocked) {
        addAllowed = await db.canSendFriendRequest(currentUserId, user.id);
      }

      setIsFriend(friendFound); setIsBlocked(blocked);
      setIsPending(pendingFound); setCanAddFriend(addAllowed);
      if (profile) setServerProfile(profile);

      // Mutual
      const [myServers, theirServers, myFriends, theirFriends] = await Promise.all([
        db.getServers(currentUserId), db.getServers(user.id),
        db.getFriends(currentUserId), db.getFriends(user.id),
      ]);
      const theirServerIds = new Set(theirServers.map(s => s.id));
      setMutualServers(myServers.filter(s => theirServerIds.has(s.id)));
      const theirFriendIds = new Set(theirFriends.map(f => f.id));
      setMutualFriends(myFriends.filter(f => theirFriendIds.has(f.id) && f.id !== currentUserId));
      setIsLoaded(true);
    };
    fetchData();
    const handleSync = (e: MessageEvent) => { if (e.data.type === 'friends_updated') fetchData(); };
    syncChannel.addEventListener('message', handleSync);
    return () => syncChannel.removeEventListener('message', handleSync);
  }, [user.id, currentUserId, serverId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!popupRef.current) return;
    const POPUP_W = 300;
    const POPUP_H = popupRef.current.scrollHeight || 500;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PAD = 12;

    let x = position.x + 10; // جنب الماوس على اليمين
    let y = position.y;

    // لو هيخرج من اليمين → حطه على الشمال
    if (x + POPUP_W + PAD > vw) x = position.x - POPUP_W - 10;
    // منع الخروج من الشمال
    if (x < PAD) x = PAD;
    // منع الخروج من الأسفل
    if (y + POPUP_H + PAD > vh) y = vh - POPUP_H - PAD;
    // منع الخروج من الأعلى
    if (y < PAD) y = PAD;

    setAdjustedPos({ x, y });
  }, [position, storedUser]);

  const displayName = serverProfile?.nickname || storedUser?.displayName || user.displayName;
  const avatarToShow = serverProfile?.avatar || storedUser?.avatar || user.avatar;
  const bannerColor = storedUser?.bannerColor || user.bannerColor || '#313244';
  const bannerImage = storedUser?.banner || user.banner;
  const aboutMe = storedUser?.aboutMe || user.aboutMe;
  const customStatus = storedUser?.customStatus || user.customStatus;
  const liveStatus = (presenceMap[user.id] as any) || storedUser?.status || user.status;
  const isOwnProfile = user.id === currentUserId;

  const statusColors: Record<string, string> = { online: '#a6e3a1', idle: '#f9e2af', dnd: '#f38ba8', offline: '#6c7086' };
  const statusText: Record<string, string> = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };

  const handleAddFriend = async () => { await db.sendFriendRequest(currentUserId, user.id); setIsFriend(true); };
  const handleRemoveFriend = async () => { await db.removeFriend(currentUserId, user.id); setIsFriend(false); };
  const handleBlock = async () => { await db.blockUser(currentUserId, user.id); setIsBlocked(true); };
  const handleUnblock = async () => { await db.unblockUser(currentUserId, user.id); setIsBlocked(false); };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div ref={popupRef}
        className="fixed z-[100] w-[300px] bg-[#1e1e2e] rounded-xl shadow-2xl overflow-hidden border border-[#313244] animate-in fade-in zoom-in-95 duration-150"
        style={{ left: adjustedPos.x, top: adjustedPos.y, maxHeight: 'calc(100vh - 24px)' }}>

        {/* Banner */}
        <div className="h-[80px] relative flex-shrink-0"
          style={{ background: bannerImage ? `url(${bannerImage}) center/cover` : bannerColor }}>
        </div>

        {/* Avatar */}
        <div className="px-4 pb-0 relative">
          <div className="absolute -top-8 left-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-[#1e1e2e] overflow-hidden">
                <UserAvatar user={{ ...user, avatar: avatarToShow, status: liveStatus }} size="xl" className="w-full h-full" />
              </div>
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#1e1e2e]"
                style={{ backgroundColor: statusColors[liveStatus] || statusColors.offline }} />
            </div>
          </div>
        </div>

        {/* Action buttons - لو مش بروفايل نفسنا */}
        {!isOwnProfile && (
          <div className="flex items-center justify-end gap-2 px-4 pt-2 pb-1 mt-1">
            {onOpenDM && (
              <button onClick={() => { db.addOpenDM(currentUserId, user.id, 'user'); onOpenDM(user.id); onClose(); }}
                className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#bac2de] hover:text-[#cdd6f4] flex items-center justify-center transition-colors" title="Send Message">
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            {onStartCall && (
              <button onClick={() => { onStartCall(user.id); onClose(); }}
                className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#bac2de] hover:text-[#cdd6f4] flex items-center justify-center transition-colors" title="Voice Call">
                <Phone className="w-4 h-4" />
              </button>
            )}
            {isLoaded && (isFriend
              ? <button onClick={handleRemoveFriend} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#bac2de] hover:text-[#f38ba8] flex items-center justify-center transition-colors" title="Remove Friend"><UserMinusIcon className="w-4 h-4" /></button>
              : canAddFriend && <button onClick={handleAddFriend} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#bac2de] hover:text-[#a6e3a1] flex items-center justify-center transition-colors" title="Add Friend"><UserPlusIcon className="w-4 h-4" /></button>
            )}
            {isBlocked
              ? <button onClick={handleUnblock} className="w-8 h-8 rounded-full bg-[#f38ba8]/20 text-[#f38ba8] flex items-center justify-center transition-colors" title="Unblock"><ShieldOffIcon className="w-4 h-4" /></button>
              : <button onClick={handleBlock} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#bac2de] hover:text-[#f38ba8] flex items-center justify-center transition-colors" title="Block"><ShieldBanIcon className="w-4 h-4" /></button>
            }
            <button className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#bac2de] hover:text-[#cdd6f4] flex items-center justify-center transition-colors">
              <MoreHorizontalIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Profile card */}
        <div className={`mx-3 mb-3 bg-[#181825] rounded-xl overflow-hidden ${isOwnProfile ? 'mt-10' : 'mt-1'}`}>
          {/* Name */}
          <div className="px-4 pt-4 pb-3">
            <h3 className="text-[#cdd6f4] font-bold text-lg leading-tight">{displayName}</h3>
            <p className="text-[#a6adc8] text-sm">@{storedUser?.username || user.username}</p>
            {customStatus && <p className="text-[#6c7086] text-xs mt-1 truncate">{customStatus}</p>}
            {serverProfile?.nickname && serverProfile.nickname !== (storedUser?.displayName || user.displayName) && (
              <p className="text-[#6c7086] text-xs mt-0.5">{t('profile.aka')} {storedUser?.displayName || user.displayName}</p>
            )}
          </div>

          <div className="h-px bg-[#313244]" />

          {/* Status */}
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[liveStatus] || statusColors.offline }} />
            <span className="text-[#a6adc8] text-sm">{statusText[liveStatus] || 'Offline'}</span>
          </div>

          {/* About Me */}
          {aboutMe && (
            <>
              <div className="h-px bg-[#313244]" />
              <div className="px-4 py-3">
                <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide mb-1.5">About Me</p>
                <p className="text-[#cdd6f4] text-sm leading-relaxed">{aboutMe}</p>
              </div>
            </>
          )}

          {/* Member Since */}
          <div className="h-px bg-[#313244]" />
          <div className="px-4 py-3">
            <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide mb-1">Member Since</p>
            <p className="text-[#cdd6f4] text-sm">{new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>

          {/* Mutual Servers - مش بتظهر لو بروفايل نفسنا */}
          {!isOwnProfile && mutualServers.length > 0 && (
            <>
              <div className="h-px bg-[#313244]" />
              <button onClick={() => setShowMutualServers(!showMutualServers)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1e1e2e] transition-colors">
                <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide">Mutual Servers — {mutualServers.length}</p>
                {showMutualServers ? <ChevronDownIcon className="w-3.5 h-3.5 text-[#6c7086]" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-[#6c7086]" />}
              </button>
              {showMutualServers && (
                <div className="px-3 pb-3 space-y-1">
                  {mutualServers.map(server => (
                    <div key={server.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#313244] transition-colors">
                      {server.icon
                        ? <img src={server.icon} alt={server.name} className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-[#cba6f7] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{server.name.substring(0, 2).toUpperCase()}</div>
                      }
                      <span className="text-[#cdd6f4] text-sm truncate">{server.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Mutual Friends - مش بتظهر لو بروفايل نفسنا */}
          {!isOwnProfile && mutualFriends.length > 0 && (
            <>
              <div className="h-px bg-[#313244]" />
              <button onClick={() => setShowMutualFriends(!showMutualFriends)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1e1e2e] transition-colors">
                <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide">Mutual Friends — {mutualFriends.length}</p>
                {showMutualFriends ? <ChevronDownIcon className="w-3.5 h-3.5 text-[#6c7086]" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-[#6c7086]" />}
              </button>
              {showMutualFriends && (
                <div className="px-3 pb-3 space-y-1">
                  {mutualFriends.map(friend => (
                    <div key={friend.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#313244] transition-colors">
                      <div className="relative flex-shrink-0">
                        <UserAvatar user={friend} size="sm" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#181825]"
                          style={{ backgroundColor: statusColors[(presenceMap[friend.id] as any) || friend.status] || statusColors.offline }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#cdd6f4] text-sm font-medium truncate">{friend.displayName}</p>
                        <p className="text-[#6c7086] text-xs truncate">@{friend.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Note */}
          <div className="h-px bg-[#313244]" />
          <div className="px-4 py-3">
            <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide mb-1">{t('profile.note')}</p>
            <textarea placeholder={t('profile.clickToAddNote')}
              className="w-full bg-transparent text-xs text-[#cdd6f4] placeholder-[#585b70] resize-none focus:outline-none h-8" />
          </div>
        </div>
      </div>
    </>
  );
}

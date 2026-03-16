import React, { useEffect, useState, useRef } from 'react';
import {
  InboxIcon, XIcon, Check, X, UserPlusIcon, BellIcon,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { db, syncChannel, FriendRequest, StoredUser } from '../lib/database';
import type { Member } from '../App';
import { useI18n } from '../lib/i18n';

interface InboxPanelProps {
  currentUser: Member;
  onClose: () => void;
}

export function InboxPanel({ currentUser, onClose }: InboxPanelProps) {
  const { t } = useI18n();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [userMap, setUserMap] = useState<Record<string, StoredUser>>({});
  const ref = useRef<HTMLDivElement>(null);

  const refreshRequests = async () => {
    const allRequests = await db.getFriendRequests(currentUser.id);
    const pending = (allRequests ?? []).filter((r) => r.status === 'pending');
    setRequests(pending);

    // جيب بيانات كل اليوزرز المرتبطين بالطلبات
    const ids = new Set<string>();
    pending.forEach((r) => { ids.add(r.fromUserId); ids.add(r.toUserId); });
    const map: Record<string, StoredUser> = {};
    await Promise.all(
      Array.from(ids).map(async (id) => {
        const u = await db.getUser(id);
        if (u) map[id] = u;
      })
    );
    setUserMap(map);
  };

  useEffect(() => {
    refreshRequests();
    const handleSync = (event: MessageEvent) => {
      if (event.data.type === 'friends_updated' || event.data.type === 'users_updated') {
        refreshRequests();
      }
    };
    syncChannel.addEventListener('message', handleSync);
    return () => syncChannel.removeEventListener('message', handleSync);
  }, [currentUser.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAccept = async (requestId: string) => {
    await db.acceptFriendRequest(requestId);
    await refreshRequests();
  };

  const handleDecline = async (requestId: string) => {
    await db.declineFriendRequest(requestId);
    await refreshRequests();
  };

  const incomingRequests = requests.filter((r) => r.toUserId === currentUser.id);
  const outgoingRequests = requests.filter((r) => r.fromUserId === currentUser.id);

  const formatTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t('inbox.justNow');
    if (diffMins < 60) return `${diffMins}${t('inbox.mAgo')}`;
    if (diffHours < 24) return `${diffHours}${t('inbox.hAgo')}`;
    return `${diffDays}${t('inbox.dAgo')}`;
  };

  return (
    <div
      ref={ref}
      className="w-[380px] max-h-[500px] bg-[#11111b] rounded-lg shadow-2xl border border-[#181825] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#181825]">
        <div className="flex items-center gap-2">
          <InboxIcon className="w-5 h-5 text-[#cba6f7]" />
          <h3 className="text-[#cdd6f4] font-semibold">{t('inbox.title')}</h3>
          {requests.length > 0 && (
            <span className="text-xs bg-[#f38ba8] text-white px-1.5 py-0.5 rounded-full font-medium">
              {requests.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-1 rounded hover:bg-[#1e1e2e]">
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-[#181825] rounded-full flex items-center justify-center mb-4">
              <BellIcon className="w-8 h-8 text-[#45475a]" />
            </div>
            <p className="text-[#cdd6f4] font-medium mb-1">{t('inbox.allCaughtUp')}</p>
            <p className="text-[#6c7086] text-sm">{t('inbox.noPending')}</p>
          </div>
        ) : (
          <div className="p-2">
            {/* Incoming */}
            {incomingRequests.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide px-2 mb-2">
                  {t('inbox.incoming')} — {incomingRequests.length}
                </p>
                <div className="space-y-1">
                  {incomingRequests.map((req) => {
                    const fromUser = userMap[req.fromUserId];
                    if (!fromUser) return null;
                    return (
                      <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1e1e2e] hover:bg-[#313244] transition-colors">
                        <UserAvatar user={fromUser} size="sm" showStatus />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#cdd6f4] font-medium text-sm truncate">{fromUser.displayName}</span>
                            <span className="text-[10px] text-[#6c7086]">#{fromUser.discriminator}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserPlusIcon className="w-3 h-3 text-[#a6e3a1]" />
                            <span className="text-xs text-[#6c7086]">
                              {t('inbox.incomingRequest')} · {formatTime(req.timestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => handleAccept(req.id)} className="w-8 h-8 rounded-full bg-[#181825] hover:bg-[#a6e3a1] hover:text-white flex items-center justify-center text-[#a6e3a1] transition-colors">
                            <Check size={16} />
                          </button>
                          <button onClick={() => handleDecline(req.id)} className="w-8 h-8 rounded-full bg-[#181825] hover:bg-[#f38ba8] hover:text-white flex items-center justify-center text-[#f38ba8] transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outgoing */}
            {outgoingRequests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide px-2 mb-2">
                  {t('inbox.outgoing')} — {outgoingRequests.length}
                </p>
                <div className="space-y-1">
                  {outgoingRequests.map((req) => {
                    const toUser = userMap[req.toUserId];
                    if (!toUser) return null;
                    return (
                      <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1e1e2e] hover:bg-[#313244] transition-colors">
                        <UserAvatar user={toUser} size="sm" showStatus />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#cdd6f4] font-medium text-sm truncate">{toUser.displayName}</span>
                            <span className="text-[10px] text-[#6c7086]">#{toUser.discriminator}</span>
                          </div>
                          <span className="text-xs text-[#6c7086]">
                            {t('inbox.outgoingRequest')} · {formatTime(req.timestamp)}
                          </span>
                        </div>
                        <button onClick={() => handleDecline(req.id)} className="w-8 h-8 rounded-full bg-[#181825] hover:bg-[#f38ba8] hover:text-white flex items-center justify-center text-[#6c7086] transition-colors flex-shrink-0">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

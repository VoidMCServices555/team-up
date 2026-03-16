import React, { useEffect, useState } from 'react'
import { UserAvatar } from './UserAvatar'
import { db } from '../lib/database'
import type { Member } from '../App'
import type { StoredUser, Server } from '../lib/database'
import {
  MessageSquareIcon, PhoneIcon, VideoIcon, UserPlusIcon, UserMinusIcon,
  ShieldBanIcon, ShieldOffIcon, ChevronDownIcon, ChevronRightIcon, XIcon,
} from 'lucide-react'

interface DMProfilePanelProps {
  dmUser: Member
  currentUserId: string
  onStartCall?: (withVideo?: boolean) => void
  onClose?: () => void
  presenceMap?: Record<string, string>
}

export function DMProfilePanel({ dmUser, currentUserId, onStartCall, onClose, presenceMap = {} }: DMProfilePanelProps) {
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null)
  const [isFriend, setIsFriend] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [mutualServers, setMutualServers] = useState<Server[]>([])
  const [mutualFriends, setMutualFriends] = useState<StoredUser[]>([])
  const [showMutualServers, setShowMutualServers] = useState(false)
  const [showMutualFriends, setShowMutualFriends] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const userData = await db.getUser(dmUser.id)
      if (userData) setStoredUser(userData)

      const friends = await db.getFriends(currentUserId)
      setIsFriend(friends.some(f => f.id === dmUser.id))

      const blockedList = await db.getBlockedUsers(currentUserId)
      setIsBlocked(blockedList.includes(dmUser.id))

      const myServers = await db.getServers(currentUserId)
      const theirServers = await db.getServers(dmUser.id)
      const theirIds = new Set(theirServers.map(s => s.id))
      setMutualServers(myServers.filter(s => theirIds.has(s.id)))

      const myFriends = await db.getFriends(currentUserId)
      const theirFriends = await db.getFriends(dmUser.id)
      const theirFriendIds = new Set(theirFriends.map(f => f.id))
      setMutualFriends(myFriends.filter(f => theirFriendIds.has(f.id) && f.id !== currentUserId))
    }
    fetchData()
  }, [dmUser.id, currentUserId])

  const handleAddFriend = async () => { await db.sendFriendRequest(currentUserId, dmUser.id); setIsFriend(true) }
  const handleRemoveFriend = async () => { await db.removeFriend(currentUserId, dmUser.id); setIsFriend(false) }
  const handleBlock = async () => { await db.blockUser(currentUserId, dmUser.id); setIsBlocked(true) }
  const handleUnblock = async () => { await db.unblockUser(currentUserId, dmUser.id); setIsBlocked(false) }

  const bannerColor = storedUser?.bannerColor || dmUser.bannerColor || '#313244'
  const bannerImage = storedUser?.banner || dmUser.banner
  const aboutMe = storedUser?.aboutMe || dmUser.aboutMe
  const customStatus = storedUser?.customStatus || dmUser.customStatus

  // ✅ status من RTDB أولوية
  const liveStatus = (presenceMap[dmUser.id] as any) || dmUser.status;
  const statusColors: Record<string, string> = { online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#80848e' }
  const statusText: Record<string, string> = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' }

  return (
    <div className="w-[280px] flex-shrink-0 bg-[#1e1e2e] flex flex-col overflow-y-auto border-l border-[#11111b] custom-scrollbar" style={{ maxHeight: '100%' }}>
      {/* Banner */}
      <div className="relative h-[100px] flex-shrink-0"
        style={{ background: bannerImage ? `url(${bannerImage}) center/cover` : bannerColor }}>
        {/* Close button */}
        {onClose && (
          <button onClick={onClose} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="px-4 pb-0 relative">
        <div className="absolute -top-10 left-4">
          <div className="relative inline-block">
            {/* ✅ Avatar أكبر */}
            <div className="w-20 h-20 rounded-full border-[5px] border-[#2b2d31] overflow-hidden flex-shrink-0">
              <UserAvatar user={{ ...dmUser, status: liveStatus }} size="xl" className="w-full h-full" />
            </div>
            {/* ✅ Status dot مطابق لباقي الـ UI */}
            <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full border-[3px] border-[#2b2d31]"
              style={{ backgroundColor: statusColors[liveStatus] || statusColors.offline }}>
              {liveStatus === 'dnd' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-white rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 pt-14 pb-2 justify-end">
        <button onClick={() => onStartCall?.(false)} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#a6adc8] hover:text-white flex items-center justify-center transition-colors" title="Voice Call">
          <PhoneIcon className="w-4 h-4" />
        </button>
        <button onClick={() => onStartCall?.(true)} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#a6adc8] hover:text-white flex items-center justify-center transition-colors" title="Video Call">
          <VideoIcon className="w-4 h-4" />
        </button>
        {isFriend
          ? <button onClick={handleRemoveFriend} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#a6adc8] hover:text-[#f23f43] flex items-center justify-center transition-colors" title="Remove Friend"><UserMinusIcon className="w-4 h-4" /></button>
          : <button onClick={handleAddFriend} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#a6adc8] hover:text-[#23a55a] flex items-center justify-center transition-colors" title="Add Friend"><UserPlusIcon className="w-4 h-4" /></button>
        }
        {isBlocked
          ? <button onClick={handleUnblock} className="w-8 h-8 rounded-full bg-[#f23f43]/20 text-[#f23f43] hover:bg-[#f23f43]/30 flex items-center justify-center transition-colors" title="Unblock"><ShieldOffIcon className="w-4 h-4" /></button>
          : <button onClick={handleBlock} className="w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] text-[#a6adc8] hover:text-[#f23f43] flex items-center justify-center transition-colors" title="Block"><ShieldBanIcon className="w-4 h-4" /></button>
        }
      </div>

      {/* Profile card */}
      <div className="mx-3 mb-3 bg-[#181825] rounded-xl overflow-hidden">
        {/* Name & username */}
        <div className="px-4 pt-4 pb-3">
          <h3 className="text-white font-bold text-lg leading-tight">{storedUser?.displayName || dmUser.displayName}</h3>
          <p className="text-[#a6adc8] text-sm">@{storedUser?.username || dmUser.username}</p>
          {customStatus && <p className="text-[#6c7086] text-xs mt-1 truncate">{customStatus}</p>}
        </div>

        <div className="h-px bg-[#1e1e2e]" />

        {/* Status */}
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[liveStatus] || statusColors.offline }} />
          <span className="text-[#a6adc8] text-sm">{statusText[liveStatus] || 'Offline'}</span>
        </div>

        {/* About Me */}
        {aboutMe && (
          <>
            <div className="h-px bg-[#1e1e2e]" />
            <div className="px-4 py-3">
              <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide mb-1.5">About Me</p>
              <p className="text-[#cdd6f4] text-sm leading-relaxed">{aboutMe}</p>
            </div>
          </>
        )}

        {/* Member Since */}
        <div className="h-px bg-[#1e1e2e]" />
        <div className="px-4 py-3">
          <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide mb-1">Member Since</p>
          <p className="text-[#cdd6f4] text-sm">{new Date(dmUser.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Mutual Servers */}
        {mutualServers.length > 0 && (
          <>
            <div className="h-px bg-[#1e1e2e]" />
            <button onClick={() => setShowMutualServers(!showMutualServers)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#11111b] transition-colors">
              <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide">
                Mutual Servers — {mutualServers.length}
              </p>
              {showMutualServers ? <ChevronDownIcon className="w-3.5 h-3.5 text-[#6c7086]" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-[#6c7086]" />}
            </button>
            {showMutualServers && (
              <div className="px-3 pb-3 space-y-1">
                {mutualServers.map(server => (
                  <div key={server.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#1e1e2e] transition-colors">
                    {server.icon
                      ? <img src={server.icon} alt={server.name} className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{server.name.substring(0, 2).toUpperCase()}</div>
                    }
                    <span className="text-[#cdd6f4] text-sm truncate">{server.name}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Mutual Friends */}
        {mutualFriends.length > 0 && (
          <>
            <div className="h-px bg-[#1e1e2e]" />
            <button onClick={() => setShowMutualFriends(!showMutualFriends)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#11111b] transition-colors">
              <p className="text-[#a6adc8] text-xs font-semibold uppercase tracking-wide">
                Mutual Friends — {mutualFriends.length}
              </p>
              {showMutualFriends ? <ChevronDownIcon className="w-3.5 h-3.5 text-[#6c7086]" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-[#6c7086]" />}
            </button>
            {showMutualFriends && (
              <div className="px-3 pb-3 space-y-1">
                {mutualFriends.map(friend => (
                  <div key={friend.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#1e1e2e] transition-colors">
                    <div className="relative flex-shrink-0">
                      <UserAvatar user={friend} size="sm" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#313244]"
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
      </div>
    </div>
  )
}

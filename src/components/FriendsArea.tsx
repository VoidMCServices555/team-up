import React, { useEffect, useState } from 'react'
import {
  UsersIcon, InboxIcon, SearchIcon, CheckIcon, XIcon, ShieldOffIcon,
} from 'lucide-react'
import { FriendRow } from './FriendRow'
import { WumpusEmptyState } from './WumpusEmptyState'
import { AddFriendTab } from './AddFriendTab'
import { InboxPanel } from './InboxPanel'
import { UserAvatar } from './UserAvatar'
import { ConfirmDialog } from './ConfirmDialog'
import { db, syncChannel, StoredUser, FriendRequest } from '../lib/database'
import { Member } from '../App'
import { useI18n } from '../lib/i18n'

type TabType = 'online' | 'all' | 'pending' | 'blocked' | 'add'

interface FriendsAreaProps {
  currentUser: StoredUser
  onStartDM: (userId: string) => void
  onMemberClick?: (member: Member, e: React.MouseEvent) => void
  onStartVoiceCall?: (userId: string, withVideo?: boolean) => void
  onOpenMobileMenu?: () => void
  presenceMap?: Record<string, string>
}

export function FriendsArea({ currentUser, onStartDM, onMemberClick, onStartVoiceCall, onOpenMobileMenu, presenceMap = {} }: FriendsAreaProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('online')
  const [friends, setFriends] = useState<StoredUser[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [pendingUsers, setPendingUsers] = useState<Record<string, StoredUser>>({})
  const [blockedUsers, setBlockedUsers] = useState<StoredUser[]>([])
  const [showInbox, setShowInbox] = useState(false)
  const [unblockConfirm, setUnblockConfirm] = useState<StoredUser | null>(null)
  const refreshData = async () => {
    const fr = await db.getFriends(currentUser.id)
    setFriends(fr)

    const reqs = await db.getFriendRequests(currentUser.id)
    setRequests(reqs ?? [])

    const pending = (reqs ?? []).filter((r) => r.status === 'pending')
    const ids = new Set<string>()
    pending.forEach((r) => { ids.add(r.fromUserId); ids.add(r.toUserId) })
    const map: Record<string, StoredUser> = {}
    await Promise.all(
      Array.from(ids).map(async (id) => {
        const u = await db.getUser(id)
        if (u) map[id] = u
      })
    )
    setPendingUsers(map)

    const blockedIds = await db.getBlockedUsers(currentUser.id)
    if (blockedIds.length > 0) {
      const blocked: StoredUser[] = []
      for (const id of blockedIds) {
        const u = await db.getUser(id)
        if (u) blocked.push(u)
      }
      setBlockedUsers(blocked)
    } else {
      setBlockedUsers([])
    }
  }

  useEffect(() => {
    refreshData()
    const handleSync = (event: MessageEvent) => {
      if (event.data.type === 'friends_updated' || event.data.type === 'users_updated') refreshData()
    }
    syncChannel.addEventListener('message', handleSync)
    return () => syncChannel.removeEventListener('message', handleSync)
  }, [currentUser])

  // ✅ لو كنا في online tab وجه presenceMap جديد → لا حاجة لأي شيء تاني
  // getStatus() بيقرأ من presenceMap مباشرة وده بيعمل re-render تلقائي

  const getStatus = (user: StoredUser): StoredUser['status'] =>
    (presenceMap[user.id] as StoredUser['status']) || user.status

  const handleAccept = async (requestId: string) => {
    await db.acceptFriendRequest(requestId)
    await refreshData()
  }

  const handleDecline = async (requestId: string) => {
    await db.declineFriendRequest(requestId)
    await refreshData()
  }

  const handleRemoveFriend = async (friendId: string) => {
    await db.removeFriend(currentUser.id, friendId)
    await refreshData()
  }

  const handleBlockUser = async (userId: string) => {
    await db.blockUser(currentUser.id, userId)
    await refreshData()
  }

  const handleUnblockUser = async (userId: string) => {
    await db.unblockUser(currentUser.id, userId)
    setUnblockConfirm(null)
    await refreshData()
  }

  const handleVoiceCall = (userId: string) => {
    onStartDM(userId)
    onStartVoiceCall?.(userId, false)
  }

  const handleVideoCall = (userId: string) => {
    onStartDM(userId)
    onStartVoiceCall?.(userId, true)
  }

  const TabButton = ({ id, label, isGreen = false, count }: { id: TabType; label: string; isGreen?: boolean; count?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-1.5 py-0.5 mx-0.5 md:px-2 md:mx-2 rounded text-[12px] md:text-[15px] font-medium transition-colors whitespace-nowrap flex-shrink-0
        ${isGreen ? `${activeTab === id ? 'bg-transparent text-[#a6e3a1]' : 'bg-[#a6e3a1] text-white hover:bg-[#a6e3a1]'}` : `${activeTab === id ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#bac2de] hover:bg-[#313244] hover:text-[#cdd6f4]'}`}`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="bg-[#f38ba8] text-white text-[10px] md:text-xs px-1 md:px-1.5 rounded-full ml-0.5">{count}</span>
      )}
    </button>
  )

  const pendingRequests = (requests ?? []).filter((r) => r.status === 'pending')
  // ✅ لو presenceMap فاضي (لسه بيتحمل) → نظهر كل الأصدقاء في online tab مؤقتاً
  const presenceLoaded = Object.keys(presenceMap).length > 0
  const onlineFriends = presenceLoaded
    ? friends.filter((f) => getStatus(f) !== 'offline')
    : friends // لو لسه بيتحمل نظهر الكل
  const displayFriends = activeTab === 'online' ? onlineFriends : friends

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e2e] h-full">
      <div className="border-b border-[#11111b] flex-shrink-0 shadow-sm">
        <div className="h-12 flex items-center px-2 md:px-4">
          <div className="flex items-center text-[#6c7086] mr-2 md:mr-4 flex-shrink-0">
            {onOpenMobileMenu && (
              <button onClick={onOpenMobileMenu} className="md:hidden text-[#bac2de] hover:text-[#cdd6f4] mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
              </button>
            )}
            <UsersIcon className="mr-2 flex-shrink-0" size={24} />
            <span className="font-bold text-[#cdd6f4] text-base flex-shrink-0">{t('nav.friends')}</span>
          </div>
          <div className="h-6 w-[1px] bg-[#45475a] mx-1 md:mx-2 hidden md:block flex-shrink-0" />
          <div className="hidden md:flex items-center flex-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <TabButton id="online" label={t('nav.online')} />
            <TabButton id="all" label={t('nav.all')} />
            <TabButton id="pending" label={t('nav.pending')} count={pendingRequests.length} />
            <TabButton id="blocked" label={t('nav.blocked')} count={blockedUsers.length > 0 ? blockedUsers.length : undefined} />
            <button onClick={() => setActiveTab('add')} className={`px-2 mx-2 rounded text-[15px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'add' ? 'text-[#a6e3a1] bg-transparent' : 'bg-[#a6e3a1] text-white'}`}>{t('nav.addFriend')}</button>
          </div>
          <div className="flex-1 md:hidden" />
          <div className="flex items-center space-x-2 md:space-x-4 text-[#bac2de] flex-shrink-0 ml-1 md:ml-2">
            <div className="relative">
              <button onClick={() => setShowInbox(!showInbox)} className={`cursor-pointer transition-colors ${showInbox ? 'text-[#cdd6f4]' : 'hover:text-[#cdd6f4]'}`}>
                <InboxIcon className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              {showInbox && (
                <div className="absolute top-full right-0 mt-2 z-50">
                  <InboxPanel currentUser={currentUser} onClose={() => setShowInbox(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="md:hidden flex items-center px-2 pb-2 pt-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden gap-1">
          <TabButton id="online" label={t('nav.online')} />
          <TabButton id="all" label={t('nav.all')} />
          <TabButton id="pending" label={t('nav.pending')} count={pendingRequests.length} />
          <TabButton id="blocked" label={t('nav.blocked')} count={blockedUsers.length > 0 ? blockedUsers.length : undefined} />
          <button onClick={() => setActiveTab('add')} className={`px-2 py-0.5 rounded text-[12px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'add' ? 'text-[#a6e3a1] bg-transparent' : 'bg-[#a6e3a1] text-white'}`}>{t('nav.addFriend')}</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'add' ? (
          <AddFriendTab currentUser={currentUser} />
        ) : (
          <div className="flex flex-col h-full">
            {(activeTab === 'online' || activeTab === 'all') && (
              <div className="px-3 md:px-8 pt-3 md:pt-6 pb-2 md:pb-4">
                <div className="relative">
                  <input type="text" placeholder={t('chat.search')} className="w-full bg-[#11111b] text-[#cdd6f4] rounded px-2 py-1.5 text-sm focus:outline-none" />
                  <SearchIcon className="absolute right-2 top-1.5 text-[#6c7086]" size={18} />
                </div>
              </div>
            )}
            <div className="px-2 md:px-5 pb-4 flex-1">
              {activeTab === 'online' && displayFriends.length === 0 && <WumpusEmptyState type="no-online" />}
              {activeTab === 'all' && displayFriends.length === 0 && <WumpusEmptyState type="no-friends" />}
              {activeTab === 'pending' && pendingRequests.length === 0 && <WumpusEmptyState type="no-pending" />}
              {activeTab === 'blocked' && blockedUsers.length === 0 && <WumpusEmptyState type="no-blocked" />}

              {(activeTab === 'online' || activeTab === 'all') && (
                <div className="mt-4">
                  <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-4">
                    {activeTab === 'online' ? t('nav.online') : t('general.allFriends')} — {displayFriends.length}
                  </h3>
                  {displayFriends.map((friend) => (
                    <FriendRow
                      key={friend.id}
                      username={friend.username}
                      discriminator={friend.discriminator}
                      status={getStatus(friend)}
                      statusText={friend.customStatus}
                      avatarColor={friend.avatarColor}
                      user={{ ...friend, status: getStatus(friend) }}
                      onMessage={() => onStartDM(friend.id)}
                      onProfileClick={(e) => onMemberClick?.(friend, e)}
                      onVoiceCall={() => handleVoiceCall(friend.id)}
                      onVideoCall={() => handleVideoCall(friend.id)}
                      onRemoveFriend={() => handleRemoveFriend(friend.id)}
                      onBlock={() => handleBlockUser(friend.id)}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="mt-4">
                  <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-4">{t('nav.pending')} — {pendingRequests.length}</h3>
                  {pendingRequests.map((req) => {
                    const isIncoming = req.toUserId === currentUser.id
                    const otherUserId = isIncoming ? req.fromUserId : req.toUserId
                    const otherUser = pendingUsers[otherUserId]
                    if (!otherUser) return null
                    return (
                      <div key={req.id} className="flex items-center justify-between p-2.5 hover:bg-[#313244] rounded border-t border-[#45475a] first:border-t-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#cba6f7] flex items-center justify-center text-white text-xs font-bold">
                            {otherUser.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[#cdd6f4] font-bold">{otherUser.username}</span>
                            <span className="text-[#bac2de] text-xs ml-1">#{otherUser.discriminator}</span>
                            <div className="text-[#bac2de] text-xs">{isIncoming ? t('general.incomingRequest') : t('general.outgoingRequest')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isIncoming && (
                            <button onClick={() => handleAccept(req.id)} className="w-8 h-8 rounded-full bg-[#181825] hover:text-[#a6e3a1] flex items-center justify-center transition-colors">
                              <CheckIcon size={18} />
                            </button>
                          )}
                          <button onClick={() => handleDecline(req.id)} className="w-8 h-8 rounded-full bg-[#181825] hover:text-[#f38ba8] flex items-center justify-center transition-colors">
                            <XIcon size={18} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab === 'blocked' && blockedUsers.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-4">{t('nav.blocked')} — {blockedUsers.length}</h3>
                  {blockedUsers.map((blockedUser) => (
                    <div key={blockedUser.id} className="group flex items-center justify-between p-2.5 px-3 hover:bg-[#313244] hover:rounded-lg border-t border-[#45475a] first:border-t-0 mx-2 mt-[1px]">
                      <div className="flex items-center space-x-3">
                        <UserAvatar user={blockedUser} username={blockedUser.username} status="offline" color={blockedUser.avatarColor} className="flex-shrink-0 opacity-50" />
                        <div className="flex flex-col">
                          <span className="text-[#6c7086] font-semibold">{blockedUser.username}</span>
                          <span className="text-[#585b70] text-xs">Blocked</span>
                        </div>
                      </div>
                      <button onClick={() => setUnblockConfirm(blockedUser)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#cdd6f4] bg-[#45475a] hover:bg-[#585b70] rounded transition-colors opacity-0 group-hover:opacity-100">
                        <ShieldOffIcon size={14} />Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={unblockConfirm !== null}
        title="Unblock User"
        message={unblockConfirm ? `Are you sure you want to unblock ${unblockConfirm.username}#${unblockConfirm.discriminator}?` : ''}
        confirmLabel="Unblock"
        onConfirm={() => { if (unblockConfirm) handleUnblockUser(unblockConfirm.id) }}
        onCancel={() => setUnblockConfirm(null)}
        isDestructive={false}
      />
    </div>
  )
}

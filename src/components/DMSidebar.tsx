import React, { useEffect, useState } from 'react'
import {
  UsersIcon, SettingsIcon, MicIcon, HeadphonesIcon, MicOffIcon, X,
  Pin, ArrowUp, ArrowDown, PlusIcon, FolderPlusIcon, ChevronDownIcon,
  ChevronRightIcon, FolderIcon, Trash2Icon, PencilIcon, MessageSquarePlusIcon, SearchIcon,
  PhoneCallIcon, PhoneIcon,
} from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import { VoicePanel } from './VoicePanel'
import { StatusPicker } from './StatusPicker'
import { StatusText } from './StatusText'
import { CreateDMCategoryModal } from './CreateDMCategoryModal'
import { useI18n } from '../lib/i18n'
import type { Member, ConnectedVoiceState } from '../App'
import { db, syncChannel, StoredUser, DMCategory, GroupDM, VoiceState } from '../lib/database'

interface DMSidebarProps {
  currentUser: Member
  onOpenSettings: () => void
  isMuted: boolean
  isDeafened: boolean
  onToggleMute: () => void
  onToggleDeafen: () => void
  connectedVoice: ConnectedVoiceState | null
  onDisconnect: () => void
  onProfileClick?: (e: React.MouseEvent) => void
  selectedDMUserId: string | null
  onSelectDM: (userId: string) => void
  onStatusChange: (status: 'online' | 'idle' | 'dnd' | 'offline') => void
  onCustomStatusChange: (text: string) => void
  onToggleScreenShare?: () => void
  onToggleCamera?: () => void
  isScreenSharing?: boolean
  isCameraOn?: boolean
  callStartTime?: number | null
  onCreateGroupDM?: () => void
  selectedGroupDMId?: string | null
  onSelectGroupDM?: (groupDMId: string) => void
  onBack?: () => void
  presenceMap?: Record<string, { status: string; customStatus?: string }>
  unreadCounts?: Record<string, number>
  voiceStates?: VoiceState[]
  currentUserId?: string
}

function StackedAvatars({ members, max = 3 }: { members: StoredUser[]; max?: number }) {
  const shown = members.slice(0, max)
  return (
    <div className="flex items-center" style={{ width: `${20 + (shown.length - 1) * 14}px` }}>
      {shown.map((m, i) => (
        <div key={m.id} className="w-8 h-8 rounded-full border-2 border-[#181825] overflow-hidden flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0"
          style={{ backgroundColor: m.avatarColor || '#cba6f7', marginLeft: i > 0 ? '-10px' : '0', zIndex: shown.length - i }}>
          {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : (m.displayName || m.username || '?').substring(0, 2).toUpperCase()}
        </div>
      ))}
    </div>
  )
}

export function DMSidebar({
  currentUser, onOpenSettings, isMuted, isDeafened, onToggleMute, onToggleDeafen,
  connectedVoice, onDisconnect, onProfileClick, selectedDMUserId, onSelectDM,
  onStatusChange, onCustomStatusChange, onToggleScreenShare, onToggleCamera,
  isScreenSharing, isCameraOn, callStartTime, onCreateGroupDM,
  selectedGroupDMId, onSelectGroupDM, onBack, presenceMap: presenceMapProp = {},
  unreadCounts = {}, voiceStates = [], currentUserId = '',
}: DMSidebarProps) {
  const { t } = useI18n()
  const [dmUsers, setDmUsers] = useState<StoredUser[]>([])
  const [groupDMs, setGroupDMs] = useState<GroupDM[]>([])
  const [categories, setCategories] = useState<DMCategory[]>([])
  const [friends, setFriends] = useState<StoredUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'user' | 'group' | 'category'; id: string } | null>(null)
  const [pinnedDMIds, setPinnedDMIds] = useState<string[]>([])
  const [dmOrder, setDmOrder] = useState<string[]>([])
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<StoredUser[]>([])
  const refreshData = async () => {
    const allDmUsers = await db.getAllDMUsers(currentUser.id)
    setDmUsers(allDmUsers)
    const gDMs = await db.getGroupDMsForUser(currentUser.id)
    setGroupDMs(gDMs)
    const cats = await db.getDMCategories(currentUser.id)
    setCategories(cats)
    const fr = await db.getFriends(currentUser.id)
    setFriends(fr)
  }

  useEffect(() => {
    refreshData()
    const handleSync = (event: MessageEvent) => {
      if (['friends_updated', 'users_updated', 'group_dms_updated', 'dm_categories_updated', 'open_dms_updated'].includes(event.data.type)) {
        refreshData()
      }
    }
    syncChannel.addEventListener('message', handleSync)
    const interval = setInterval(refreshData, 5000)
    return () => { syncChannel.removeEventListener('message', handleSync); clearInterval(interval) }
  }, [currentUser.id])

  // ✅ دالة تجيب الـ status الحقيقي من RTDB
  const getUserPresence = (userId: string, fallbackUser: StoredUser) => {
    // حوّل الـ presenceMapProp (string) لـ object
    const statusStr = presenceMapProp[userId] as any
    const presence = typeof statusStr === 'string' ? { status: statusStr } : statusStr
    if (!presence) return { status: fallbackUser.status, customStatus: fallbackUser.customStatus }
    return {
      status: presence.status as StoredUser['status'],
      // لو offline → اخفي الـ customStatus
      customStatus: presence.status === 'offline' ? undefined : fallbackUser.customStatus,
    }
  }

  useEffect(() => {
    const savedPinned = localStorage.getItem('teamup_pinned_dms')
    if (savedPinned) setPinnedDMIds(JSON.parse(savedPinned))
    const savedOrder = localStorage.getItem('teamup_dm_order')
    if (savedOrder) setDmOrder(JSON.parse(savedOrder))
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (userSearchQuery.trim().length >= 1) {
      db.searchUsers(userSearchQuery, [currentUser.id]).then(setUserSearchResults)
    } else {
      setUserSearchResults([])
    }
  }, [userSearchQuery, currentUser.id])

  const handleContextMenu = (e: React.MouseEvent, type: 'user' | 'group' | 'category', id: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, type, id })
  }

  const togglePin = (id: string) => {
    const newPinned = pinnedDMIds.includes(id) ? pinnedDMIds.filter((pid) => pid !== id) : [...pinnedDMIds, id]
    setPinnedDMIds(newPinned)
    localStorage.setItem('teamup_pinned_dms', JSON.stringify(newPinned))
  }

  const moveDM = (id: string, direction: 'up' | 'down') => {
    const currentList = sortedDmUsers.map((u) => u.id)
    const currentIndex = currentList.indexOf(id)
    if (currentIndex === -1) return
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= currentList.length) return
    const newList = [...currentList]
    const [moved] = newList.splice(currentIndex, 1)
    newList.splice(newIndex, 0, moved)
    setDmOrder(newList)
    localStorage.setItem('teamup_dm_order', JSON.stringify(newList))
  }

  const closeDM = async (userId: string) => {
    await db.removeOpenDM(currentUser.id, userId)
    if (selectedDMUserId === userId) onSelectDM('')
    await refreshData()
  }

  const moveToCategory = async (dmId: string, categoryId: string | null) => {
    for (const cat of categories) {
      if (cat.dmIds.includes(dmId)) await db.saveDMCategory({ ...cat, dmIds: cat.dmIds.filter((id) => id !== dmId) })
    }
    if (categoryId) {
      const category = categories.find((c) => c.id === categoryId)
      if (category) await db.saveDMCategory({ ...category, dmIds: [...category.dmIds, dmId] })
    }
    await refreshData()
  }

  const toggleCategoryCollapse = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (category) { await db.saveDMCategory({ ...category, isCollapsed: !category.isCollapsed }); await refreshData() }
  }

  const handleCreateCategory = async (name: string) => {
    await db.saveDMCategory({ id: crypto.randomUUID(), userId: currentUser.id, name, dmIds: [], position: categories.length, isCollapsed: false })
    await refreshData()
  }

  const handleDeleteCategory = async (categoryId: string) => {
    await db.deleteDMCategory(currentUser.id, categoryId)
    await refreshData()
  }

  const handleRenameCategory = async (categoryId: string, newName: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (category && newName.trim()) { await db.saveDMCategory({ ...category, name: newName.trim() }); await refreshData() }
    setEditingCategory(null); setEditCategoryName('')
  }

  const startDMWithUser = async (user: StoredUser) => {
    const canMsg = await db.canMessage(currentUser.id, user.id)
    if (!canMsg.allowed) { alert(t('privacy.cannotDM')); return }
    await db.addOpenDM(currentUser.id, user.id, 'user')
    onSelectDM(user.id)
    setShowUserSearch(false); setUserSearchQuery('')
    await refreshData()
  }

  const filteredDmUsers = dmUsers.filter(
    (u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedDmUsers = [...filteredDmUsers].sort((a, b) => {
    const aPinned = pinnedDMIds.includes(a.id)
    const bPinned = pinnedDMIds.includes(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    const aIndex = dmOrder.indexOf(a.id)
    const bIndex = dmOrder.indexOf(b.id)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return 0
  })

  const filteredGroupDMs = groupDMs.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const categorizedDmIds = new Set(categories.flatMap((c) => c.dmIds))
  const uncategorizedUsers = sortedDmUsers.filter((u) => !categorizedDmIds.has(u.id))
  const uncategorizedGroups = filteredGroupDMs.filter((g) => !categorizedDmIds.has(g.id))
  const friendIds = new Set(friends.map((f) => f.id))

  const renderDMUser = (user: StoredUser) => {
    const isActive = selectedDMUserId === user.id && !selectedGroupDMId
    const isFriend = friendIds.has(user.id)
    const { status, customStatus } = getUserPresence(user.id, user)

    // ✅ unread count
    const dmCtxId = currentUserId ? [currentUserId, user.id].sort().join('_') : ''
    const unread = unreadCounts[dmCtxId] || 0

    // ✅ voice call indicator - هل اليوزر ده في call مع اليوزر الحالي؟
    const dmVoiceChannelId = `dm_voice_${dmCtxId}`
    const userInCall = voiceStates.some((vs) => vs.userId === user.id && vs.channelId === dmVoiceChannelId)
    const meInCall = voiceStates.some((vs) => vs.userId === currentUserId && vs.channelId === dmVoiceChannelId)
    const isInCallTogether = userInCall && meInCall
    const isRinging = userInCall && !meInCall

    return (
      <div key={user.id} onClick={() => onSelectDM(user.id)} onContextMenu={(e) => handleContextMenu(e, 'user', user.id)}
        className={`flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer group relative ${isActive ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#9399b2] hover:bg-[#1e1e2e] hover:text-[#cdd6f4]'}`}>
        <UserAvatar user={{ ...user, status }} size="sm" showStatus />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1">
            {user.username}
            {pinnedDMIds.includes(user.id) && <Pin size={10} className="text-[#cba6f7] fill-current rotate-45" />}
            {!isFriend && <span className="text-[8px] text-[#89b4fa] bg-[#89b4fa]/10 px-1 rounded">User</span>}
          </div>
          <div className="text-xs truncate opacity-60">
            {/* ✅ voice indicator يحل محل الـ customStatus */}
            {isInCallTogether ? (
              <span className="text-[#a6e3a1] flex items-center gap-1">
                <PhoneCallIcon size={10} className="text-[#a6e3a1]" /> In call
              </span>
            ) : isRinging ? (
              <span className="text-[#6c7086] flex items-center gap-1">
                <PhoneIcon size={10} /> Calling...
              </span>
            ) : customStatus ? (
              <StatusText text={customStatus} />
            ) : null}
          </div>
        </div>
        {/* ✅ unread badge */}
        {unread > 0 && !isActive ? (
          <span className="min-w-[18px] h-[18px] bg-[#f38ba8] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); closeDM(user.id) }} className="opacity-0 group-hover:opacity-100 hover:text-white flex-shrink-0">
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  const renderGroupDM = (group: GroupDM) => {
    const memberUsers = group.memberIds.filter((id) => id !== currentUser.id).map((id) => friends.find((f) => f.id === id)).filter(Boolean) as StoredUser[]
    const isActive = selectedGroupDMId === group.id
    return (
      <div key={group.id} onClick={() => onSelectGroupDM && onSelectGroupDM(group.id)} onContextMenu={(e) => handleContextMenu(e, 'group', group.id)}
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded cursor-pointer group relative ${isActive ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#9399b2] hover:bg-[#1e1e2e] hover:text-[#cdd6f4]'}`}>
        <StackedAvatars members={memberUsers} />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-sm">{group.name}</div>
          <div className="text-[10px] truncate opacity-60">{group.memberIds.length} {t('groupDM.members')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full md:w-60 bg-[#181825] flex flex-col border-r border-[#11111b]">
      <div className="h-10 md:h-12 px-2 flex items-center shadow-sm border-b border-[#11111b] gap-2">
        {onBack && (
          <button onClick={onBack} className="md:hidden text-[#bac2de] hover:text-[#cdd6f4] p-1 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <div className="w-full relative">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('nav.findConversation')} className="w-full px-2 py-1 pl-2 rounded bg-[#11111b] text-[#cdd6f4] text-sm placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7] transition-all" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6c7086] hover:text-[#cdd6f4]"><X size={14} /></button>}
        </div>
      </div>

      <div className="px-2 pt-1.5 md:pt-2">
        <button onClick={() => onSelectDM('')}
          className={`w-full flex items-center gap-2 md:gap-3 px-2 py-1.5 md:py-2 rounded transition-colors text-sm md:text-base ${!selectedDMUserId && !selectedGroupDMId ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#9399b2] hover:bg-[#1e1e2e] hover:text-[#cdd6f4]'}`}>
          <UsersIcon className="w-4 h-4 md:w-5 md:h-5" />
          <span className="font-medium">{t('nav.friends')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 px-2 custom-scrollbar">
        <div className="flex items-center justify-between px-2 mb-1 group">
          <span className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide">{t('nav.directMessages')}</span>
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button onClick={() => setShowUserSearch(true)} className="text-[#a6adc8] hover:text-[#cdd6f4] p-0.5" title={t('dm.startDM')}><MessageSquarePlusIcon size={14} /></button>
            <button onClick={() => setShowCreateCategory(true)} className="text-[#a6adc8] hover:text-[#cdd6f4] p-0.5" title={t('dmCategory.create')}><FolderPlusIcon size={14} /></button>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {categories.map((category) => {
            const categoryUsers = sortedDmUsers.filter((u) => category.dmIds.includes(u.id))
            const categoryGroups = filteredGroupDMs.filter((g) => category.dmIds.includes(g.id))
            const isEmpty = categoryUsers.length === 0 && categoryGroups.length === 0
            return (
              <div key={category.id} className="mb-2">
                <div className="flex items-center gap-1 px-1 py-1 group cursor-pointer" onClick={() => toggleCategoryCollapse(category.id)} onContextMenu={(e) => handleContextMenu(e, 'category', category.id)}>
                  {category.isCollapsed ? <ChevronRightIcon size={12} className="text-[#6c7086]" /> : <ChevronDownIcon size={12} className="text-[#6c7086]" />}
                  {editingCategory === category.id ? (
                    <input type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)}
                      onBlur={() => handleRenameCategory(category.id, editCategoryName)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(category.id, editCategoryName); else if (e.key === 'Escape') setEditingCategory(null) }}
                      onClick={(e) => e.stopPropagation()} autoFocus
                      className="flex-1 bg-[#11111b] text-[#cdd6f4] text-xs px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#cba6f7]" />
                  ) : (
                    <span className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide flex-1">{category.name}</span>
                  )}
                  <span className="text-[10px] text-[#6c7086]">{categoryUsers.length + categoryGroups.length}</span>
                </div>
                {!category.isCollapsed && (
                  <div className="ml-2 space-y-0.5">
                    {categoryGroups.map((group) => renderGroupDM(group))}
                    {categoryUsers.map((user) => renderDMUser(user))}
                    {isEmpty && <p className="text-xs text-[#6c7086] px-2 py-1 italic">Empty category</p>}
                  </div>
                )}
              </div>
            )
          })}

          {uncategorizedGroups.map((group) => renderGroupDM(group))}
          {uncategorizedUsers.map((user) => renderDMUser(user))}

          {sortedDmUsers.length === 0 && filteredGroupDMs.length === 0 && (
            <div className="text-center mt-8">
              <p className="text-sm text-[#6c7086]">{searchQuery ? t('general.noFriendsFound') : t('general.buddyWaiting')}</p>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div className="fixed z-50 bg-[#11111b] rounded-md shadow-xl py-1 w-48 border border-[#181825]" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === 'user' && (
            <>
              <button onClick={() => { togglePin(contextMenu.id); setContextMenu(null) }} className="w-full px-3 py-2 text-left text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white flex items-center gap-2">
                <Pin size={14} />{pinnedDMIds.includes(contextMenu.id) ? 'Unpin DM' : 'Pin DM'}
              </button>
              <div className="h-[1px] bg-[#181825] my-1" />
              <button onClick={() => { moveDM(contextMenu.id, 'up'); setContextMenu(null) }} className="w-full px-3 py-2 text-left text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white flex items-center gap-2"><ArrowUp size={14} />Move Up</button>
              <button onClick={() => { moveDM(contextMenu.id, 'down'); setContextMenu(null) }} className="w-full px-3 py-2 text-left text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white flex items-center gap-2"><ArrowDown size={14} />Move Down</button>
              {categories.length > 0 && (
                <>
                  <div className="h-[1px] bg-[#181825] my-1" />
                  <div className="px-3 py-1 text-xs text-[#6c7086] uppercase">{t('dmCategory.moveToCategory')}</div>
                  <button onClick={() => { moveToCategory(contextMenu.id, null); setContextMenu(null) }} className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-[#313244] flex items-center gap-2"><X size={12} />{t('dmCategory.noCategory')}</button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => { moveToCategory(contextMenu.id, cat.id); setContextMenu(null) }} className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-[#313244] flex items-center gap-2"><FolderIcon size={12} />{cat.name}</button>
                  ))}
                </>
              )}
              <div className="h-[1px] bg-[#181825] my-1" />
              <button onClick={() => { closeDM(contextMenu.id); setContextMenu(null) }} className="w-full px-3 py-2 text-left text-sm text-[#f38ba8] hover:bg-[#f38ba8] hover:text-white flex items-center gap-2"><X size={14} />{t('dm.closeDM')}</button>
            </>
          )}
          {contextMenu.type === 'category' && (
            <>
              <button onClick={() => { const cat = categories.find((c) => c.id === contextMenu.id); if (cat) { setEditingCategory(contextMenu.id); setEditCategoryName(cat.name) } setContextMenu(null) }} className="w-full px-3 py-2 text-left text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white flex items-center gap-2"><PencilIcon size={14} />{t('dmCategory.rename')}</button>
              <button onClick={() => { handleDeleteCategory(contextMenu.id); setContextMenu(null) }} className="w-full px-3 py-2 text-left text-sm text-[#f38ba8] hover:bg-[#f38ba8] hover:text-white flex items-center gap-2"><Trash2Icon size={14} />{t('dmCategory.delete')}</button>
            </>
          )}
        </div>
      )}

      {showUserSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-[#1e1e2e] w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#11111b]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[#cdd6f4] font-bold">{t('dm.startDM')}</h3>
                <button onClick={() => { setShowUserSearch(false); setUserSearchQuery('') }} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={18} /></button>
              </div>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c7086]" />
                <input type="text" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} placeholder={t('dm.searchUsers')} autoFocus className="w-full bg-[#11111b] text-[#cdd6f4] text-sm pl-8 pr-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#cba6f7] placeholder-[#585b70]" />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {userSearchQuery.trim().length === 0 ? (
                <p className="text-center text-[#6c7086] text-sm py-4">Type to search for users</p>
              ) : userSearchResults.length === 0 ? (
                <p className="text-center text-[#6c7086] text-sm py-4">{t('dm.noUsersFound')}</p>
              ) : (
                userSearchResults.map((user) => {
                  const isFriend = friendIds.has(user.id)
                  const { status } = getUserPresence(user.id, user)
                  return (
                    <div key={user.id} onClick={() => startDMWithUser(user)} className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-[#313244]">
                      <UserAvatar user={{ ...user, status }} size="sm" showStatus />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm text-[#cdd6f4] font-medium truncate">{user.displayName || user.username}</p>
                          {isFriend && <span className="text-[8px] text-[#a6e3a1] bg-[#a6e3a1]/10 px-1 rounded">Friend</span>}
                        </div>
                        <p className="text-xs text-[#6c7086] truncate">{user.username}#{user.discriminator}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {connectedVoice && (
        <VoicePanel channelName={connectedVoice.channelName} serverName={connectedVoice.serverName}
          onDisconnect={onDisconnect} isMuted={isMuted} isDeafened={isDeafened}
          onToggleMute={onToggleMute} onToggleDeafen={onToggleDeafen}
          onToggleScreenShare={onToggleScreenShare} onToggleCamera={onToggleCamera}
          isScreenSharing={isScreenSharing} isCameraOn={isCameraOn}
          joinedAt={callStartTime ?? connectedVoice.joinedAt} />
      )}

      <div className="h-[46px] md:h-[52px] bg-[#181825] px-2 flex items-center gap-1.5 md:gap-2 flex-shrink-0 relative">
        <div className="flex items-center gap-2 flex-1 min-w-0 rounded px-1 py-0.5">
          <div onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker) }} className="relative cursor-pointer flex-shrink-0">
            <UserAvatar user={currentUser} size="sm" showStatus />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#cdd6f4] truncate cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onProfileClick?.(e) }}>{currentUser.displayName}</p>
            <p className="text-xs text-[#bac2de] truncate cursor-pointer hover:text-[#cdd6f4] transition-colors" onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker) }}>
              {(currentUser as any).customStatus ? <StatusText text={(currentUser as any).customStatus} /> : `#${currentUser.discriminator}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 md:gap-1">
          <button onClick={onToggleMute} className={`p-1 md:p-1.5 rounded transition-colors ${isMuted || isDeafened ? 'text-[#f38ba8] hover:bg-[#1e1e2e]' : 'text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e]'}`}>
            {isMuted || isDeafened ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
          </button>
          <button onClick={onToggleDeafen} className={`p-1 md:p-1.5 rounded transition-colors relative ${isDeafened ? 'text-[#f38ba8] hover:bg-[#1e1e2e]' : 'text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e]'}`}>
            <HeadphonesIcon className="w-4 h-4" />
            {isDeafened && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-[#f38ba8] rotate-45" />}
          </button>
          <button onClick={onOpenSettings} className="p-1 md:p-1.5 text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e] rounded transition-colors">
            <SettingsIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        {showStatusPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-50">
            <StatusPicker currentStatus={currentUser.status} customStatus={(currentUser as any).customStatus}
              onStatusChange={(s) => { onStatusChange(s); setShowStatusPicker(false) }}
              onCustomStatusChange={onCustomStatusChange} onClose={() => setShowStatusPicker(false)}
              currentUserId={currentUser.id} />
          </div>
        )}
      </div>

      <CreateDMCategoryModal isOpen={showCreateCategory} onClose={() => setShowCreateCategory(false)}
        onCreateCategory={handleCreateCategory} existingNames={categories.map((c) => c.name)} />
    </div>
  )
}

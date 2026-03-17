import React, { useEffect, useState, useRef } from 'react'
import { ServerSidebar } from './components/ServerSidebar'
import { DMSidebar } from './components/DMSidebar'
import { FriendsArea } from './components/FriendsArea'
import { ChannelSidebar } from './components/ChannelSidebar'
import { ChatArea } from './components/ChatArea'
import { MemberList } from './components/MemberList'
import { LoginScreen } from './components/LoginScreen'
import { UserProfilePopup } from './components/UserProfilePopup'
import { SettingsModal } from './components/SettingsModal'
import { CreateServerModal } from './components/CreateServerModal'
import { CreateChannelModal } from './components/CreateChannelModal'
import { CreateCategoryModal } from './components/CreateCategoryModal'
import { ServerSettingsModal } from './components/ServerSettingsModal'
import { ServerProfileEditor } from './components/ServerProfileEditor'
import { VoiceChannelPanel } from './components/VoiceChannelPanel'
import { CreateGroupDMModal } from './components/CreateGroupDMModal'
import { UserAvatar } from './components/UserAvatar'
import { SettingsIcon, ChevronLeftIcon } from 'lucide-react'
import { auth, rtdb } from './lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbServerTimestamp, get } from 'firebase/database'
import { db, syncChannel, StoredUser, VoiceState } from './lib/database'
import { voiceManager } from './lib/voiceManager'
import type { RemoteStream } from './lib/voiceManager'

export interface Member {
  id: string
  username: string
  discriminator: string
  displayName: string
  avatar?: string
  avatarColor: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
  roles: string[]
  joinedAt: Date
  email: string
  phone?: string
  banner?: string
  bannerColor?: string
  customStatus?: string
  aboutMe?: string
}

export interface Message {
  id: string
  content: string
  author: Member
  timestamp: Date
  attachments?: { name: string; size: number; url: string; type: string }[]
  voiceMessage?: { url: string; duration: number }
  reactions?: Record<string, { emoji: string; userIds: string[]; userAvatars?: Record<string, string> }>
  replyTo?: { messageId: string; content: string; authorName: string; authorAvatar?: string }
}

export interface Channel {
  id: string
  name: string
  type: 'text' | 'voice'
  description?: string
  userLimit?: number
}

export interface Server {
  id: string
  name: string
  icon?: string
  channels: Channel[]
  members: Member[]
}

export interface ConnectedVoiceState {
  channelId: string
  channelName: string
  serverId: string
  serverName: string
  joinedAt: number
}

function storedUserToMember(u: StoredUser): Member {
  return {
    id: u.id, username: u.username, discriminator: u.discriminator,
    displayName: u.displayName, avatar: u.avatar, avatarColor: u.avatarColor,
    status: u.status, roles: u.roles ?? [],
    joinedAt: u.joinedAt instanceof Date ? u.joinedAt : new Date(u.joinedAt),
    email: u.email ?? '', phone: u.phone, banner: u.banner,
    bannerColor: u.bannerColor, customStatus: u.customStatus, aboutMe: u.aboutMe,
  }
}

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [servers, setServers] = useState<Server[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [dmSelection, setDmSelection] = useState<{ type: 'user' | 'group'; id: string } | null>(null)
  const [view, setView] = useState<'home' | 'server'>('home')
  const [mobilePanel, setMobilePanel] = useState<'servers' | 'channels' | 'chat'>('chat')
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const selectedDMUserId = dmSelection?.type === 'user' ? dmSelection.id : null
  const selectedGroupDMId = dmSelection?.type === 'group' ? dmSelection.id : null
  const [connectedVoice, setConnectedVoice] = useState<ConnectedVoiceState | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const [showMemberList, setShowMemberList] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateServer, setShowCreateServer] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [showServerSettings, setShowServerSettings] = useState(false)
  const [showServerProfileEditor, setShowServerProfileEditor] = useState(false)
  const [activeProfile, setActiveProfile] = useState<{ member: Member; position: { x: number; y: number } } | null>(null)
  const [selectedVoiceChannelId, setSelectedVoiceChannelId] = useState<string | null>(null)
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<string | null>(null)
  const [voiceStates, setVoiceStates] = useState<VoiceState[]>([])
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null)
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null)
  const [localStreamStream, setLocalStreamStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set())
  const [showCreateGroupDM, setShowCreateGroupDM] = useState(false)
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({})
  // ✅ unread DM counts per contextId
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  // ✅ active voice calls per DM userId
  const [dmVoiceStates, setDmVoiceStates] = useState<Record<string, 'calling' | 'in_call'>>({})

  const currentMember: Member | null = currentUser ? storedUserToMember(currentUser) : null
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastManualStatusRef = useRef<'online' | 'idle' | 'dnd' | 'offline'>('online')

  const [serverBarPosition, setServerBarPosition] = useState<'left' | 'right'>(() => {
    try { const s = localStorage.getItem('teamup_server_bar_position'); if (s === 'left' || s === 'right') return s } catch {}
    return 'left'
  })

  // ── Firebase Auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await db.getUser(firebaseUser.uid)
        if (profile) {
          setCurrentUser(profile)
          setIsLoggedIn(true)
        }
      } else {
        setIsLoggedIn(false)
        setCurrentUser(null)
      }
      setAuthChecked(true)
    })
    return () => unsubscribe()
  }, [])

  // ── Presence System (Realtime Database) ──────────────────────────────────
  useEffect(() => {
    if (!currentUser) return

    const uid = currentUser.id
    const presenceRef = ref(rtdb, `presence/${uid}`)

    // ✅ لو الـ status مش offline → احفظه كـ lastManualStatus في الـ ref والـ Firestore
    if (currentUser.status !== 'offline') {
      lastManualStatusRef.current = currentUser.status
    }

    const getStatus = async (): Promise<'online' | 'idle' | 'dnd'> => {
      // أولوية: 1) ref (لو في نفس الـ session) 2) Firestore lastManualStatus 3) online
      if (lastManualStatusRef.current && lastManualStatusRef.current !== 'offline') {
        return lastManualStatusRef.current as 'online' | 'idle' | 'dnd'
      }
      // جيب من Firestore
      const freshProfile = await db.getUser(uid)
      const saved = (freshProfile as any)?.lastManualStatus
      if (saved && saved !== 'offline') return saved as 'online' | 'idle' | 'dnd'
      return 'online'
    }

    const goOnline = async () => {
      const status = await getStatus()
      lastManualStatusRef.current = status
      const now = Date.now()
      // حدّث الـ RTDB
      await set(presenceRef, { status, lastSeen: now })
      // جيب الـ profile كامل من Firestore
      const freshProfile = await db.getUser(uid)
      const updatedUser = freshProfile ? { ...freshProfile, status } : { ...currentUser, status }
      await db.saveUser(updatedUser)
      setCurrentUser(updatedUser)
      syncChannel.postMessage({ type: 'users_updated' })
    }

    // ✅ Firebase هيعمل offline تلقائياً لما الـ connection تنقطع
    onDisconnect(presenceRef)
      .set({ status: 'offline', lastSeen: Date.now() })
      .then(() => goOnline())

    // ✅ Heartbeat كل 20 ثانية - بيبعت دايماً بغض النظر عن visibility
    const heartbeatInterval = setInterval(async () => {
      const currentStatus = await getStatus() // ✅ await عشان getStatus async
      await set(presenceRef, { status: currentStatus, lastSeen: Date.now() })
    }, 20000)

    // ✅ مفيش staleCheckInterval - شيلناه خالص
    // Firebase onDisconnect بيعمل offline تلقائياً لما الـ connection تنقطع
    const staleCheckInterval = null

    // ✅ اسمع على تغييرات الـ RTDB
    // ✅ شيلنا الـ listener على presenceRef بتاع نفسنا
    // لأنه كان بيخلي الشخص offline لو goOnline أبطأ من الـ onDisconnect
    // Firebase onDisconnect هو اللي يعمل offline تلقائياً
    const unsubPresence = () => {} // no-op

    // ✅ لما يرجع يفتح التاب → يرجع للـ status بتاعه
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await goOnline()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(heartbeatInterval)
      // staleCheckInterval = null فمش محتاج clearInterval
      unsubPresence()
    }
  }, [currentUser?.id])

  // ── Server bar position sync ──────────────────────────────────────────────
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'teamup_server_bar_position') {
        const val = e.newValue
        if (val === 'left' || val === 'right') setServerBarPosition(val)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const channelCallStartTime = connectedVoice ? db.getChannelCallStartTime(connectedVoice.channelId) : null

  // ── Load servers ──────────────────────────────────────────────────────────
  const refreshData = async () => {
    if (!currentUser) return
    const userServers = await db.getServers(currentUser.id)
    setServers(userServers)
    const vs = await db.getVoiceStates()
    setVoiceStates(vs)
  }

  useEffect(() => {
    if (currentUser) refreshData()
  }, [currentUser])

  // ── Firebase Realtime subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return

    // ✅ Subscribe واحد على الـ RTDB presence للكل
    const presenceRef = ref(rtdb, 'presence')
    const unsubPresenceMap = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val() || {}
      const map: Record<string, string> = {}
      Object.entries(data).forEach(([uid, val]: [string, any]) => {
        map[uid] = val?.status || 'offline'
      })
      setPresenceMap(map)
      // ✅ sync الـ Firestore مع الـ RTDB بدون delay
      // بس بعمل ده بشكل async خفيف عشان ميأثرش على الـ UI
      Object.entries(data).forEach(async ([userId, val]: [string, any]) => {
        if (userId === currentUser?.id) return // نفسنا بيتعمل في presence effect
        const rtdbStatus = val?.status || 'offline'
        // update الـ servers cache بدون Firestore write عشان نقلل الـ latency
      })
    })

    const unsubVoice = db.subscribeToVoiceStates((states) => {
      setVoiceStates(states)
    })

    const handleSync = (event: MessageEvent) => {
      const { type, contextId } = event.data
      if (['servers_updated', 'users_updated', 'categories_updated', 'roles_updated',
           'server_profiles_updated', 'voice_updated', 'group_dms_updated'].includes(type)) {
        refreshData()
      }
      if (type === 'messages_updated' && contextId) {
        db.getMessages(contextId).then((msgs) => {
          setMessages((prev) => {
            const prevMsgs = prev[contextId] || []
            // ✅ لو في رسايل جديدة ومش في نفس الـ context → زود الـ unread count
            if (msgs.length > prevMsgs.length) {
              const isCurrentContext =
                (view === 'server' && selectedChannelId === contextId) ||
                (view === 'home' && currentUser && (
                  db.getDMChannelId(currentUser.id, selectedDMUserId || '') === contextId ||
                  db.getGroupDMChannelId(selectedGroupDMId || '') === contextId
                ))
              if (!isCurrentContext) {
                setUnreadCounts((prev) => ({ ...prev, [contextId]: (prev[contextId] || 0) + (msgs.length - prevMsgs.length) }))
              }
            }
            return { ...prev, [contextId]: msgs }
          })
        })
      }
      if (type === 'friends_updated') {
        syncChannel.postMessage({ type: 'friends_updated' })
      }
    }
    syncChannel.addEventListener('message', handleSync)

    return () => {
      unsubVoice()
      unsubPresenceMap()
      syncChannel.removeEventListener('message', handleSync)
    }
  }, [currentUser])

  // ── Load messages with Firebase realtime ──────────────────────────────────
  useEffect(() => {
    if (!currentUser) return

    let contextId = ''
    if (view === 'server' && selectedChannelId) contextId = selectedChannelId
    else if (view === 'home' && selectedGroupDMId) contextId = db.getGroupDMChannelId(selectedGroupDMId)
    else if (view === 'home' && selectedDMUserId) contextId = db.getDMChannelId(currentUser.id, selectedDMUserId)

    if (!contextId) return

    const unsub = db.subscribeToMessages(contextId, (msgs) => {
      setMessages((prev) => ({ ...prev, [contextId]: msgs }))
    })

    return () => unsub()
  }, [selectedServerId, selectedChannelId, dmSelection, view, currentUser])

  // ── Voice manager callbacks ───────────────────────────────────────────────
  useEffect(() => {
    voiceManager.setCallbacks({
      onRemoteStreamsChange: (streams) => setRemoteStreams(streams),
      onScreenShareStopped: () => { setIsScreenSharing(false); setLocalScreenStream(null) },
      onCameraStopped: () => { setIsCameraOn(false); setLocalCameraStream(null) },
      onStreamingChange: (streaming) => { setIsStreaming(streaming); if (!streaming) setLocalStreamStream(null) },
      onSpeakingChange: async (isSpeaking: boolean) => {
        if (currentUser) await db.setSpeakingState(currentUser.id, isSpeaking)
      },
    })
    return () => voiceManager.setCallbacks({})
  }, [currentUser])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = (user: StoredUser) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  const handleLogout = async () => {
    // عند logout → offline
    if (currentUser) {
      await db.saveUser({ ...currentUser, status: 'offline' })
    }
    await signOut(auth)
    setIsLoggedIn(false)
    setCurrentUser(null)
    setServers([])
    setSelectedServerId(null)
    setView('home')
  }

  const handleCreateServer = async (name: string, icon?: string) => {
    if (!currentUser || !currentMember) return
    const newServer: Server = {
      id: crypto.randomUUID(), name, icon,
      channels: [
        { id: crypto.randomUUID(), name: 'general', type: 'text', description: 'General chat' },
        { id: crypto.randomUUID(), name: 'voice-chat', type: 'voice' },
      ],
      members: [currentMember],
    }
    await db.saveServer(newServer, currentUser.id)
    await db.addServerMember(newServer.id, currentUser.id)
    await db.saveCategory(newServer.id, { id: crypto.randomUUID(), name: 'Text Channels', position: 0, channelIds: [newServer.channels[0].id] })
    await db.saveCategory(newServer.id, { id: crypto.randomUUID(), name: 'Voice Channels', position: 1, channelIds: [newServer.channels[1].id] })
    await refreshData()
    setSelectedServerId(newServer.id)
    setSelectedChannelId(newServer.channels[0].id)
    setView('server')
    setMobilePanel('chat')
    setShowCreateServer(false)
  }

  const handleJoinServer = async (code: string): Promise<boolean> => {
    if (!currentUser) return false
    const server = await db.useInvite(code, currentUser.id)
    if (server) {
      await refreshData()
      setSelectedServerId(server.id)
      const firstChannel = server.channels.find((c) => c.type === 'text')
      setSelectedChannelId(firstChannel?.id || null)
      setView('server'); setMobilePanel('chat')
      return true
    }
    return false
  }

  const handleUpdateServer = async (serverId: string, updates: Partial<Server>) => {
    const server = servers.find((s) => s.id === serverId)
    if (server && currentUser) { await db.saveServer({ ...server, ...updates }, currentUser.id); await refreshData() }
  }

  const handleDeleteServer = async (serverId: string) => {
    await db.deleteServer(serverId)
    if (selectedServerId === serverId) { setSelectedServerId(null); setView('home') }
    await refreshData()
  }

  const handleSendMessage = async (content: string, attachments?: { name: string; size: number; url: string; type: string }[], voiceMessage?: { url: string; duration: number }, replyTo?: { messageId: string; content: string; authorName: string; authorAvatar?: string }) => {
    if (!currentUser || !currentMember) return
    let contextId = ''
    if (view === 'server' && selectedChannelId) contextId = selectedChannelId
    else if (view === 'home' && selectedGroupDMId) contextId = db.getGroupDMChannelId(selectedGroupDMId)
    else if (view === 'home' && selectedDMUserId) contextId = db.getDMChannelId(currentUser.id, selectedDMUserId)
    else return

    // ✅ تأكد إن مفيش base64 كبير في الـ attachments قبل الحفظ
    const safeAttachments = attachments?.map((att) => {
      if (att.url?.startsWith('data:') && att.url.length > 500 * 1024) {
        console.error('[handleSendMessage] Large base64 detected - should have been uploaded to Cloudinary first!')
        return { ...att, url: '' } // منع الحفظ
      }
      return att
    })

    const newMessage: Message = { id: crypto.randomUUID(), content, author: currentMember, timestamp: new Date(), attachments: safeAttachments, voiceMessage, ...(replyTo ? { replyTo } : {}) }
    // ✅ optimistic update بس لو مفيش base64 كبير
    const hasLargeBase64 = safeAttachments?.some((att) => att.url === '')
    if (!hasLargeBase64) {
      setMessages((prev) => ({ ...prev, [contextId]: [...(prev[contextId] || []), newMessage] }))
    }
    await db.saveMessage(contextId, newMessage)
  }

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentUser) return
    let contextId = ''
    if (view === 'server' && selectedChannelId) contextId = selectedChannelId
    else if (view === 'home' && selectedGroupDMId) contextId = db.getGroupDMChannelId(selectedGroupDMId)
    else if (view === 'home' && dmSelection) contextId = db.getDMChannelId(currentUser.id, dmSelection.id)
    else return
    await db.updateMessage(contextId, messageId, newContent)
    setMessages((prev) => ({ ...prev, [contextId]: prev[contextId]?.map((m) => m.id === messageId ? { ...m, content: newContent } : m) || [] }))
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return
    let contextId = ''
    if (view === 'server' && selectedChannelId) contextId = selectedChannelId
    else if (view === 'home' && selectedGroupDMId) contextId = db.getGroupDMChannelId(selectedGroupDMId)
    else if (view === 'home' && selectedDMUserId) contextId = db.getDMChannelId(currentUser.id, selectedDMUserId)
    else return
    await db.deleteMessage(contextId, messageId)
    setMessages((prev) => ({ ...prev, [contextId]: prev[contextId]?.filter((m) => m.id !== messageId) || [] }))
  }

  const handleCreateChannel = async (name: string, type: 'text' | 'voice', userLimit?: number) => {
    if (!selectedServerId) return
    const server = servers.find((s) => s.id === selectedServerId)
    if (!server || !currentUser) return
    const newChannelId = crypto.randomUUID()
    const newChannel: Channel = { id: newChannelId, name, type, ...(type === 'voice' && userLimit ? { userLimit } : {}) }
    const updatedServer = { ...server, channels: [...server.channels, newChannel] }
    await db.saveServer(updatedServer, currentUser.id)
    if (createChannelCategoryId) {
      const categories = await db.getCategories(selectedServerId)
      const category = categories.find((c) => c.id === createChannelCategoryId)
      if (category) await db.saveCategory(selectedServerId, { ...category, channelIds: [...category.channelIds, newChannelId] })
      setCreateChannelCategoryId(null)
    }
    await refreshData()
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!selectedServerId || !currentUser) return
    if (!confirm('Are you sure you want to delete this channel?')) return
    await db.deleteChannel(channelId)
    if (selectedChannelId === channelId) setSelectedChannelId(null)
    if (selectedVoiceChannelId === channelId) setSelectedVoiceChannelId(null)
    await refreshData()
  }

  const handleCreateCategory = async (name: string) => {
    if (!selectedServerId) return
    const categories = await db.getCategories(selectedServerId)
    await db.saveCategory(selectedServerId, { id: crypto.randomUUID(), name, position: categories.length, channelIds: [] })
    await refreshData()
  }

  const handleStatusChange = async (status: 'online' | 'idle' | 'dnd' | 'offline') => {
    if (!currentUser) return
    // ✅ احفظ الـ status - لو offline نحتفظ بالـ status القديم عشان نرجعله
    const manualStatus = status === 'offline' ? (lastManualStatusRef.current || 'online') : status
    lastManualStatusRef.current = manualStatus
    const updated = { ...currentUser, status, ...(status !== 'offline' && { lastManualStatus: status }) }
    setCurrentUser(updated)
    await db.saveUser(updated as any)
    // ✅ حدّث الـ RTDB بالـ status الجديد فوراً
    const presenceRef = ref(rtdb, `presence/${currentUser.id}`)
    await set(presenceRef, { status, lastSeen: rtdbServerTimestamp() })
    syncChannel.postMessage({ type: 'users_updated' })
  }

  const handleCustomStatusChange = async (text: string) => {
    if (!currentUser) return
    const updated = { ...currentUser, customStatus: text }
    setCurrentUser(updated)
    await db.saveUser(updated)
  }

  const handleCreateGroupDM = async (name: string, memberIds: string[]) => {
    if (!currentUser) return
    const groupDM = { id: crypto.randomUUID(), name, memberIds, createdBy: currentUser.id, createdAt: Date.now() }
    await db.saveGroupDM(groupDM)
    setDmSelection({ type: 'group', id: groupDM.id })
    setMobilePanel('chat')
    setShowCreateGroupDM(false)
  }

  const handleJoinVoice = async (channel: Channel, serverId: string, serverName: string) => {
    if (!currentUser) return
    if (connectedVoice?.channelId === channel.id) return
    if (channel.userLimit && channel.userLimit > 0) {
      const currentUsers = voiceStates.filter((s) => s.channelId === channel.id && s.serverId === serverId)
      if (currentUsers.length >= channel.userLimit) { alert(`This voice channel is full (${channel.userLimit}/${channel.userLimit})`); return }
    }
    if (connectedVoice) handleLeaveVoice()
    try {
      const stream = await voiceManager.join(currentUser.id, serverId, channel.id)
      mediaStreamRef.current = stream
      voiceManager.setMuted(isMuted); voiceManager.setDeafened(isDeafened)
      setConnectedVoice({ channelId: channel.id, channelName: channel.name, serverId, serverName, joinedAt: Date.now() })
      setSelectedVoiceChannelId(channel.id)
      setIsScreenSharing(false); setIsCameraOn(false); setIsStreaming(false); setLocalCameraStream(null); setLocalScreenStream(null); setLocalStreamStream(null)
      setRemoteStreams([]); setMutedUserIds(new Set())
      await db.setVoiceState({ userId: currentUser.id, serverId, channelId: channel.id, isMuted, isDeafened, joinedAt: Date.now() })
    } catch (err) { console.error('Failed to join voice channel:', err) }
  }

  const handleLeaveVoice = async () => {
    if (!currentUser) return
    voiceManager.leave()
    mediaStreamRef.current = null
    setConnectedVoice(null); setSelectedVoiceChannelId(null)
    setIsScreenSharing(false); setIsCameraOn(false); setIsStreaming(false); setLocalCameraStream(null); setLocalScreenStream(null); setLocalStreamStream(null)
    setRemoteStreams([]); setMutedUserIds(new Set())
    await db.removeVoiceState(currentUser.id)
  }

  const handleToggleMute = async () => {
    const newMuted = !isMuted
    setIsMuted(newMuted); voiceManager.setMuted(newMuted)
    if (connectedVoice && currentUser) await db.setVoiceState({ userId: currentUser.id, serverId: connectedVoice.serverId, channelId: connectedVoice.channelId, isMuted: newMuted, isDeafened, joinedAt: Date.now() })
  }

  const handleToggleDeafen = async () => {
    const newDeafened = !isDeafened
    setIsDeafened(newDeafened); voiceManager.setDeafened(newDeafened)
    if (newDeafened && !isMuted) { setIsMuted(true); voiceManager.setMuted(true) }
    else if (!newDeafened && isMuted && isDeafened) { setIsMuted(false); voiceManager.setMuted(false) }
    if (connectedVoice && currentUser) await db.setVoiceState({ userId: currentUser.id, serverId: connectedVoice.serverId, channelId: connectedVoice.channelId, isMuted: isMuted || newDeafened, isDeafened: newDeafened, joinedAt: Date.now() })
  }

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) { voiceManager.stopScreenShare(); setIsScreenSharing(false); setLocalScreenStream(null) }
    else { const s = await voiceManager.startScreenShare(); if (s) { setIsScreenSharing(true); setLocalScreenStream(s) } }
  }

  const handleToggleCamera = async () => {
    if (isCameraOn) { voiceManager.stopCamera(); setIsCameraOn(false); setLocalCameraStream(null) }
    else { const s = await voiceManager.startCamera(); if (s) { setIsCameraOn(true); setLocalCameraStream(s) } }
  }

  const handleToggleStreaming = async () => {
    if (isStreaming) { voiceManager.stopStream(); setIsStreaming(false); setLocalStreamStream(null) }
    else { const s = await voiceManager.startStream(); if (s) { setIsStreaming(true); setLocalStreamStream(s) } }
  }

  const handleMuteUser = (userId: string) => { voiceManager.mutePeer(userId); setMutedUserIds((prev) => new Set([...prev, userId])) }
  const handleUnmuteUser = (userId: string) => { voiceManager.unmutePeer(userId); setMutedUserIds((prev) => { const n = new Set(prev); n.delete(userId); return n }) }

  const handleStartDMCall = async (targetUserId: string, withVideo: boolean = false) => {
    if (!currentUser || !targetUserId) return
    const dmChannelId = db.getDMChannelId(currentUser.id, targetUserId)
    const callChannelId = `dm_voice_${dmChannelId}`
    if (connectedVoice?.channelId === callChannelId) return
    if (connectedVoice) handleLeaveVoice()
    const targetUser = await db.getUser(targetUserId)
    setConnectedVoice({ channelId: callChannelId, channelName: targetUser?.displayName || 'User', serverId: 'dm', serverName: 'Direct Message', joinedAt: Date.now() })
    setIsScreenSharing(false); setIsCameraOn(false); setIsStreaming(false); setLocalCameraStream(null); setLocalScreenStream(null); setLocalStreamStream(null)
    setRemoteStreams([]); setMutedUserIds(new Set())
    await db.setVoiceState({ userId: currentUser.id, serverId: 'dm', channelId: callChannelId, isMuted, isDeafened, joinedAt: Date.now() })
    try {
      const stream = await voiceManager.join(currentUser.id, 'dm', callChannelId)
      mediaStreamRef.current = stream
      voiceManager.setMuted(isMuted); voiceManager.setDeafened(isDeafened)
      if (withVideo) { const camStream = await voiceManager.startCamera(); if (camStream) { setIsCameraOn(true); setLocalCameraStream(camStream) } }
    } catch (err) { console.error('Failed DM call:', err) }
  }

  const handleProfileClick = (member: Member, e: React.MouseEvent) => {
    // ✅ استخدم موقع الماوس الفعلي بدل الـ element position
    setActiveProfile({ member, position: { x: e.clientX, y: e.clientY } })
  }

  const handleSelectVoiceChannel = (channel: Channel) => {
    setSelectedVoiceChannelId(channel.id)
    setMobilePanel('chat')
    if (connectedVoice?.channelId !== channel.id && selectedServer) handleJoinVoice(channel, selectedServer.id, selectedServer.name)
  }

  const selectedServer = servers.find((s) => s.id === selectedServerId)
  const selectedChannel = selectedServer?.channels.find((c) => c.id === selectedChannelId)
  const selectedVoiceChannel = selectedServer?.channels.find((c) => c.id === selectedVoiceChannelId && c.type === 'voice')
  const showVoicePanel = view === 'server' && selectedVoiceChannelId && selectedVoiceChannel && connectedVoice?.channelId === selectedVoiceChannelId

  let currentMessages: Message[] = []
  if (view === 'server' && selectedChannelId) currentMessages = messages[selectedChannelId] || []
  else if (view === 'home' && selectedGroupDMId && currentUser) currentMessages = messages[db.getGroupDMChannelId(selectedGroupDMId)] || []
  else if (view === 'home' && dmSelection && currentUser) currentMessages = messages[db.getDMChannelId(currentUser.id, dmSelection.id)] || []

  const currentVoiceUsers = showVoicePanel && selectedVoiceChannel
    ? voiceStates.filter((vs) => vs.channelId === selectedVoiceChannel.id && vs.serverId === selectedServer?.id)
        .map((vs) => selectedServer?.members.find((m) => m.id === vs.userId)).filter(Boolean) as Member[]
    : []

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#181825]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#cba6f7] flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <p className="text-[#6c7086] text-sm">Loading Team UP...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn || !currentUser || !currentMember) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="flex flex-row h-screen w-full bg-[#1e1e2e] overflow-hidden font-sans antialiased text-[#cdd6f4]">
      {serverBarPosition !== 'right' && (
        <div className={`${mobilePanel === 'servers' ? 'fixed inset-0 z-50 flex' : 'hidden'} md:relative md:z-auto md:flex`}>
          <ServerSidebar servers={servers} selectedServer={selectedServer || null}
            onSelectServer={(server) => { setSelectedServerId(server.id); const ft = server.channels.find((c) => c.type === 'text'); setSelectedChannelId(ft?.id || null); setSelectedVoiceChannelId(null); setView('server'); setMobilePanel('channels') }}
            onSelectHome={() => { setSelectedServerId(null); setView('home'); setDmSelection(null); setSelectedVoiceChannelId(null); setMobilePanel('channels') }}
            isHomeSelected={view === 'home'} onCreateServer={() => setShowCreateServer(true)} onJoinServer={handleJoinServer} />
        </div>
      )}

      <div className={`flex-1 flex min-h-0 min-w-0 ${mobilePanel === 'chat' ? 'pb-12 md:pb-0' : ''}`}>
        <div className="flex-1 flex min-h-0">
          {view === 'home' ? (
            <>
              <div className={`${mobilePanel === 'channels' ? 'fixed inset-0 z-40 flex' : 'hidden'} md:relative md:z-auto md:flex`}>
                <DMSidebar currentUser={currentMember} presenceMap={presenceMap} onOpenSettings={() => setShowSettings(true)}
                  isMuted={isMuted} isDeafened={isDeafened} onToggleMute={handleToggleMute} onToggleDeafen={handleToggleDeafen}
                  connectedVoice={connectedVoice} onDisconnect={handleLeaveVoice}
                  onToggleScreenShare={handleToggleScreenShare} onToggleCamera={handleToggleCamera}
                  onToggleStreaming={handleToggleStreaming} isScreenSharing={isScreenSharing}
                  isCameraOn={isCameraOn} isStreaming={isStreaming}
                  onProfileClick={(e) => handleProfileClick(currentMember, e)} selectedDMUserId={selectedDMUserId}
                  onSelectDM={(userId) => {
                    setDmSelection(userId ? { type: 'user', id: userId } : null)
                    if (userId && currentUser) {
                      const ctxId = db.getDMChannelId(currentUser.id, userId)
                      setUnreadCounts((prev) => ({ ...prev, [ctxId]: 0 }))
                    }
                    if (userId) setMobilePanel('chat')
                  }}
                  onStatusChange={handleStatusChange} onCustomStatusChange={handleCustomStatusChange}
                  onToggleScreenShare={handleToggleScreenShare} onToggleCamera={handleToggleCamera}
                  isScreenSharing={isScreenSharing} isCameraOn={isCameraOn} callStartTime={channelCallStartTime}
                  onCreateGroupDM={() => setShowCreateGroupDM(true)} selectedGroupDMId={selectedGroupDMId}
                  onSelectGroupDM={(id) => { setDmSelection(id ? { type: 'group', id } : null); if (id) setMobilePanel('chat') }}
                  onBack={() => setMobilePanel('servers')}
                  unreadCounts={unreadCounts}
                  voiceStates={voiceStates}
                  currentUserId={currentUser.id} />
              </div>
              {!selectedDMUserId && !selectedGroupDMId ? (
                <div className={`${mobilePanel === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-0`}>
                  <FriendsArea currentUser={currentMember} presenceMap={presenceMap} onStartDM={(userId) => { setDmSelection({ type: 'user', id: userId }); setMobilePanel('chat') }} onMemberClick={handleProfileClick}
                    onStartVoiceCall={(userId, withVideo) => { setDmSelection({ type: 'user', id: userId }); handleStartDMCall(userId, withVideo || false); setMobilePanel('chat') }}
                    onOpenMobileMenu={() => setMobilePanel('channels')} />
                </div>
              ) : selectedDMUserId ? (
                <div className={`${mobilePanel === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-0`}>
                  {/* ✅ دايماً بيظهر الـ chat، لو في call بيظهر الـ call panel فوقيه */}
                  <div className="flex flex-col flex-1 min-w-0 min-h-0">
                    {/* Call panel - بيظهر فوق الـ chat لما يكون في DM call */}
                    {connectedVoice && connectedVoice.serverId === 'dm' && (
                      <div className="h-[280px] flex-shrink-0 border-b border-[#1e1f22]">
                        <VoiceChannelPanel
                          channel={{ id: connectedVoice.channelId, name: 'Voice Call', type: 'voice' }}
                          serverName="Direct Message" currentUser={currentMember}
                          connectedUsers={(() => {
                            const inCall = voiceStates.filter(vs => vs.channelId === connectedVoice.channelId).map(vs => servers.flatMap(s => s.members).find(m => m.id === vs.userId)).filter(Boolean) as Member[]
                            return inCall.length > 0 ? inCall : [currentMember]
                          })()}
                          isMuted={isMuted} isDeafened={isDeafened}
                          onToggleMute={handleToggleMute} onToggleDeafen={handleToggleDeafen} onDisconnect={handleLeaveVoice}
                          onToggleScreenShare={handleToggleScreenShare} onToggleCamera={handleToggleCamera}
                          onToggleStreaming={handleToggleStreaming} isScreenSharing={isScreenSharing}
                          isCameraOn={isCameraOn} isStreaming={isStreaming}
                          localCameraStream={localCameraStream} localScreenStream={localScreenStream}
                          localStreamStream={localStreamStream}
                          remoteStreams={remoteStreams} mutedUserIds={mutedUserIds}
                          isDMCall={true}
                          pendingUsers={(() => { const u = servers.flatMap(s => s.members).find(m => m.id === selectedDMUserId); return u ? [u] : [] })()}
                          onOpenMobileMenu={() => setMobilePanel('channels')} />
                      </div>
                    )}
                    {/* Chat - دايماً ظاهر */}
                    <ChatArea channel={{ id: db.getDMChannelId(currentUser.id, selectedDMUserId), name: 'DM', type: 'text' }}
                      messages={currentMessages} onSendMessage={handleSendMessage} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage}
                      currentUser={currentMember} onMemberClick={handleProfileClick} showMemberList={false} onToggleMemberList={() => {}} isDM={true}
                      onStartCall={(withVideo) => handleStartDMCall(selectedDMUserId!, withVideo)} dmUserId={selectedDMUserId}
                        dmUser={servers.flatMap(s => s.members).find(m => m.id === selectedDMUserId) || undefined}
                        presenceMap={presenceMap}
                        onOpenMobileMenu={() => setMobilePanel('channels')} />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {selectedServer && (
                <div className={`${mobilePanel === 'channels' ? 'fixed inset-0 z-40 flex' : 'hidden'} md:relative md:z-auto md:flex`}>
                  <ChannelSidebar server={selectedServer} selectedChannel={selectedChannel || null}
                    onSelectChannel={(ch) => { setSelectedChannelId(ch.id); setSelectedVoiceChannelId(null); setMobilePanel('chat') }}
                    currentUser={currentMember} onOpenSettings={() => setShowSettings(true)}
                    onAddChannel={(catId?) => { setCreateChannelCategoryId(catId || null); setShowCreateChannel(true) }}
                    onDeleteChannel={handleDeleteChannel} onOpenServerSettings={() => setShowServerSettings(true)}
                    onCreateCategory={() => setShowCreateCategory(true)} onEditServerProfile={() => setShowServerProfileEditor(true)}
                    connectedVoice={connectedVoice}
                    onJoinVoice={(ch) => { handleJoinVoice(ch, selectedServer.id, selectedServer.name); setSelectedVoiceChannelId(ch.id); setSelectedChannelId(null) }}
                    onLeaveVoice={handleLeaveVoice} isMuted={isMuted} isDeafened={isDeafened}
                    onToggleMute={handleToggleMute} onToggleDeafen={handleToggleDeafen}
                    onProfileClick={(e) => handleProfileClick(currentMember, e)} onMemberClick={handleProfileClick}
                    onStatusChange={handleStatusChange} onCustomStatusChange={handleCustomStatusChange}
                    selectedVoiceChannelId={selectedVoiceChannelId} onSelectVoiceChannel={handleSelectVoiceChannel}
                    onDeleteServer={() => handleDeleteServer(selectedServer.id)} voiceStates={voiceStates}
                    onToggleScreenShare={handleToggleScreenShare} onToggleCamera={handleToggleCamera}
                    isScreenSharing={isScreenSharing} isCameraOn={isCameraOn} callStartTime={channelCallStartTime}
                    onUpdateChannelLimit={async (channelId, limit) => {
                      const srv = servers.find((s) => s.id === selectedServerId)
                      if (!srv || !currentUser) return
                      await db.saveServer({ ...srv, channels: srv.channels.map((c) => c.id === channelId ? { ...c, userLimit: limit } : c) }, currentUser.id)
                      await refreshData()
                    }}
                    onBack={() => setMobilePanel('servers')} />
                </div>
              )}
              <div className={`${mobilePanel === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-0`}>
                {showVoicePanel && selectedServer ? (
                  <VoiceChannelPanel channel={selectedVoiceChannel!} serverName={selectedServer.name} currentUser={currentMember}
                    connectedUsers={currentVoiceUsers} isMuted={isMuted} isDeafened={isDeafened}
                    onToggleMute={handleToggleMute} onToggleDeafen={handleToggleDeafen} onDisconnect={handleLeaveVoice}
                    onMemberClick={handleProfileClick} onToggleScreenShare={handleToggleScreenShare} onToggleCamera={handleToggleCamera}
                    onMuteUser={handleMuteUser} onUnmuteUser={handleUnmuteUser}
                    isScreenSharing={isScreenSharing} isCameraOn={isCameraOn}
                    localCameraStream={localCameraStream} localScreenStream={localScreenStream}
                    remoteStreams={remoteStreams} mutedUserIds={mutedUserIds}
                    onOpenMobileMenu={() => setMobilePanel('channels')} />
                ) : (
                  <ChatArea channel={selectedChannel || null} messages={currentMessages}
                    onSendMessage={handleSendMessage} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage}
                    currentUser={currentMember} onMemberClick={handleProfileClick}
                    showMemberList={showMemberList} onToggleMemberList={() => setShowMemberList(!showMemberList)}
                    serverId={selectedServerId || undefined} serverMembers={selectedServer?.members}
                    onOpenMobileMenu={() => setMobilePanel('channels')} />
                )}
                {showMemberList && selectedServer && !showVoicePanel && (
                  <div className="hidden lg:flex">
                    <MemberList members={selectedServer.members} currentUser={currentMember} onMemberClick={handleProfileClick} serverId={selectedServerId || undefined} presenceMap={presenceMap} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {serverBarPosition === 'right' && (
        <div className={`${mobilePanel === 'servers' ? 'fixed inset-0 z-50 flex' : 'hidden'} md:relative md:z-auto md:flex`}>
          <ServerSidebar servers={servers} selectedServer={selectedServer || null}
            onSelectServer={(server) => { setSelectedServerId(server.id); const ft = server.channels.find((c) => c.type === 'text'); setSelectedChannelId(ft?.id || null); setSelectedVoiceChannelId(null); setView('server'); setMobilePanel('channels') }}
            onSelectHome={() => { setSelectedServerId(null); setView('home'); setDmSelection(null); setSelectedVoiceChannelId(null); setMobilePanel('channels') }}
            isHomeSelected={view === 'home'} onCreateServer={() => setShowCreateServer(true)} onJoinServer={handleJoinServer} />
        </div>
      )}

      {mobilePanel === 'chat' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-12 bg-[#181825] border-t border-[#11111b] flex items-center px-2 gap-2 z-40">
          <button onClick={() => setMobilePanel('channels')} className="p-1.5 text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e] rounded transition-colors flex-shrink-0"><ChevronLeftIcon size={20} /></button>
          <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer rounded px-1.5 py-1 hover:bg-[#1e1e2e] transition-colors" onClick={(e) => handleProfileClick(currentMember, e)}>
            <UserAvatar user={currentMember} size="sm" showStatus />
            <span className="text-sm font-medium text-[#cdd6f4] truncate">{currentMember.displayName || currentMember.username}</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-1.5 text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e] rounded transition-colors flex-shrink-0"><SettingsIcon size={18} /></button>
        </div>
      )}

      <CreateServerModal isOpen={showCreateServer} onClose={() => setShowCreateServer(false)} onCreateServer={handleCreateServer} />
      <CreateChannelModal isOpen={showCreateChannel} onClose={() => setShowCreateChannel(false)} onCreateChannel={handleCreateChannel} />
      <CreateCategoryModal isOpen={showCreateCategory} onClose={() => setShowCreateCategory(false)} onCreateCategory={handleCreateCategory} />
      <CreateGroupDMModal isOpen={showCreateGroupDM} onClose={() => setShowCreateGroupDM(false)} currentUser={currentMember} friends={[]} onCreateGroupDM={handleCreateGroupDM} />

      {selectedServer && (
        <>
          <ServerSettingsModal isOpen={showServerSettings} onClose={() => setShowServerSettings(false)} server={selectedServer} onUpdateServer={handleUpdateServer} onDeleteServer={handleDeleteServer} />
          <ServerProfileEditor isOpen={showServerProfileEditor} onClose={() => setShowServerProfileEditor(false)} currentUser={currentMember} serverId={selectedServer.id} serverName={selectedServer.name} />
        </>
      )}

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} currentUser={currentMember}
        onUpdateUser={async (updatedUser) => { const updated = { ...currentUser, ...updatedUser }; setCurrentUser(updated); await db.saveUser(updated) }}
        onLogout={handleLogout} />

      {activeProfile && (
        <UserProfilePopup user={activeProfile.member} position={activeProfile.position} onClose={() => setActiveProfile(null)}
          serverId={view === 'server' ? selectedServerId || undefined : undefined}
          currentUserId={currentUser.id}
          presenceMap={presenceMap}
          onOpenDM={(userId) => { setView('home'); setSelectedServerId(null); setDmSelection({ type: 'user', id: userId }); setSelectedVoiceChannelId(null); setActiveProfile(null) }}
          onStartCall={(userId) => { setView('home'); setSelectedServerId(null); setDmSelection({ type: 'user', id: userId }); setSelectedVoiceChannelId(null); setActiveProfile(null); handleStartDMCall(userId, false) }} />
      )}
    </div>
  )
}

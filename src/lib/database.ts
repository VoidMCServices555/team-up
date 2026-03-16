// lib/database.ts - Firebase version
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, addDoc,
  updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { auth, db as firestore } from './firebase'
import type { Member, Server, Message, Channel } from '../App'

export interface StoredUser extends Member {
  password?: string
  email: string
  phone?: string
  banner?: string
  bannerColor?: string
  customStatus?: string
  aboutMe?: string
}

export interface FriendRequest {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'declined'
  timestamp: number
}

export interface ServerProfile {
  serverId: string
  userId: string
  nickname?: string
  avatar?: string
}

export interface RolePermissions {
  viewChannels: string[]
  sendMessages: boolean
  sendVoice: boolean
  sendPhotos: boolean
  connectVoice: boolean
  manageChannels: boolean
  manageRoles: boolean
  kickMembers: boolean
  banMembers: boolean
  administrator: boolean
}

export interface Role {
  id: string
  serverId: string
  name: string
  color: string
  position: number
  hoist: boolean
  permissions: RolePermissions
  memberIds: string[]
}

export interface Category {
  id: string
  name: string
  position: number
  channelIds: string[]
}

export interface PinnedMessage {
  messageId: string
  contextId: string
  pinnedBy: string
  pinnedAt: number
}

export interface Reaction {
  emoji: string
  userIds: string[]
  userAvatars?: Record<string, string> // userId -> avatarUrl
}

export interface VoiceState {
  userId: string
  serverId: string
  channelId: string
  isMuted: boolean
  isDeafened: boolean
  joinedAt: number
  isSpeaking?: boolean
}

export interface GroupDM {
  id: string
  name: string
  memberIds: string[]
  createdBy: string
  createdAt: number
}

export interface UserPrivacySettings {
  userId: string
  allowDMsFrom: 'everyone' | 'friends' | 'server_members' | 'none'
  allowFriendRequestsFrom: 'everyone' | 'friends_of_friends' | 'server_members' | 'none'
}

export interface DMCategory {
  id: string
  userId: string
  name: string
  dmIds: string[]
  position: number
  isCollapsed: boolean
}

export interface Invite {
  code: string
  serverId: string
  createdBy: string
  createdAt: number
  uses: number
}

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  viewChannels: [], sendMessages: true, sendVoice: true, sendPhotos: true,
  connectVoice: true, manageChannels: false, manageRoles: false,
  kickMembers: false, banMembers: false, administrator: false,
}

export const DEFAULT_PRIVACY_SETTINGS: Omit<UserPrivacySettings, 'userId'> = {
  allowDMsFrom: 'everyone',
  allowFriendRequestsFrom: 'everyone',
}

export const syncChannel = new BroadcastChannel('teamup_sync')

function docToUser(data: any, id: string): StoredUser {
  return {
    id, username: data.username, discriminator: data.discriminator,
    displayName: data.displayName, avatar: data.avatar ?? undefined,
    avatarColor: data.avatarColor ?? '#cba6f7', banner: data.banner ?? undefined,
    bannerColor: data.bannerColor ?? undefined, aboutMe: data.aboutMe ?? undefined,
    customStatus: data.customStatus ?? undefined, status: data.status ?? 'online',
    phone: data.phone ?? undefined, email: data.email ?? '', roles: data.roles ?? [],
    joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date(data.joinedAt ?? Date.now()),
  }
}

function docToMessage(data: any, id: string): Message {
  return {
    id, content: data.content, author: data.author,
    timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
    attachments: data.attachments, voiceMessage: data.voiceMessage,
    reactions: data.reactions ?? undefined,
    replyTo: data.replyTo ?? undefined,
  }
}

export const db = {
  getCurrentUserId(): string | null {
    return auth.currentUser?.uid ?? null
  },

  async getUsers(): Promise<StoredUser[]> {
    const snap = await getDocs(collection(firestore, 'profiles'))
    return snap.docs.map((d) => docToUser(d.data(), d.id))
  },

  async getUser(id: string): Promise<StoredUser | undefined> {
    const snap = await getDoc(doc(firestore, 'profiles', id))
    return snap.exists() ? docToUser(snap.data(), snap.id) : undefined
  },

  async saveUser(user: Partial<StoredUser> & { id: string }) {
    await setDoc(doc(firestore, 'profiles', user.id), {
      username: user.username, displayName: user.displayName ?? user.username,
      discriminator: user.discriminator, avatar: user.avatar ?? null,
      avatarColor: user.avatarColor ?? '#cba6f7', banner: user.banner ?? null,
      bannerColor: user.bannerColor ?? null, aboutMe: user.aboutMe ?? null,
      customStatus: user.customStatus ?? null, status: user.status ?? 'online',
      phone: user.phone ?? null, email: user.email ?? null, roles: user.roles ?? [],
      joinedAt: user.joinedAt ?? serverTimestamp(), updatedAt: serverTimestamp(),
    }, { merge: true })
    syncChannel.postMessage({ type: 'users_updated' })
  },

  async findUserByEmail(_email: string): Promise<StoredUser | undefined> { return undefined },

  async findUserByTag(username: string, discriminator: string): Promise<StoredUser | undefined> {
    const q = query(collection(firestore, 'profiles'), where('username', '==', username), where('discriminator', '==', discriminator))
    const snap = await getDocs(q)
    if (snap.empty) return undefined
    return docToUser(snap.docs[0].data(), snap.docs[0].id)
  },

  async searchUsers(queryStr: string, excludeIds: string[] = []): Promise<StoredUser[]> {
    const snap = await getDocs(collection(firestore, 'profiles'))
    return snap.docs.filter((d) => !excludeIds.includes(d.id)).map((d) => docToUser(d.data(), d.id))
      .filter((u) => u.username.toLowerCase().includes(queryStr.toLowerCase()) || u.displayName.toLowerCase().includes(queryStr.toLowerCase())).slice(0, 20)
  },

  async getServers(userId: string): Promise<Server[]> {
    const membershipsSnap = await getDocs(query(collection(firestore, 'server_members'), where('userId', '==', userId)))
    if (membershipsSnap.empty) return []
    const serverIds = membershipsSnap.docs.map((d) => d.data().serverId)
    const result: Server[] = []
    for (const serverId of serverIds) {
      const serverSnap = await getDoc(doc(firestore, 'servers', serverId))
      if (!serverSnap.exists()) continue
      const serverData = serverSnap.data()
      const membersSnap = await getDocs(query(collection(firestore, 'server_members'), where('serverId', '==', serverId)))
      const memberIds = membersSnap.docs.map((d) => d.data().userId)
      const members: StoredUser[] = []
      for (const mid of memberIds) { const u = await db.getUser(mid); if (u) members.push(u) }
      const channelsSnap = await getDocs(query(collection(firestore, 'channels'), where('serverId', '==', serverId), orderBy('position')))
      const channels: Channel[] = channelsSnap.docs.map((d) => ({ id: d.id, name: d.data().name, type: d.data().type as 'text' | 'voice', description: d.data().description ?? undefined, userLimit: d.data().userLimit ?? undefined }))
      result.push({ id: serverId, name: serverData.name, icon: serverData.icon ?? undefined, members, channels })
    }
    return result
  },

  async saveServer(server: Server, ownerId: string) {
    await setDoc(doc(firestore, 'servers', server.id), { name: server.name, icon: server.icon ?? null, ownerId, updatedAt: serverTimestamp() }, { merge: true })
    for (let i = 0; i < server.channels.length; i++) {
      const c = server.channels[i]
      await setDoc(doc(firestore, 'channels', c.id), { serverId: server.id, name: c.name, type: c.type, description: c.description ?? null, userLimit: c.userLimit ?? null, position: i }, { merge: true })
    }
    syncChannel.postMessage({ type: 'servers_updated' })
  },

  async deleteServer(serverId: string) {
    await deleteDoc(doc(firestore, 'servers', serverId))
    syncChannel.postMessage({ type: 'servers_updated' })
  },

  async addServerMember(serverId: string, userId: string) {
    await setDoc(doc(firestore, 'server_members', `${serverId}_${userId}`), { serverId, userId })
    syncChannel.postMessage({ type: 'servers_updated' })
  },

  async saveChannel(channel: Channel, serverId: string, position: number = 0) {
    await setDoc(doc(firestore, 'channels', channel.id), { serverId, name: channel.name, type: channel.type, description: channel.description ?? null, userLimit: channel.userLimit ?? null, position }, { merge: true })
    syncChannel.postMessage({ type: 'servers_updated' })
  },

  async deleteChannel(channelId: string) {
    await deleteDoc(doc(firestore, 'channels', channelId))
    syncChannel.postMessage({ type: 'servers_updated' })
  },

  async getCategories(serverId: string): Promise<Category[]> {
    const snap = await getDocs(query(collection(firestore, 'categories'), where('serverId', '==', serverId), orderBy('position')))
    return snap.docs.map((d) => ({ id: d.id, name: d.data().name, position: d.data().position, channelIds: d.data().channelIds ?? [] }))
  },

  async saveCategory(serverId: string, category: Category) {
    await setDoc(doc(firestore, 'categories', category.id), { serverId, name: category.name, position: category.position, channelIds: category.channelIds }, { merge: true })
    for (const channelId of category.channelIds) { await updateDoc(doc(firestore, 'channels', channelId), { categoryId: category.id }).catch(() => {}) }
    syncChannel.postMessage({ type: 'categories_updated' })
  },

  async deleteCategory(_serverId: string, categoryId: string) {
    await deleteDoc(doc(firestore, 'categories', categoryId))
    syncChannel.postMessage({ type: 'categories_updated' })
  },

  async getMessages(contextId: string): Promise<Message[]> {
    const snap = await getDocs(query(collection(firestore, 'messages'), where('contextId', '==', contextId), orderBy('timestamp'), limit(100)))
    return snap.docs.map((d) => docToMessage(d.data(), d.id))
  },

  async saveMessage(contextId: string, message: Message) {
    // ✅ تنظيف الـ attachments - نتأكد إن مفيش base64 كبير بيوصل Firestore
    const cleanAttachments = message.attachments
      ? message.attachments.map((att) => {
          // لو الـ url base64 وحجمه أكبر من 500KB → مش هنحفظه (المفروض اتترفع على Cloudinary قبل كده)
          if (att.url?.startsWith('data:') && att.url.length > 500 * 1024) {
            console.warn('[saveMessage] Skipping large base64 attachment:', att.name)
            return { ...att, url: '' } // placeholder بدل ما نفشل الحفظ
          }
          return att
        })
      : null

    await setDoc(doc(firestore, 'messages', message.id), {
      contextId,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        discriminator: message.author.discriminator,
        displayName: message.author.displayName,
        avatar: message.author.avatar ?? null,
        avatarColor: message.author.avatarColor,
        status: message.author.status,
        roles: message.author.roles ?? [],
        joinedAt: message.author.joinedAt instanceof Date
          ? message.author.joinedAt.toISOString()
          : new Date(message.author.joinedAt).toISOString(),
        email: message.author.email ?? '',
      },
      timestamp: serverTimestamp(),
      attachments: cleanAttachments,
      voiceMessage: message.voiceMessage ?? null,
      reactions: (message as any).reactions ?? null,
      replyTo: (message as any).replyTo ?? null,
    })
    syncChannel.postMessage({ type: 'messages_updated', contextId })
  },

  async updateMessage(contextId: string, messageId: string, newContent: string) {
    await updateDoc(doc(firestore, 'messages', messageId), { content: newContent, editedAt: serverTimestamp() })
    syncChannel.postMessage({ type: 'messages_updated', contextId })
  },

  async deleteMessage(contextId: string, messageId: string) {
    await deleteDoc(doc(firestore, 'messages', messageId))
    syncChannel.postMessage({ type: 'messages_updated', contextId })
  },

  getDMChannelId(userId1: string, userId2: string): string { return [userId1, userId2].sort().join('_') },
  getGroupDMChannelId(groupDMId: string): string { return `group_dm_${groupDMId}` },

  async getFriends(userId: string): Promise<StoredUser[]> {
    const snap = await getDocs(query(collection(firestore, 'friendships'), where('userIds', 'array-contains', userId)))
    if (snap.empty) return []
    const friendIds = snap.docs.map((d) => (d.data().userIds as string[]).find((id) => id !== userId)!).filter(Boolean)
    const friends: StoredUser[] = []
    for (const id of friendIds) { const u = await db.getUser(id); if (u) friends.push(u) }
    return friends
  },

  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    const snap = await getDocs(query(collection(firestore, 'friend_requests'), where('involvedIds', 'array-contains', userId), where('status', '==', 'pending')))
    return snap.docs.map((d) => ({ id: d.id, fromUserId: d.data().fromUserId, toUserId: d.data().toUserId, status: d.data().status, timestamp: d.data().createdAt?.toMillis?.() ?? Date.now() }))
  },

  async sendFriendRequest(fromUserId: string, toUserId: string): Promise<string> {
    if (await db.isBlocked(fromUserId, toUserId)) return 'blocked_by_you'
    if (await db.isBlocked(toUserId, fromUserId)) return 'blocked_by_them'
    const existingSnap = await getDocs(query(collection(firestore, 'friend_requests'), where('involvedIds', 'array-contains', fromUserId), where('status', '==', 'pending')))
    const existing = existingSnap.docs.find((d) => { const data = d.data(); return (data.fromUserId === fromUserId && data.toUserId === toUserId) || (data.fromUserId === toUserId && data.toUserId === fromUserId) })
    if (existing) { if (existing.data().fromUserId === toUserId) { await db.acceptFriendRequest(existing.id); return 'accepted' } return 'exists' }
    await addDoc(collection(firestore, 'friend_requests'), { fromUserId, toUserId, involvedIds: [fromUserId, toUserId], status: 'pending', createdAt: serverTimestamp() })
    syncChannel.postMessage({ type: 'friends_updated' })
    return 'sent'
  },

  async acceptFriendRequest(requestId: string) {
    const reqSnap = await getDoc(doc(firestore, 'friend_requests', requestId))
    if (!reqSnap.exists()) return
    const req = reqSnap.data()
    await deleteDoc(doc(firestore, 'friend_requests', requestId))
    const friendshipId = [req.fromUserId, req.toUserId].sort().join('_')
    await setDoc(doc(firestore, 'friendships', friendshipId), { userIds: [req.fromUserId, req.toUserId], createdAt: serverTimestamp() })
    await db.addOpenDM(req.fromUserId, req.toUserId, 'user')
    await db.addOpenDM(req.toUserId, req.fromUserId, 'user')
    syncChannel.postMessage({ type: 'friends_updated' })
  },

  async declineFriendRequest(requestId: string) {
    await deleteDoc(doc(firestore, 'friend_requests', requestId))
    syncChannel.postMessage({ type: 'friends_updated' })
  },

  async removeFriend(userId1: string, userId2: string) {
    await deleteDoc(doc(firestore, 'friendships', [userId1, userId2].sort().join('_')))
    syncChannel.postMessage({ type: 'friends_updated' })
  },

  async getBlockedUsers(userId: string): Promise<string[]> {
    const snap = await getDocs(query(collection(firestore, 'blocked_users'), where('blockerId', '==', userId)))
    return snap.docs.map((d) => d.data().blockedId)
  },

  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const snap = await getDocs(query(collection(firestore, 'blocked_users'), where('blockerId', '==', userId1), where('blockedId', '==', userId2)))
    return !snap.empty
  },

  async blockUser(blockerId: string, blockedId: string) {
    await setDoc(doc(firestore, 'blocked_users', `${blockerId}_${blockedId}`), { blockerId, blockedId })
    await db.removeFriend(blockerId, blockedId)
    syncChannel.postMessage({ type: 'friends_updated' })
  },

  async unblockUser(blockerId: string, blockedId: string) {
    await deleteDoc(doc(firestore, 'blocked_users', `${blockerId}_${blockedId}`))
    syncChannel.postMessage({ type: 'friends_updated' })
  },

  async getAllDMUsers(userId: string): Promise<StoredUser[]> {
    const snap = await getDocs(query(collection(firestore, 'open_dms'), where('userId', '==', userId)))
    const users: StoredUser[] = []
    for (const d of snap.docs) { const u = await db.getUser(d.data().targetId); if (u) users.push(u) }
    return users
  },

  async addOpenDM(userId: string, targetId: string, _type: 'user' | 'group') {
    await setDoc(doc(firestore, 'open_dms', `${userId}_${targetId}`), { userId, targetId })
    syncChannel.postMessage({ type: 'open_dms_updated' })
  },

  async removeOpenDM(userId: string, targetId: string) {
    await deleteDoc(doc(firestore, 'open_dms', `${userId}_${targetId}`))
    syncChannel.postMessage({ type: 'open_dms_updated' })
  },

  async getGroupDMs(): Promise<GroupDM[]> {
    const snap = await getDocs(collection(firestore, 'group_dms'))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupDM))
  },

  async getGroupDMsForUser(userId: string): Promise<GroupDM[]> {
    const snap = await getDocs(query(collection(firestore, 'group_dms'), where('memberIds', 'array-contains', userId)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupDM))
  },

  async saveGroupDM(groupDM: GroupDM) {
    await setDoc(doc(firestore, 'group_dms', groupDM.id), groupDM)
    syncChannel.postMessage({ type: 'group_dms_updated' })
  },

  async getVoiceStates(): Promise<VoiceState[]> {
    const snap = await getDocs(collection(firestore, 'voice_states'))
    return snap.docs.map((d) => d.data() as VoiceState)
  },

  async setVoiceState(state: VoiceState) {
    await setDoc(doc(firestore, 'voice_states', state.userId), state)
    syncChannel.postMessage({ type: 'voice_updated' })
  },

  async removeVoiceState(userId: string) {
    await deleteDoc(doc(firestore, 'voice_states', userId))
    syncChannel.postMessage({ type: 'voice_updated' })
  },

  async setSpeakingState(userId: string, isSpeaking: boolean) {
    await updateDoc(doc(firestore, 'voice_states', userId), { isSpeaking }).catch(() => {})
    syncChannel.postMessage({ type: 'speaking_updated', userId, isSpeaking })
  },

  getChannelCallStartTime(_channelId: string): number | null { return null },

  async createInvite(serverId: string, createdBy: string): Promise<Invite> {
    const code = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()
    await setDoc(doc(firestore, 'invites', code), { code, serverId, createdBy, uses: 0, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) })
    return { code, serverId, createdBy, createdAt: Date.now(), uses: 0 }
  },

  async useInvite(code: string, userId: string): Promise<Server | null> {
    const inviteSnap = await getDoc(doc(firestore, 'invites', code))
    if (!inviteSnap.exists()) return null
    const invite = inviteSnap.data()
    await db.addServerMember(invite.serverId, userId)
    await updateDoc(doc(firestore, 'invites', code), { uses: (invite.uses ?? 0) + 1 })
    syncChannel.postMessage({ type: 'servers_updated' })
    const servers = await db.getServers(userId)
    return servers.find((s) => s.id === invite.serverId) ?? null
  },

  async getPinnedMessages(contextId: string): Promise<PinnedMessage[]> {
    const snap = await getDocs(query(collection(firestore, 'pinned_messages'), where('contextId', '==', contextId), orderBy('pinnedAt', 'desc')))
    return snap.docs.map((d) => ({ messageId: d.data().messageId, contextId: d.data().contextId, pinnedBy: d.data().pinnedBy, pinnedAt: d.data().pinnedAt?.toMillis?.() ?? Date.now() }))
  },

  async pinMessage(contextId: string, messageId: string, pinnedBy: string) {
    await addDoc(collection(firestore, 'pinned_messages'), { contextId, messageId, pinnedBy, pinnedAt: serverTimestamp() })
    syncChannel.postMessage({ type: 'pins_updated', contextId })
  },

  async unpinMessage(contextId: string, messageId: string) {
    const snap = await getDocs(query(collection(firestore, 'pinned_messages'), where('contextId', '==', contextId), where('messageId', '==', messageId)))
    for (const d of snap.docs) await deleteDoc(d.ref)
    syncChannel.postMessage({ type: 'pins_updated', contextId })
  },

  async isMessagePinned(contextId: string, messageId: string): Promise<boolean> {
    const snap = await getDocs(query(collection(firestore, 'pinned_messages'), where('contextId', '==', contextId), where('messageId', '==', messageId)))
    return !snap.empty
  },

  async getServerProfile(serverId: string, userId: string): Promise<ServerProfile | undefined> {
    const snap = await getDoc(doc(firestore, 'server_profiles', `${serverId}_${userId}`))
    if (!snap.exists()) return undefined
    return { serverId, userId, nickname: snap.data().nickname, avatar: snap.data().avatar }
  },

  async getServerProfiles(serverId: string): Promise<ServerProfile[]> {
    const snap = await getDocs(query(collection(firestore, 'server_profiles'), where('serverId', '==', serverId)))
    return snap.docs.map((d) => ({ serverId: d.data().serverId, userId: d.data().userId, nickname: d.data().nickname, avatar: d.data().avatar }))
  },

  async saveServerProfile(profile: ServerProfile) {
    await setDoc(doc(firestore, 'server_profiles', `${profile.serverId}_${profile.userId}`), { serverId: profile.serverId, userId: profile.userId, nickname: profile.nickname ?? null, avatar: profile.avatar ?? null })
    syncChannel.postMessage({ type: 'server_profiles_updated' })
  },

  async deleteServerProfile(serverId: string, userId: string) {
    await deleteDoc(doc(firestore, 'server_profiles', `${serverId}_${userId}`))
    syncChannel.postMessage({ type: 'server_profiles_updated' })
  },

  async getRoles(serverId: string): Promise<Role[]> {
    const snap = await getDocs(query(collection(firestore, 'roles'), where('serverId', '==', serverId), orderBy('position', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role))
  },

  async saveRole(role: Role) {
    await setDoc(doc(firestore, 'roles', role.id), role)
    syncChannel.postMessage({ type: 'roles_updated' })
  },

  async deleteRole(_serverId: string, roleId: string) {
    await deleteDoc(doc(firestore, 'roles', roleId))
    syncChannel.postMessage({ type: 'roles_updated' })
  },

  async getMemberRoles(serverId: string, userId: string): Promise<Role[]> {
    const roles = await db.getRoles(serverId)
    return roles.filter((r) => r.memberIds?.includes(userId))
  },

  async getPrivacySettings(userId: string): Promise<UserPrivacySettings> {
    const snap = await getDoc(doc(firestore, 'privacy_settings', userId))
    if (!snap.exists()) return { userId, ...DEFAULT_PRIVACY_SETTINGS }
    return { userId, ...snap.data() } as UserPrivacySettings
  },

  async savePrivacySettings(settings: UserPrivacySettings) {
    await setDoc(doc(firestore, 'privacy_settings', settings.userId), settings)
    syncChannel.postMessage({ type: 'privacy_updated' })
  },

  async canMessage(senderId: string, receiverId: string): Promise<{ allowed: boolean; reason?: string }> {
    if (senderId === receiverId) return { allowed: true }
    if (await db.isBlocked(senderId, receiverId)) return { allowed: false, reason: 'blocked' }
    const settings = await db.getPrivacySettings(receiverId)
    if (settings.allowDMsFrom === 'none') return { allowed: false, reason: 'privacy_none' }
    if (settings.allowDMsFrom === 'everyone') return { allowed: true }
    const friends = await db.getFriends(receiverId)
    if (friends.some((f) => f.id === senderId)) return { allowed: true }
    if (settings.allowDMsFrom === 'friends') return { allowed: false, reason: 'privacy_friends_only' }
    return { allowed: true }
  },

  async canSendFriendRequest(senderId: string, receiverId: string): Promise<boolean> {
    if (senderId === receiverId) return false
    if (await db.isBlocked(senderId, receiverId)) return false
    if (await db.isBlocked(receiverId, senderId)) return false
    const friends = await db.getFriends(senderId)
    if (friends.some((f) => f.id === receiverId)) return false
    return true
  },

  async getDMCategories(userId: string): Promise<DMCategory[]> {
    const snap = await getDocs(query(collection(firestore, 'dm_categories'), where('userId', '==', userId), orderBy('position')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DMCategory))
  },

  async saveDMCategory(category: DMCategory) {
    await setDoc(doc(firestore, 'dm_categories', category.id), category)
    syncChannel.postMessage({ type: 'dm_categories_updated' })
  },

  async deleteDMCategory(_userId: string, categoryId: string) {
    await deleteDoc(doc(firestore, 'dm_categories', categoryId))
    syncChannel.postMessage({ type: 'dm_categories_updated' })
  },

  isServerMuted(userId: string, serverId: string): boolean {
    try { const muted = JSON.parse(localStorage.getItem('teamup_muted_servers') || '{}'); return (muted[userId] || []).includes(serverId) } catch { return false }
  },

  toggleMuteServer(userId: string, serverId: string): boolean {
    try {
      const muted = JSON.parse(localStorage.getItem('teamup_muted_servers') || '{}')
      const userMuted: string[] = muted[userId] || []
      const isMuted = userMuted.includes(serverId)
      muted[userId] = isMuted ? userMuted.filter((id: string) => id !== serverId) : [...userMuted, serverId]
      localStorage.setItem('teamup_muted_servers', JSON.stringify(muted))
      return !isMuted
    } catch { return false }
  },

  // ── Realtime Subscriptions ────────────────────────────────────────────────

  // ── Reactions - محفوظة في collection منفصلة عشان تتجنب Firestore rules issue ────
  async addReaction(contextId: string, messageId: string, emoji: string, userId: string, userAvatar?: string) {
    const reactionId = `${messageId}_${emoji.codePointAt(0)?.toString(16) || emoji}`
    const reactionRef = doc(firestore, 'message_reactions', reactionId)
    const snap = await getDoc(reactionRef)

    if (!snap.exists()) {
      // ✅ create جديد
      await setDoc(reactionRef, {
        messageId, contextId, emoji,
        userIds: [userId],
        userAvatars: userAvatar ? { [userId]: userAvatar } : {},
        updatedAt: serverTimestamp(),
      })
    } else {
      const data = snap.data()
      const userIds: string[] = data.userIds || []
      const userAvatars: Record<string, string> = data.userAvatars || {}

      if (userIds.includes(userId)) {
        // ✅ toggle off
        const newIds = userIds.filter(id => id !== userId)
        delete userAvatars[userId]
        if (newIds.length === 0) {
          await deleteDoc(reactionRef)
        } else {
          await updateDoc(reactionRef, { userIds: newIds, userAvatars, updatedAt: serverTimestamp() })
        }
      } else {
        // ✅ add
        if (userAvatar) userAvatars[userId] = userAvatar
        await updateDoc(reactionRef, { userIds: [...userIds, userId], userAvatars, updatedAt: serverTimestamp() })
      }
    }
    syncChannel.postMessage({ type: 'reactions_updated', contextId, messageId })
  },

  async getReactions(messageId: string): Promise<Record<string, { emoji: string; userIds: string[]; userAvatars?: Record<string, string> }>> {
    const snap = await getDocs(query(collection(firestore, 'message_reactions'), where('messageId', '==', messageId)))
    const result: Record<string, any> = {}
    snap.docs.forEach(d => { result[d.data().emoji] = { emoji: d.data().emoji, userIds: d.data().userIds, userAvatars: d.data().userAvatars } })
    return result
  },

  subscribeToReactions(messageId: string, callback: (reactions: Record<string, { emoji: string; userIds: string[]; userAvatars?: Record<string, string> }>) => void) {
    const q = query(collection(firestore, 'message_reactions'), where('messageId', '==', messageId))
    return onSnapshot(q, (snap) => {
      const result: Record<string, any> = {}
      snap.docs.forEach(d => { result[d.data().emoji] = { emoji: d.data().emoji, userIds: d.data().userIds, userAvatars: d.data().userAvatars } })
      callback(result)
    })
  },

  // ── Saved GIFs ──────────────────────────────────────────────────────────────
  getSavedGifs(userId: string): string[] {
    try { return JSON.parse(localStorage.getItem(`teamup_saved_gifs_${userId}`) || '[]') } catch { return [] }
  },
  saveGif(userId: string, url: string): void {
    const gifs = this.getSavedGifs(userId)
    if (!gifs.includes(url)) {
      const updated = [url, ...gifs].slice(0, 50) // max 50 GIFs
      localStorage.setItem(`teamup_saved_gifs_${userId}`, JSON.stringify(updated))
    }
  },
  removeGif(userId: string, url: string): void {
    const gifs = this.getSavedGifs(userId).filter(g => g !== url)
    localStorage.setItem(`teamup_saved_gifs_${userId}`, JSON.stringify(gifs))
  },

  subscribeToMessages(contextId: string, callback: (messages: Message[]) => void) {
    const q = query(collection(firestore, 'messages'), where('contextId', '==', contextId), orderBy('timestamp'), limit(100))
    return onSnapshot(q, (snap) => { callback(snap.docs.map((d) => docToMessage(d.data(), d.id))) })
  },

  subscribeToVoiceStates(callback: (states: VoiceState[]) => void) {
    return onSnapshot(collection(firestore, 'voice_states'), (snap) => { callback(snap.docs.map((d) => d.data() as VoiceState)) })
  },

  subscribeToFriendRequests(userId: string, callback: (requests: FriendRequest[]) => void) {
    const q = query(collection(firestore, 'friend_requests'), where('involvedIds', 'array-contains', userId), where('status', '==', 'pending'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, fromUserId: d.data().fromUserId, toUserId: d.data().toUserId, status: d.data().status, timestamp: d.data().createdAt?.toMillis?.() ?? Date.now() })))
    })
  },

  // ✅ جديد: subscribe لتغييرات الـ status بتاع قائمة users محددة
  subscribeToUsersStatus(userIds: string[], callback: (users: StoredUser[]) => void) {
    if (userIds.length === 0) return () => {}
    // Firebase مش بيدعم where in أكتر من 10 عناصر، هنستخدم collection-level listener
    return onSnapshot(collection(firestore, 'profiles'), (snap) => {
      const users = snap.docs
        .filter((d) => userIds.includes(d.id))
        .map((d) => docToUser(d.data(), d.id))
      callback(users)
    })
  },
}

import React, { useEffect, useState } from 'react'
import { db } from '../lib/database'
import { auth } from '../lib/firebase'
import { db as firestore } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getDoc, doc, updateDoc, increment, getDocs, query, collection, where } from 'firebase/firestore'
import { ref, get } from 'firebase/database'
import { rtdb } from '../lib/firebase'
import { Users, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface InvitePageProps {
  code: string
  onJoined: () => void
}

interface InviteData {
  serverId: string
  createdBy: string
  uses: number
  expiresAt: any
}

interface ServerData {
  name: string
  icon?: string
  memberCount: number
  onlineCount: number
}

type State = 'loading' | 'valid' | 'expired' | 'invalid' | 'joining' | 'joined' | 'error' | 'needs_login'

export function InvitePage({ code, onJoined }: InvitePageProps) {
  const [state, setState] = useState<State>('loading')
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user))
    return () => unsub()
  }, [])

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const inviteSnap = await getDoc(doc(firestore, 'invites', code))
        if (!inviteSnap.exists()) { setState('invalid'); return }

        const invite = inviteSnap.data() as InviteData

        if (invite.expiresAt) {
          const expiresAt = invite.expiresAt.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt)
          if (new Date() > expiresAt) { setState('expired'); return }
        }

        setInviteData(invite)

        const serverSnap = await getDoc(doc(firestore, 'servers', invite.serverId))
        if (!serverSnap.exists()) { setState('invalid'); return }
        const serverDoc = serverSnap.data()

        const membersSnap = await getDocs(query(collection(firestore, 'server_members'), where('serverId', '==', invite.serverId)))
        const memberCount = membersSnap.size
        const memberIds = membersSnap.docs.map(d => d.data().userId)

        const presenceSnap = await get(ref(rtdb, 'presence'))
        const presenceData = presenceSnap.val() || {}
        const onlineCount = memberIds.filter(id => presenceData[id]?.status === 'online').length

        setServerData({ name: serverDoc.name, icon: serverDoc.icon, memberCount, onlineCount })
        setState('valid')
      } catch (err) {
        console.error('Failed to load invite:', err)
        setState('invalid')
      }
    }
    loadInvite()
  }, [code])

  const handleJoin = async () => {
    if (!isLoggedIn) { setState('needs_login'); return }
    const user = auth.currentUser
    if (!user || !inviteData) return
    setState('joining')
    try {
      const existing = await getDocs(query(collection(firestore, 'server_members'), where('serverId', '==', inviteData.serverId), where('userId', '==', user.uid)))
      if (!existing.empty) { setState('joined'); setTimeout(onJoined, 1500); return }
      await db.addServerMember(inviteData.serverId, user.uid)
      await updateDoc(doc(firestore, 'invites', code), { uses: increment(1) })
      setState('joined')
      setTimeout(onJoined, 1500)
    } catch (err) {
      console.error('Failed to join:', err)
      setErrorMsg('Failed to join server. Please try again.')
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1e2e] via-[#181825] to-[#11111b] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#cba6f7]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#89b4fa]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#cba6f7] flex items-center justify-center shadow-lg shadow-[#cba6f7]/20">
            <span className="text-white font-black text-lg">T</span>
          </div>
          <span className="text-[#cdd6f4] font-bold text-xl">Team UP</span>
        </div>

        <div className="bg-[#1e1e2e] border border-[#313244] rounded-2xl overflow-hidden shadow-2xl">

          {state === 'loading' && (
            <div className="p-12 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-[#cba6f7] animate-spin" />
              <p className="text-[#a6adc8] text-sm">Loading invite...</p>
            </div>
          )}

          {(state === 'valid' || state === 'joining' || state === 'needs_login') && serverData && (
            <>
              <div className="h-24 bg-gradient-to-r from-[#cba6f7]/20 via-[#89b4fa]/20 to-[#a6e3a1]/20" />
              <div className="px-6 pb-6">
                <div className="-mt-8 mb-4">
                  <div className="w-16 h-16 rounded-2xl border-4 border-[#1e1e2e] overflow-hidden bg-[#313244] flex items-center justify-center shadow-lg">
                    {serverData.icon
                      ? <img src={serverData.icon} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[#cdd6f4] font-black text-2xl">{serverData.name.substring(0, 2).toUpperCase()}</span>
                    }
                  </div>
                </div>

                <p className="text-[#a6adc8] text-sm mb-1">You've been invited to join</p>
                <h1 className="text-[#cdd6f4] font-black text-2xl mb-3">{serverData.name}</h1>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#a6e3a1]" />
                    <span className="text-[#a6adc8] text-sm"><span className="text-[#cdd6f4] font-semibold">{serverData.onlineCount}</span> Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#6c7086]" />
                    <span className="text-[#a6adc8] text-sm"><span className="text-[#cdd6f4] font-semibold">{serverData.memberCount}</span> Members</span>
                  </div>
                </div>

                {state === 'needs_login' && (
                  <div className="bg-[#f9e2af]/10 border border-[#f9e2af]/20 rounded-lg p-3 mb-4">
                    <p className="text-[#f9e2af] text-sm text-center">You need to be logged in to join this server.</p>
                  </div>
                )}

                <button onClick={handleJoin} disabled={state === 'joining'}
                  className="w-full bg-[#cba6f7] hover:bg-[#b4befe] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#cba6f7]/20">
                  {state === 'joining' ? <><Loader2 className="w-4 h-4 animate-spin" />Joining...</> : 'Accept Invite'}
                </button>
                <p className="text-center text-[#45475a] text-xs mt-3">By accepting, you agree to Team UP's community guidelines</p>
              </div>
            </>
          )}

          {state === 'joined' && (
            <div className="p-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#a6e3a1]/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#a6e3a1]" />
              </div>
              <div className="text-center">
                <h3 className="text-[#cdd6f4] font-bold text-lg">Successfully Joined!</h3>
                <p className="text-[#a6adc8] text-sm mt-1">Welcome to {serverData?.name}</p>
              </div>
              <div className="w-5 h-5 border-2 border-[#cba6f7] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {state === 'expired' && (
            <div className="p-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#f9e2af]/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-[#f9e2af]" />
              </div>
              <div className="text-center">
                <h3 className="text-[#cdd6f4] font-bold text-lg">Invite Expired</h3>
                <p className="text-[#a6adc8] text-sm mt-1">This invite link has expired. Ask for a new one!</p>
              </div>
            </div>
          )}

          {(state === 'invalid' || state === 'error') && (
            <div className="p-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#f38ba8]/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-[#f38ba8]" />
              </div>
              <div className="text-center">
                <h3 className="text-[#cdd6f4] font-bold text-lg">{state === 'error' ? 'Something went wrong' : 'Invalid Invite'}</h3>
                <p className="text-[#a6adc8] text-sm mt-1">{state === 'error' ? errorMsg : 'This invite link is invalid or has been revoked.'}</p>
              </div>
              {state === 'error' && <button onClick={() => setState('valid')} className="text-[#cba6f7] hover:underline text-sm">Try again</button>}
            </div>
          )}
        </div>
        <p className="text-center text-[#45475a] text-xs mt-4">Team UP · Community Chat Platform</p>
      </div>
    </div>
  )
}

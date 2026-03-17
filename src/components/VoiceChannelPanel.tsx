// src/components/VoiceChannelPanel.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Mic, MicOff, Headphones, Monitor, Video, VideoOff,
  Settings, PhoneOff, Phone, ChevronDown, SlidersHorizontal,
  MonitorOff, X, Volume2, Users, MoreHorizontal,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ref, set } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import type { Member, Channel } from '../App';
import { useI18n } from '../lib/i18n';
import { FloatingStream } from './FloatingStream';

interface VoiceChannelPanelProps {
  channel: Channel;
  serverName: string;
  currentUser: Member;
  connectedUsers: Member[];
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnect: () => void;
  onMemberClick?: (member: Member, e: React.MouseEvent) => void;
  onToggleScreenShare?: () => void;
  onToggleCamera?: () => void;
  onToggleStreaming?: () => void;
  onMuteUser?: (userId: string) => void;
  onUnmuteUser?: (userId: string) => void;
  isScreenSharing?: boolean;
  isCameraOn?: boolean;
  isStreaming?: boolean;
  localCameraStream?: MediaStream | null;
  localScreenStream?: MediaStream | null;
  localStreamStream?: MediaStream | null;
  remoteStreams?: { userId: string; stream: MediaStream; hasVideo: boolean }[];
  mutedUserIds?: Set<string>;
  isDMCall?: boolean;
  pendingUsers?: Member[];
  isIncomingCall?: boolean;
  isObserving?: boolean;
  onAcceptCall?: () => void;
  onDeclineCall?: () => void;
  onJoinCall?: () => void;
  onOpenMobileMenu?: () => void;
}

type StreamQuality = '360p' | '480p' | '720p' | '1080p' | '1440p';

function VideoTile({ stream, label, isMuted: tileMuted }: { stream: MediaStream; label: string; isMuted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
  return (
    <div className="relative bg-[#11111b] rounded-xl overflow-hidden aspect-video">
      <video ref={videoRef} autoPlay playsInline muted={tileMuted} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">{label}</div>
    </div>
  );
}

function CallTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  return <span className="text-[#a6adc8] text-sm font-mono">{mins}:{secs}</span>;
}

export function VoiceChannelPanel({
  channel, currentUser, connectedUsers, isMuted, isDeafened,
  onToggleMute, onToggleDeafen, onDisconnect, onToggleScreenShare, onToggleCamera,
  onMuteUser, onUnmuteUser, isScreenSharing = false, isCameraOn = false, isStreaming = false,
  localCameraStream: propLocalCameraStream, localScreenStream: propLocalScreenStream,
  localStreamStream: propLocalStreamStream,
  remoteStreams = [], mutedUserIds = new Set(),
  isDMCall = false, pendingUsers = [], isIncomingCall = false, isObserving = false,
  onAcceptCall, onDeclineCall, onJoinCall, onOpenMobileMenu,
}: VoiceChannelPanelProps) {
  const { t } = useI18n();
  const [streamQuality, setStreamQuality] = useState<StreamQuality>('720p');
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [callDeclined, setCallDeclined] = useState(false);
  const callStartTimeRef = useRef(Date.now());
  const [speakingUserIds, setSpeakingUserIds] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);

  // حالات محلية للبث (إذا لم ترد من props)
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(propLocalCameraStream || null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(propLocalScreenStream || null);
  const [localStreamStream, setLocalStreamStream] = useState<MediaStream | null>(propLocalStreamStream || null);

  // تحديث الحالات المحلية إذا تغيرت props
  useEffect(() => {
    if (propLocalCameraStream !== localCameraStream) {
      setLocalCameraStream(propLocalCameraStream);
    }
  }, [propLocalCameraStream]);

  useEffect(() => {
    if (propLocalScreenStream !== localScreenStream) {
      setLocalScreenStream(propLocalScreenStream);
    }
  }, [propLocalScreenStream]);

  useEffect(() => {
    if (propLocalStreamStream !== localStreamStream) {
      setLocalStreamStream(propLocalStreamStream);
    }
  }, [propLocalStreamStream]);

  // تحديث حالة المستخدم في Firebase
  useEffect(() => {
    if (!currentUser || !channel) return;

    const userStatusRef = ref(rtdb, `voiceStates/${isDMCall ? 'dm' : 'server'}/${channel.id}/${currentUser.id}`);
    set(userStatusRef, {
      userId: currentUser.id,
      joinedAt: Date.now(),
      isMuted,
      isDeafened,
    });

    return () => {
      set(userStatusRef, null);
    };
  }, [currentUser, channel.id, isDMCall, isMuted, isDeafened]);



  const enhancedConnectedUsers = connectedUsers.map(user => ({
    ...user,
    isMuted: mutedUserIds.has(user.id) || false,
    isDeafened: false,
    isSpeaking: speakingUserIds.has(user.id),
  }));

  const hasAnyVideo = isCameraOn || isScreenSharing || isStreaming || remoteStreams.length > 0;
  const qualityOptions = [
    { value: '360p', label: '360p', desc: 'Low quality — saves bandwidth' },
    { value: '480p', label: '480p', desc: 'Standard quality' },
    { value: '720p', label: '720p', desc: 'HD quality' },
    { value: '1080p', label: '1080p', desc: 'Full HD quality' },
    { value: '1440p', label: '1440p', desc: 'Highest quality' },
  ];

  // واجهة DM call
  if (isDMCall) {
    const otherUser = pendingUsers[0] || connectedUsers.find(u => u.id !== currentUser.id);
    const isConnected = connectedUsers.length > 1;

    return (
      <div className="flex flex-col bg-[#2b2d31] min-w-0 h-full relative">
        {hasAnyVideo && (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#11111b] p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full h-full">
              {isCameraOn && localCameraStream && (
                <VideoTile stream={localCameraStream} label={`${currentUser.displayName} (You)`} isMuted />
              )}
              {isScreenSharing && localScreenStream && (
                <VideoTile stream={localScreenStream} label={t('voice.yourScreen') || 'Your Screen'} isMuted />
              )}
              {isStreaming && localStreamStream && (
                <VideoTile stream={localStreamStream} label={`${currentUser.displayName} (Streaming)`} isMuted />
              )}
              {remoteStreams.map((remoteStream) => {
                const member = connectedUsers.find(u => u.id === remoteStream.userId);
                const label = remoteStream.isStreaming 
                  ? `${member?.displayName || remoteStream.userId} (Live)` 
                  : member?.displayName || remoteStream.userId;
                return <VideoTile key={remoteStream.userId} stream={remoteStream.stream} label={label} />;
              })}
            </div>
          </div>
        )}
        <div className={`flex-1 flex items-center justify-between px-6 gap-4 min-h-0 ${hasAnyVideo ? 'flex-shrink-0 h-auto' : ''}`}>
          <div className="relative flex-shrink-0">
            {!isConnected && !callDeclined && !isIncomingCall && otherUser && (
              [1, 2, 3].map((i) => (
                <div key={i} className="absolute inset-0 rounded-full border-2 border-white/15"
                  style={{ transform: `scale(${1 + i * 0.3})`, animation: `ping 2s ease-out infinite ${i * 0.5}s`, opacity: 0 }} />
              ))
            )}
            {isConnected && otherUser && speakingUserIds.has(otherUser.id) && (
              <div className="absolute -inset-1 rounded-full ring-2 ring-[#23a55a]" />
            )}
            <div className={`w-16 h-16 rounded-full overflow-hidden ${!isConnected && !callDeclined ? 'opacity-80' : ''}`}>
              {otherUser
                ? <UserAvatar user={otherUser} size="lg" className="w-16 h-16 text-2xl" />
                : <div className="w-16 h-16 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-2xl font-bold">{channel.name.substring(0, 1).toUpperCase()}</div>
              }
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-base truncate">
              {otherUser?.displayName || channel.name}
            </h2>
            <p className="text-sm mt-0.5">
              {callDeclined ? <span className="text-[#f38ba8]">{t('voice.callDeclined')}</span>
                : isIncomingCall ? <span className="text-[#b5bac1]">{t('voice.incomingCall')}</span>
                : isObserving ? <span className="text-[#b5bac1]">{t('voice.callInProgress')}</span>
                : isConnected ? <CallTimer startTime={callStartTimeRef.current} />
                : <span className="text-[#b5bac1] flex items-center gap-1">{t('voice.calling')}<span className="calling-dots" /></span>
              }
            </p>
          </div>

          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-colors flex-shrink-0 ${showSettings ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:text-white hover:bg-[#404249]'}`}>
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {showSettings && (
            <div className="absolute top-2 right-14 w-64 bg-[#1e1f22] rounded-xl p-4 shadow-2xl border border-[#111214] z-10">
              <div className="mb-3">
                <label className="block text-[#b5bac1] text-xs font-semibold uppercase mb-2">{t('voice.inputVolumeLabel')}</label>
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-[#6c7086]" />
                  <input type="range" min="0" max="100" value={inputVolume} onChange={(e) => setInputVolume(Number(e.target.value))} className="flex-1 accent-[#5865f2]" />
                  <span className="text-xs text-[#b5bac1] w-7 text-right">{inputVolume}%</span>
                </div>
              </div>
              <div>
                <label className="block text-[#b5bac1] text-xs font-semibold uppercase mb-2">{t('voice.outputVolumeLabel')}</label>
                <div className="flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5 text-[#6c7086]" />
                  <input type="range" min="0" max="100" value={outputVolume} onChange={(e) => setOutputVolume(Number(e.target.value))} className="flex-1 accent-[#5865f2]" />
                  <span className="text-xs text-[#b5bac1] w-7 text-right">{outputVolume}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#232428] border-t border-[#1e1f22] py-3 px-4 flex-shrink-0">
          {callDeclined ? (
            <div className="flex justify-center">
              <span className="text-[#b5bac1] text-sm">{t('voice.disconnecting')}</span>
            </div>
          ) : isIncomingCall ? (
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <button onClick={onAcceptCall} className="w-14 h-14 rounded-full bg-[#23a55a] hover:bg-[#1a8a47] text-white flex items-center justify-center transition-colors shadow-lg">
                  <Phone className="w-6 h-6" />
                </button>
                <span className="text-xs text-[#b5bac1]">{t('voice.acceptCall')}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button onClick={onDeclineCall} className="w-14 h-14 rounded-full bg-[#f23f43] hover:bg-[#da373c] text-white flex items-center justify-center transition-colors shadow-lg">
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-xs text-[#b5bac1]">{t('voice.declineCall')}</span>
              </div>
            </div>
          ) : isObserving ? (
            <div className="flex justify-center">
              <button onClick={onJoinCall} className="h-12 px-8 rounded-full bg-[#23a55a] hover:bg-[#1a8a47] text-white flex items-center gap-2 font-medium transition-colors">
                <Phone className="w-5 h-5" />{t('voice.joinCall')}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={onToggleMute} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' : 'bg-[#404249] hover:bg-[#4e5058] text-[#b5bac1] hover:text-white'}`}>
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={onToggleDeafen} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${isDeafened ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' : 'bg-[#404249] hover:bg-[#4e5058] text-[#b5bac1] hover:text-white'}`}>
                    <Headphones className="w-5 h-5" />
                    {isDeafened && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-0.5 bg-white rotate-45 rounded" />}
                  </button>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={onToggleCamera} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCameraOn ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white' : 'bg-[#404249] hover:bg-[#4e5058] text-[#b5bac1] hover:text-white'}`}>
                    {isCameraOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={onToggleScreenShare} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isScreenSharing ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white' : 'bg-[#404249] hover:bg-[#4e5058] text-[#b5bac1] hover:text-white'}`}>
                    {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <button className="w-10 h-10 rounded-full bg-[#404249] hover:bg-[#4e5058] text-[#b5bac1] hover:text-white flex items-center justify-center transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              <button onClick={onDisconnect} className="h-10 px-5 rounded-full bg-[#f23f43] hover:bg-[#da373c] text-white flex items-center gap-2 font-medium transition-colors shadow-lg">
                <PhoneOff className="w-4 h-4" />
                <span className="text-sm">End</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // واجهة قناة الصوت الرئيسية
  return (
    <div className="flex-1 flex flex-col bg-[#1e1e2e] min-w-0 min-h-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#11111b] shadow-sm flex-shrink-0 bg-[#181825]">
        <div className="flex items-center gap-2 min-w-0">
          {onOpenMobileMenu && (
            <button onClick={onOpenMobileMenu} className="md:hidden text-[#bac2de] hover:text-[#cdd6f4] mr-2 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
              </svg>
            </button>
          )}
          <Volume2 className="w-5 h-5 text-[#a6adc8] flex-shrink-0" />
          <span className="font-semibold text-[#cdd6f4] truncate">{channel.name}</span>
          <div className="w-px h-5 bg-[#45475a] mx-1 hidden sm:block" />
          <span className="text-sm text-[#6c7086] truncate hidden sm:block">{connectedUsers.length} {t('general.connected')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className={`p-2 rounded transition-colors ${isMinimized ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#313244]'}`}>
            <ChevronDown className={`w-5 h-5 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded transition-colors ${showSettings ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#313244]'}`}>
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* منطقة الفيديو/الصوت */}
      {!isMinimized && (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#11111b]">
        <div className="h-full flex flex-col items-center justify-center p-4">
          {hasAnyVideo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full h-full">
              {isCameraOn && localCameraStream && (
                <VideoTile stream={localCameraStream} label={`${currentUser.displayName} (You)`} isMuted />
              )}
              {isScreenSharing && localScreenStream && (
                <VideoTile stream={localScreenStream} label={t('voice.yourScreen') || 'Your Screen'} isMuted />
              )}
              {isStreaming && localStreamStream && (
                <VideoTile stream={localStreamStream} label={`${currentUser.displayName} (Streaming)`} isMuted />
              )}
              {remoteStreams.map((remoteStream) => {
                const member = connectedUsers.find(u => u.id === remoteStream.userId);
                const label = remoteStream.isStreaming 
                  ? `${member?.displayName || remoteStream.userId} (Live)` 
                  : member?.displayName || remoteStream.userId;
                return <VideoTile key={remoteStream.userId} stream={remoteStream.stream} label={label} />;
              })}
              {enhancedConnectedUsers.filter(user => {
                if (user.id === currentUser.id && isCameraOn) return false;
                if (remoteStreams.some(rs => rs.userId === user.id)) return false;
                return true;
              }).map(user => (
                <div key={`avatar-${user.id}`} className="relative bg-[#181825] rounded-lg aspect-video flex flex-col items-center justify-center gap-3">
                  <UserAvatar user={user} size="xl" className="w-16 h-16 text-2xl" />
                  <span className="text-[#cdd6f4] font-medium text-sm">{user.displayName}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-8 w-full">
              {enhancedConnectedUsers.map(user => (
                <div key={user.id} className="flex flex-col items-center gap-2">
                  <UserAvatar user={user} size="xl" className="w-24 h-24 text-4xl" />
                  <span className="text-[#cdd6f4] font-medium text-lg">{user.displayName}</span>
                </div>
              ))}
            </div>
          )}

          {/* إعدادات الصوت */}
          {showSettings && (
            <div className="mx-4 mb-4 bg-[#181825] rounded-xl p-4 w-full mt-4">
              <h3 className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />{t('voice.audioSettings')}
              </h3>
              <div className="mb-5">
                <label className="block text-[#bac2de] text-xs font-semibold uppercase mb-2">{t('voice.inputVolumeLabel')}</label>
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-[#6c7086] flex-shrink-0" />
                  <input type="range" min="0" max="100" value={inputVolume} onChange={(e) => setInputVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-[#45475a] rounded-full accent-[#cba6f7]" />
                  <span className="text-xs text-[#bac2de] w-8 text-right">{inputVolume}%</span>
                </div>
              </div>
              <div>
                <label className="block text-[#bac2de] text-xs font-semibold uppercase mb-2">{t('voice.outputVolumeLabel')}</label>
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-[#6c7086] flex-shrink-0" />
                  <input type="range" min="0" max="100" value={outputVolume} onChange={(e) => setOutputVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-[#45475a] rounded-full accent-[#cba6f7]" />
                  <span className="text-xs text-[#bac2de] w-8 text-right">{outputVolume}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* أزرار التحكم */}
      <div className="bg-[#181825] p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
          <button onClick={onToggleMute} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-[#f38ba8] text-white shadow-lg shadow-[#f38ba8]/20' : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'}`}>
            {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button onClick={onToggleDeafen} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all relative ${isDeafened ? 'bg-[#f38ba8] text-white shadow-lg shadow-[#f38ba8]/20' : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'}`}>
            <Headphones className="w-4 h-4 md:w-5 md:h-5" />
            {isDeafened && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 md:w-8 h-0.5 bg-white rotate-45 rounded" />}
          </button>
          <button onClick={onToggleCamera} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${isCameraOn ? 'bg-[#a6e3a1] text-white' : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'}`}>
            {isCameraOn ? <VideoOff className="w-4 h-4 md:w-5 md:h-5" /> : <Video className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button onClick={onToggleScreenShare} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-[#cba6f7] text-white' : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'}`}>
            {isScreenSharing ? <MonitorOff className="w-4 h-4 md:w-5 md:h-5" /> : <Monitor className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button onClick={onToggleStreaming} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${isStreaming ? 'bg-[#f9e2af] text-black' : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'}`}>
            {isStreaming ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Monitor className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button onClick={onDisconnect} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#f38ba8] text-white flex items-center justify-center hover:bg-[#eba0ac] transition-all shadow-lg shadow-[#f38ba8]/20">
            <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
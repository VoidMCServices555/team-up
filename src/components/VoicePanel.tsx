import React, { useEffect, useState } from 'react';
import {
  PhoneOff,
  Video,
  VideoOff,
  Signal,
  Clock,
  Users,
  X,
  Radio } from
'lucide-react';
import { useI18n } from '../lib/i18n';
interface VoicePanelProps {
  channelName: string;
  serverName: string;
  onDisconnect: () => void;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera?: () => void;
  onToggleStreaming?: () => void;
  isCameraOn?: boolean;
  isStreaming?: boolean;
  joinedAt?: number;
  connectedUserCount?: number;
  userLimit?: number;
}
export function VoicePanel({
  channelName,
  serverName,
  onDisconnect,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleStreaming,
  isCameraOn = false,
  isStreaming = false,
  joinedAt,
  connectedUserCount = 0,
  userLimit
}: VoicePanelProps) {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!joinedAt) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - joinedAt) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [joinedAt]);
  const formatElapsed = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor(totalSeconds % 3600 / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };
  return (
    <div className="bg-[#181825] border-b border-[#11111b]">
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center font-bold text-xs">
            <Signal size={14} className="mr-1" />
            <span className={isDeafened ? 'text-[#f38ba8]' : 'text-[#a6e3a1]'}>
              {isDeafened ? t('voice.deafened') : t('voice.connected')}
            </span>
          </div>
          <button
            onClick={onDisconnect}
            className="text-[#bac2de] hover:text-[#f38ba8] transition-colors"
            title={t('voice.disconnect')}>
            
            <PhoneOff size={16} />
          </button>
        </div>
        <div className="text-[#bac2de] text-xs truncate px-0.5">
          <span className="font-semibold text-[#cdd6f4]">{channelName}</span> /{' '}
          {serverName}
        </div>

        {/* Timer & User Count Row */}
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          {joinedAt ?
          <div className="flex items-center gap-1 text-[10px] text-[#a6adc8] font-mono tabular-nums">
              <Clock size={10} className="text-[#a6e3a1]" />
              <span>{formatElapsed(elapsed)}</span>
            </div> :

          <div />
          }
          <div
            className="flex items-center gap-1 text-[10px] text-[#6c7086]"
            title={t('voice.connectedUsers')}>
            
            <Users size={10} />
            <span>
              {connectedUserCount}
              {userLimit && userLimit > 0 ? `/${userLimit}` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 px-2 pb-2">
        <button
          onClick={onToggleCamera}
          className={`flex items-center justify-center py-1.5 rounded transition-colors ${isCameraOn ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' : 'hover:bg-[#313244] text-[#bac2de] hover:text-[#cdd6f4]'}`}
          title={isCameraOn ? t('voice.stopCamera') : t('voice.startCamera')}>
          
          {isCameraOn ?
          <VideoOff size={18} className="mr-1.5" /> :

          <Video size={18} className="mr-1.5" />
          }
          <span className="text-xs font-medium">
            {isCameraOn ? t('voice.stop') : t('voice.video')}
          </span>
        </button>
        <button
          onClick={onToggleStreaming}
          className={`flex items-center justify-center py-1.5 rounded transition-colors ${isStreaming ? 'bg-[#f38ba8]/20 text-[#f38ba8]' : 'hover:bg-[#313244] text-[#bac2de] hover:text-[#cdd6f4]'}`}
          title={
          isStreaming ?
          t('voice.stopStreaming') :
          t('voice.startStreaming')
          }>
          
          {isStreaming ?
          <X size={18} className="mr-1.5" /> :

          <Radio size={18} className="mr-1.5" />
          }
          <span className="text-xs font-medium">
            {isStreaming ? t('voice.stop') : t('voice.stream')}
          </span>
        </button>
      </div>
    </div>);

}
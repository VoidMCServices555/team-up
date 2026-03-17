import React, { useRef, useEffect, useState } from 'react';
import { X, MonitorOff, Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface FloatingStreamProps {
  stream: MediaStream;
  label: string;
  onStopBroadcast?: () => void;
  onStopWatching?: () => void;
  isBroadcaster?: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function FloatingStream({ stream, label, onStopBroadcast, onStopWatching, isBroadcaster = false, isMinimized = false, onToggleMinimize }: FloatingStreamProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 w-16 h-16 bg-[#181825] rounded-full shadow-2xl border border-[#45475a] overflow-hidden z-50 cursor-pointer hover:scale-110 transition-transform" onClick={onToggleMinimize}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isBroadcaster || isAudioMuted}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-56 bg-[#1e1e2e] rounded-lg shadow-2xl border border-[#45475a] overflow-hidden z-50 flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative bg-[#11111b]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isBroadcaster || isAudioMuted}
          className="w-full h-full object-cover"
        />
        {/* Label */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm max-w-[80%] truncate">
          {label}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#181825] border-t border-[#45475a] px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          {!isBroadcaster && (
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isAudioMuted 
                  ? 'bg-[#f38ba8] text-white hover:bg-[#eba0ac]' 
                  : 'bg-[#313244] text-[#a6adc8] hover:bg-[#45475a]'
              }`}
              title={isAudioMuted ? t('voice.unmute') : t('voice.mute')}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            className="w-8 h-8 rounded-full bg-[#313244] text-[#a6adc8] hover:bg-[#45475a] flex items-center justify-center transition-colors"
            title={t('general.minimize')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          {isBroadcaster && onStopBroadcast && (
            <button
              onClick={onStopBroadcast}
              className="w-8 h-8 rounded-full bg-[#f38ba8] text-white flex items-center justify-center hover:bg-[#eba0ac] transition-colors"
              title={t('voice.stopStreaming')}
            >
              <MonitorOff className="w-4 h-4" />
            </button>
          )}
          {!isBroadcaster && onStopWatching && (
            <button
              onClick={onStopWatching}
              className="w-8 h-8 rounded-full bg-[#f38ba8] text-white flex items-center justify-center hover:bg-[#eba0ac] transition-colors"
              title={t('voice.stopWatching')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
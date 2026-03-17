import React, { useRef, useEffect } from 'react';
import { X, MonitorOff } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface FloatingStreamProps {
  stream: MediaStream;
  label: string;
  onStopBroadcast?: () => void;
  onStopWatching?: () => void;
  isBroadcaster?: boolean;
}

export function FloatingStream({ stream, label, onStopBroadcast, onStopWatching, isBroadcaster = false }: FloatingStreamProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="fixed bottom-4 right-4 w-80 h-48 bg-[#181825] rounded-lg shadow-2xl border border-[#45475a] overflow-hidden z-50">
      <div className="relative h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isBroadcaster}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
          {label}
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {isBroadcaster && onStopBroadcast && (
            <button
              onClick={onStopBroadcast}
              className="w-6 h-6 rounded bg-[#f38ba8] text-white flex items-center justify-center hover:bg-[#eba0ac] transition-colors"
              title={t('voice.stopStreaming')}
            >
              <MonitorOff className="w-3 h-3" />
            </button>
          )}
          {!isBroadcaster && onStopWatching && (
            <button
              onClick={onStopWatching}
              className="w-6 h-6 rounded bg-[#f38ba8] text-white flex items-center justify-center hover:bg-[#eba0ac] transition-colors"
              title={t('voice.stopWatching')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
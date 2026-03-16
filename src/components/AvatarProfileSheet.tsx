import React, { useEffect, useRef, createElement } from 'react';
import { X, Download, Camera } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { StatusText } from './StatusText';
import type { Member } from '../App';
interface AvatarProfileSheetProps {
  user: Member;
  isOpen: boolean;
  onClose: () => void;
  onEditAvatar?: () => void;
}
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    dotClass: string;
  }> =
{
  online: {
    label: 'Online',
    color: '#a6e3a1',
    dotClass: 'bg-[#a6e3a1]'
  },
  idle: {
    label: 'Idle',
    color: '#f9e2af',
    dotClass: 'bg-[#f9e2af]'
  },
  dnd: {
    label: 'Do Not Disturb',
    color: '#f38ba8',
    dotClass: 'bg-[#f38ba8]'
  },
  offline: {
    label: 'Invisible',
    color: '#6c7086',
    dotClass: 'bg-[#6c7086]'
  }
};
export function AvatarProfileSheet({
  user,
  isOpen,
  onClose,
  onEditAvatar
}: AvatarProfileSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);
  const handleDownload = () => {
    if (user.avatar) {
      // Download actual avatar image
      const link = document.createElement('a');
      link.href = user.avatar;
      link.download = `${user.username}-avatar.png`;
      link.click();
    } else {
      // Generate a colored canvas as fallback
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = user.avatarColor || '#cba6f7';
      ctx.beginPath();
      ctx.arc(128, 128, 128, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 96px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initials = (user.displayName || user.username || '?').
      substring(0, 2).
      toUpperCase();
      ctx.fillText(initials, 128, 128);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${user.username}-avatar.png`;
      link.click();
    }
  };
  const status = user.status || 'offline';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true" />
      

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-[320px] z-50 bg-[#181825] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Avatar Profile">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#313244] hover:bg-[#45475a] flex items-center justify-center text-[#bac2de] hover:text-[#cdd6f4] transition-colors z-10"
          aria-label="Close">
          
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Banner / color block */}
          <div
            className="h-24 w-full flex-shrink-0"
            style={{
              backgroundColor:
              user.bannerColor || user.avatarColor || '#cba6f7',
              backgroundImage: user.banner ? `url(${user.banner})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} />
          

          {/* Avatar — centered, overlapping banner */}
          <div className="flex justify-center -mt-20 px-6 pb-2">
            <div className="p-1.5 bg-[#181825] rounded-full shadow-xl">
              <div
                className="w-40 h-40 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-5xl flex-shrink-0"
                style={{
                  backgroundColor: user.avatarColor || '#cba6f7'
                }}>
                
                {user.avatar ?
                <img
                  src={user.avatar}
                  alt={user.displayName || user.username}
                  className="w-full h-full object-cover" /> :


                <span>
                    {(user.displayName || user.username || '?').
                  substring(0, 2).
                  toUpperCase()}
                  </span>
                }
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 pt-2 pb-6 space-y-4">
            {/* Name + discriminator */}
            <div className="text-center">
              <h2 className="text-[#cdd6f4] font-bold text-xl leading-tight">
                {user.displayName || user.username}
              </h2>
              <p className="text-[#6c7086] text-sm mt-0.5">
                {user.username}
                <span className="text-[#45475a]">#{user.discriminator}</span>
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusConfig.dotClass}`} />
              
              <span className="text-sm text-[#bac2de]">
                {statusConfig.label}
              </span>
            </div>

            {/* Custom status */}
            {user.customStatus &&
            <div className="bg-[#1e1e2e] rounded-lg px-4 py-2.5 text-center">
                <p className="text-[#bac2de] text-sm">
                  💬 <StatusText text={user.customStatus} />
                </p>
              </div>
            }

            {/* Divider */}
            <div className="h-px bg-[#313244]" />

            {/* About Me */}
            <div>
              <h3 className="text-[#a6adc8] text-xs font-bold uppercase tracking-wide mb-2">
                About Me
              </h3>
              <p className="text-[#cdd6f4] text-sm leading-relaxed whitespace-pre-wrap">
                {user.aboutMe ||
                <span className="text-[#6c7086] italic">No bio yet.</span>
                }
              </p>
            </div>
          </div>
        </div>

        {/* Bottom action buttons */}
        <div className="p-4 space-y-2 border-t border-[#313244] flex-shrink-0 bg-[#181825]">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] py-2.5 rounded-lg text-sm font-medium transition-colors">
            
            <Download size={16} />
            Download Photo
          </button>
          <button
            onClick={() => {
              onEditAvatar?.();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#cba6f7] hover:bg-[#b4befe] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            
            <Camera size={16} />
            Edit Avatar
          </button>
        </div>
      </div>
    </>);

}
import React from 'react';
import type { Member } from '../App';

interface UserAvatarProps {
  user?: Member;
  username?: string;
  color?: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
  serverAvatar?: string;
}

// ✅ Status indicator - بيستخدم SVG مع background transparent
// SVG يعمل clip للشكل بدل border, فمش محتاج يعرف لون الخلفية
function StatusDot({ status, size }: { status: string; size: string }) {
  const px: Record<string, number> = { sm: 12, md: 14, lg: 20, xl: 24 }
  const s = px[size] || 14

  // ✅ كل الـ SVGs بيستخدموا transparent background + clip-path
  // عشان يشتغلوا على أي خلفية بدون مشكلة
  if (status === 'online') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="8" fill="transparent" />
        <circle cx="8" cy="8" r="5" fill="#a6e3a1" />
      </svg>
    )
  }
  if (status === 'idle') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="8" fill="transparent" />
        {/* moon - circle مع circle أصغر cut منه */}
        <defs>
          <mask id={`idle-${s}`}>
            <circle cx="8" cy="8" r="5" fill="white" />
            <circle cx="11" cy="5" r="3.5" fill="black" />
          </mask>
        </defs>
        <circle cx="8" cy="8" r="5" fill="#f9e2af" mask={`url(#idle-${s})`} />
      </svg>
    )
  }
  if (status === 'dnd') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="8" fill="transparent" />
        <circle cx="8" cy="8" r="5" fill="#f38ba8" />
        <rect x="4.5" y="6.75" width="7" height="2.5" rx="1.25" fill="white" opacity="0.9" />
      </svg>
    )
  }
  // offline
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="8" fill="transparent" />
      <circle cx="8" cy="8" r="5" fill="#6c7086" />
      <circle cx="8" cy="8" r="2.5" fill="white" opacity="0.5" />
    </svg>
  )
}

export function UserAvatar({
  user, username, color, status, size = 'md',
  showStatus = false, className, serverAvatar,
}: UserAvatarProps) {
  const displayName = user?.displayName || user?.username || username || '?';
  const avatarUrl = serverAvatar || user?.avatar;
  const avatarColor = user?.avatarColor || color || '#cba6f7';
  const userStatus = user?.status || status || 'offline';

  const sizeClasses: Record<string, string> = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
  };
  const textSizes: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };
  const statusPos: Record<string, string> = {
    sm: '-bottom-0.5 -right-0.5',
    md: '-bottom-0.5 -right-0.5',
    lg: '-bottom-1 -right-1',
    xl: '-bottom-1 -right-1',
  };

  return (
    <div className={`relative inline-block ${sizeClasses[size]} ${className || ''}`}>
      <div
        className="rounded-full overflow-hidden w-full h-full flex items-center justify-center text-white font-medium"
        style={{ backgroundColor: avatarColor }}>
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          : <span className={textSizes[size]}>{displayName.substring(0, 2).toUpperCase()}</span>
        }
      </div>
      {showStatus && (
        // ✅ الـ color: inherit بيخلي الـ dot border يتوارث من الـ parent
        // فلو الخلفية اتغيرت (hover etc.) الـ border بيتغير معاها
        <div
          className={`absolute ${statusPos[size]}`}
          style={{ color: 'inherit' }}>
          <StatusDot status={userStatus} size={size} />
        </div>
      )}
    </div>
  );
}

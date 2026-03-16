import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquareIcon,
  MoreVerticalIcon,
  PhoneIcon,
  VideoIcon,
  UserMinusIcon,
  ShieldBanIcon } from
'lucide-react';
import { UserAvatar } from './UserAvatar';
import { StatusText } from './StatusText';
import { ConfirmDialog } from './ConfirmDialog';
import { Member } from '../App';
interface FriendRowProps {
  username: string;
  discriminator: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  statusText?: string;
  avatarColor?: string;
  onMessage?: () => void;
  onProfileClick?: (e: React.MouseEvent) => void;
  user?: Member;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onRemoveFriend?: () => void;
  onBlock?: () => void;
}
export function FriendRow({
  username,
  discriminator,
  status,
  statusText,
  avatarColor,
  onMessage,
  onProfileClick,
  user,
  onVoiceCall,
  onVideoCall,
  onRemoveFriend,
  onBlock
}: FriendRowProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      moreButtonRef.current &&
      !moreButtonRef.current.contains(e.target as Node))
      {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);
  // Close dropdown on Escape
  useEffect(() => {
    if (!showDropdown) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDropdown]);
  const handleConfirmRemove = () => {
    onRemoveFriend?.();
    setConfirmAction(null);
    setShowDropdown(false);
  };
  const handleConfirmBlock = () => {
    onBlock?.();
    setConfirmAction(null);
    setShowDropdown(false);
  };
  return (
    <>
      <div
        className="group flex items-center justify-between p-2.5 px-3 hover:bg-[#313244] hover:rounded-lg cursor-pointer border-t border-[#45475a] first:border-t-0 mx-2 mt-[1px]"
        onClick={onProfileClick}>
        
        <div className="flex items-center space-x-3">
          <UserAvatar
            user={user}
            username={username}
            status={status}
            color={avatarColor}
            className="flex-shrink-0"
            showStatus />
          
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <span className="text-[#cdd6f4] font-semibold mr-1">
                {username}
              </span>
              <span className="text-[#6c7086] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                #{discriminator}
              </span>
            </div>
            <span className="text-[#6c7086] text-xs font-medium">
              {statusText ? <StatusText text={statusText} /> : status}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage?.();
            }}
            className="w-9 h-9 rounded-full bg-[#181825] flex items-center justify-center text-[#bac2de] hover:text-[#cdd6f4] transition-colors"
            title="Message">
            
            <MessageSquareIcon
              size={18}
              fill="currentColor"
              className="text-[#bac2de]" />
            
          </button>
          <button
            className="w-9 h-9 rounded-full bg-[#181825] flex items-center justify-center text-[#bac2de] hover:text-[#cdd6f4] transition-colors"
            title="Start Voice Call"
            onClick={(e) => {
              e.stopPropagation();
              onVoiceCall?.();
            }}>
            
            <PhoneIcon
              size={18}
              fill="currentColor"
              className="text-[#bac2de]" />
            
          </button>
          <div className="relative">
            <button
              ref={moreButtonRef}
              className="w-9 h-9 rounded-full bg-[#181825] flex items-center justify-center text-[#bac2de] hover:text-[#cdd6f4] transition-colors"
              title="More"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}>
              
              <MoreVerticalIcon size={18} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown &&
            <div
              ref={dropdownRef}
              className="absolute top-full right-0 mt-1 w-52 bg-[#11111b] rounded-lg shadow-2xl border border-[#181825] z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
              onClick={(e) => e.stopPropagation()}>
              
                <button
                onClick={() => {
                  onVoiceCall?.();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white rounded-[4px] mx-1 transition-colors"
                style={{
                  width: 'calc(100% - 8px)'
                }}>
                
                  <PhoneIcon size={16} />
                  Start Voice Call
                </button>
                <button
                onClick={() => {
                  onVideoCall?.();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white rounded-[4px] mx-1 transition-colors"
                style={{
                  width: 'calc(100% - 8px)'
                }}>
                
                  <VideoIcon size={16} />
                  Start Video Call
                </button>

                <div className="h-px bg-[#313244] my-1 mx-2" />

                <button
                onClick={() => {
                  setConfirmAction('remove');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#f38ba8] hover:bg-[#f38ba8] hover:text-white rounded-[4px] mx-1 transition-colors"
                style={{
                  width: 'calc(100% - 8px)'
                }}>
                
                  <UserMinusIcon size={16} />
                  Remove Friend
                </button>
                <button
                onClick={() => {
                  setConfirmAction('block');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#f38ba8] hover:bg-[#f38ba8] hover:text-white rounded-[4px] mx-1 transition-colors"
                style={{
                  width: 'calc(100% - 8px)'
                }}>
                
                  <ShieldBanIcon size={16} />
                  Block
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmAction === 'remove'}
        title="Remove Friend"
        message={`Are you sure you want to remove ${username}#${discriminator} from your friends?`}
        confirmLabel="Remove Friend"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmAction(null)}
        isDestructive />
      
      <ConfirmDialog
        isOpen={confirmAction === 'block'}
        title="Block User"
        message={`Are you sure you want to block ${username}#${discriminator}? They will not be able to message you and will be removed from your friends list.`}
        confirmLabel="Block"
        onConfirm={handleConfirmBlock}
        onCancel={() => setConfirmAction(null)}
        isDestructive />
      
    </>);

}
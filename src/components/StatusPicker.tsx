import React, { useEffect, useState, useRef } from 'react';
import {
  Circle,
  Moon,
  MinusCircle,
  EyeOff,
  X,
  Smile,
  SmileIcon } from
'lucide-react';
import { useI18n } from '../lib/i18n';
import { EmojiPicker } from './EmojiPicker';
import { StatusText } from './StatusText';
interface StatusPickerProps {
  currentStatus: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  onStatusChange: (status: 'online' | 'idle' | 'dnd' | 'offline') => void;
  onCustomStatusChange: (text: string) => void;
  onClose: () => void;
  position?: {
    x: number;
    y: number;
  };
  currentUserId?: string;
}
const STATUS_OPTIONS = [
{
  value: 'online' as const,
  label: 'Online',
  icon: Circle,
  color: '#a6e3a1',
  description: 'You are available'
},
{
  value: 'idle' as const,
  label: 'Idle',
  icon: Moon,
  color: '#f9e2af',
  description: 'You may be away'
},
{
  value: 'dnd' as const,
  label: 'Do Not Disturb',
  icon: MinusCircle,
  color: '#f38ba8',
  description: 'No notifications'
},
{
  value: 'offline' as const,
  label: 'Invisible',
  icon: EyeOff,
  color: '#6c7086',
  description: 'Appear offline'
}];

export function StatusPicker({
  currentStatus,
  customStatus,
  onStatusChange,
  onCustomStatusChange,
  onClose,
  position,
  currentUserId
}: StatusPickerProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [editingCustom, setEditingCustom] = useState(false);
  const [customText, setCustomText] = useState(customStatus || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  const handleSaveCustom = () => {
    onCustomStatusChange(customText);
    setEditingCustom(false);
    setShowEmojiPicker(false);
  };
  const handleEmojiSelect = (emoji: string) => {
    setCustomText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };
  const style: React.CSSProperties = position ?
  {
    position: 'fixed',
    left: position.x,
    bottom: window.innerHeight - position.y + 8,
    zIndex: 60
  } :
  {};
  return (
    <div
      ref={ref}
      className="w-[300px] bg-[#11111b] rounded-lg shadow-2xl overflow-visible border border-[#181825] animate-in fade-in zoom-in-95 duration-150"
      style={style}>
      
      {/* Custom Status */}
      <div className="p-3 border-b border-[#181825] relative">
        {/* Emoji Picker positioned above */}
        {showEmojiPicker &&
        <div
          className="absolute bottom-full left-0 mb-2 z-[70]"
          onMouseDown={(e) => e.stopPropagation()}>
          
            <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
            currentUserId={currentUserId} />
          
          </div>
        }

        {editingCustom ?
        <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className={`flex-shrink-0 rounded transition-colors ${showEmojiPicker ? 'text-[#cba6f7]' : 'text-[#f9e2af] hover:text-[#cba6f7]'}`}
              title="Add emoji">
              
                <Smile size={18} />
              </button>
              <div className="flex-1 relative">
                <input
                ref={inputRef}
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t('status.whatUpTo')}
                className="w-full bg-[#1e1e2e] text-[#cdd6f4] text-sm rounded px-2 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-[#cba6f7]"
                autoFocus
                maxLength={128}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustom();
                  if (e.key === 'Escape') {
                    setEditingCustom(false);
                    setShowEmojiPicker(false);
                  }
                }} />
              
                <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors ${showEmojiPicker ? 'text-[#cba6f7]' : 'text-[#6c7086] hover:text-[#cdd6f4]'}`}
                title="Add emoji"
                type="button">
                
                  <SmileIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
              onClick={() => {
                setEditingCustom(false);
                setShowEmojiPicker(false);
              }}
              className="text-[#bac2de] text-xs hover:underline">
              
                {t('settings.cancel')}
              </button>
              <button
              onClick={handleSaveCustom}
              className="bg-[#cba6f7] text-white text-xs px-3 py-1 rounded hover:bg-[#b4befe] transition-colors">
              
                {t('status.save')}
              </button>
            </div>
          </div> :

        <button
          onClick={() => setEditingCustom(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1e1e2e] transition-colors text-left">
          
            <Smile size={18} className="text-[#f9e2af] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {customStatus ?
            <div className="flex items-center justify-between">
                  <span className="text-[#cdd6f4] text-sm truncate">
                    <StatusText text={customStatus} />
                  </span>
                  <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCustomStatusChange('');
                }}
                className="text-[#6c7086] hover:text-[#f38ba8] ml-2 flex-shrink-0">
                
                    <X size={14} />
                  </button>
                </div> :

            <span className="text-[#6c7086] text-sm">
                  {t('status.setCustom')}
                </span>
            }
            </div>
          </button>
        }
      </div>

      {/* Status Options */}
      <div className="p-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = currentStatus === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                onStatusChange(opt.value);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${isActive ? 'bg-[#cba6f7]/20' : 'hover:bg-[#1e1e2e]'}`}>
              
              <Icon
                size={16}
                style={{
                  color: opt.color
                }}
                className={opt.value === 'online' ? 'fill-current' : ''} />
              
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${isActive ? 'text-[#cdd6f4]' : 'text-[#bac2de]'}`}>
                  
                  {opt.label}
                </div>
                <div className="text-xs text-[#6c7086]">{opt.description}</div>
              </div>
              {isActive &&
              <div className="w-2 h-2 rounded-full bg-[#cba6f7]" />
              }
            </button>);

        })}
      </div>
    </div>);

}
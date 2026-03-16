import React, { useEffect, useState, useRef } from 'react';
import { PinIcon, XIcon } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { db } from '../lib/database';
import type { Message, Member } from '../App';
import { useI18n } from '../lib/i18n';
interface PinnedMessagesProps {
  contextId: string;
  messages: Message[];
  currentUser: Member;
  onClose: () => void;
  onUnpin: (messageId: string) => void;
  canPin: boolean;
}
export function PinnedMessages({
  contextId,
  messages,
  currentUser,
  onClose,
  onUnpin,
  canPin
}: PinnedMessagesProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const pinnedData = db.getPinnedMessages(contextId);
  const pinnedMessageIds = new Set(pinnedData.map((p) => p.messageId));
  const pinnedMessages = messages.filter((m) => pinnedMessageIds.has(m.id));
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  return (
    <div
      ref={ref}
      className="w-[420px] max-h-[600px] bg-[#11111b] rounded-lg shadow-2xl border border-[#181825] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#181825]">
        <div className="flex items-center gap-2">
          <PinIcon className="w-5 h-5 text-[#cba6f7]" />
          <h3 className="text-[#cdd6f4] font-semibold">{t('pins.title')}</h3>
          <span className="text-xs text-[#6c7086] bg-[#1e1e2e] px-1.5 py-0.5 rounded-full">
            {pinnedMessages.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-1 rounded hover:bg-[#1e1e2e]">
          
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Pinned Messages List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {pinnedMessages.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-[#181825] rounded-full flex items-center justify-center mb-4">
              <PinIcon className="w-8 h-8 text-[#45475a]" />
            </div>
            <p className="text-[#cdd6f4] font-medium mb-1">
              {t('pins.noPins')}
            </p>
            <p className="text-[#6c7086] text-sm">{t('pins.noPinsDesc')}</p>
          </div> :

        <div className="p-2 space-y-1">
            {pinnedMessages.map((message) =>
          <div
            key={message.id}
            className="bg-[#1e1e2e] rounded-lg p-3 group hover:bg-[#313244] transition-colors">
            
                <div className="flex items-start gap-3">
                  <UserAvatar user={message.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#cdd6f4] font-medium text-sm">
                        {message.author.displayName}
                      </span>
                      <span className="text-[10px] text-[#6c7086]">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-[#bac2de] text-sm break-words line-clamp-3">
                      {message.content}
                    </p>
                    {message.attachments && message.attachments.length > 0 &&
                <p className="text-xs text-[#6c7086] mt-1">
                        📎 {message.attachments.length} attachment
                        {message.attachments.length > 1 ? 's' : ''}
                      </p>
                }
                  </div>
                  {canPin &&
              <button
                onClick={() => onUnpin(message.id)}
                className="opacity-0 group-hover:opacity-100 text-[#6c7086] hover:text-[#f38ba8] transition-all p-1 rounded hover:bg-[#11111b]"
                title={t('pins.unpin')}>
                
                      <XIcon className="w-4 h-4" />
                    </button>
              }
                </div>
              </div>
          )}
          </div>
        }
      </div>
    </div>);

}
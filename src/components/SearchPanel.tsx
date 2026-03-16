import React, { useEffect, useState, useRef } from 'react';
import {
  SearchIcon,
  XIcon,
  UserIcon,
  MessageSquareIcon,
  CalendarIcon } from
'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useI18n } from '../lib/i18n';
import type { Message, Member } from '../App';
interface SearchPanelProps {
  messages: Message[];
  members?: Member[];
  onClose: () => void;
  onMemberClick?: (member: Member, e: React.MouseEvent) => void;
  channelName?: string;
  isDM?: boolean;
}
type SearchTab = 'messages' | 'members';
export function SearchPanel({
  messages,
  members,
  onClose,
  onMemberClick,
  channelName,
  isDM
}: SearchPanelProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('messages');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  const filteredMessages = query.trim() ?
  messages.filter(
    (m) =>
    m.content.toLowerCase().includes(query.toLowerCase()) ||
    m.author.displayName.toLowerCase().includes(query.toLowerCase()) ||
    m.author.username.toLowerCase().includes(query.toLowerCase())
  ) :
  [];
  const filteredMembers =
  query.trim() && members ?
  members.filter(
    (m) =>
    m.displayName.toLowerCase().includes(query.toLowerCase()) ||
    m.username.toLowerCase().includes(query.toLowerCase())
  ) :
  [];
  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return (
        t('general.today') +
        ' ' +
        d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        }));

    } else if (diffDays === 1) {
      return (
        t('general.yesterday') +
        ' ' +
        d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        }));

    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
    regex.test(part) ?
    <mark key={i} className="bg-[#cba6f7]/30 text-[#cdd6f4] rounded px-0.5">
          {part}
        </mark> :

    part

    );
  };
  return (
    <div
      ref={ref}
      className="w-[480px] max-h-[600px] bg-[#11111b] rounded-lg shadow-2xl border border-[#181825] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      
      {/* Search Input */}
      <div className="p-3 border-b border-[#181825]">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6c7086]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t('chat.searchIn')} ${isDM ? '@' : '#'}${channelName || ''}...`}
            className="w-full bg-[#1e1e2e] text-[#cdd6f4] rounded-lg pl-10 pr-10 py-2.5 placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7] text-sm" />
          
          {query &&
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7086] hover:text-[#cdd6f4]">
            
              <XIcon className="w-4 h-4" />
            </button>
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#181825]">
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'messages' ? 'border-[#cba6f7] text-[#cdd6f4]' : 'border-transparent text-[#6c7086] hover:text-[#bac2de]'}`}>
          
          <MessageSquareIcon className="w-4 h-4" />
          {t('chat.messages')}
          {query && filteredMessages.length > 0 &&
          <span className="text-xs bg-[#1e1e2e] px-1.5 py-0.5 rounded-full">
              {filteredMessages.length}
            </span>
          }
        </button>
        {members && !isDM &&
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'members' ? 'border-[#cba6f7] text-[#cdd6f4]' : 'border-transparent text-[#6c7086] hover:text-[#bac2de]'}`}>
          
            <UserIcon className="w-4 h-4" />
            {t('chat.members')}
            {query && filteredMembers.length > 0 &&
          <span className="text-xs bg-[#1e1e2e] px-1.5 py-0.5 rounded-full">
                {filteredMembers.length}
              </span>
          }
          </button>
        }
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!query.trim() ?
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <SearchIcon className="w-12 h-12 text-[#45475a] mb-4" />
            <p className="text-[#6c7086] text-sm">{t('chat.startTyping')}</p>
          </div> :
        activeTab === 'messages' ?
        filteredMessages.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <SearchIcon className="w-10 h-10 text-[#45475a] mb-3" />
              <p className="text-[#cdd6f4] font-medium mb-1">
                {t('chat.noResults')}
              </p>
              <p className="text-[#6c7086] text-sm">{t('chat.tryDifferent')}</p>
            </div> :

        <div className="p-2 space-y-1">
              {filteredMessages.map((message) =>
          <div
            key={message.id}
            className="bg-[#1e1e2e] rounded-lg p-3 hover:bg-[#313244] transition-colors cursor-pointer">
            
                  <div className="flex items-start gap-3">
                    <UserAvatar user={message.author} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[#cdd6f4] font-medium text-sm">
                          {message.author.displayName}
                        </span>
                        <span className="text-[10px] text-[#6c7086] flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-[#bac2de] text-sm break-words line-clamp-2">
                        {highlightMatch(message.content)}
                      </p>
                    </div>
                  </div>
                </div>
          )}
            </div> :

        filteredMembers.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <UserIcon className="w-10 h-10 text-[#45475a] mb-3" />
            <p className="text-[#cdd6f4] font-medium mb-1">
              {t('chat.noMembers')}
            </p>
            <p className="text-[#6c7086] text-sm">{t('chat.tryDifferent')}</p>
          </div> :

        <div className="p-2 space-y-0.5">
            {filteredMembers.map((member) =>
          <div
            key={member.id}
            onClick={(e) => onMemberClick?.(member, e)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1e1e2e] cursor-pointer transition-colors">
            
                <UserAvatar user={member} size="sm" showStatus />
                <div className="flex-1 min-w-0">
                  <p className="text-[#cdd6f4] font-medium text-sm truncate">
                    {highlightMatch(member.displayName)}
                  </p>
                  <p className="text-[#6c7086] text-xs truncate">
                    {highlightMatch(member.username)}#{member.discriminator}
                  </p>
                </div>
                <span
              className={`text-xs capitalize px-2 py-0.5 rounded-full ${member.status === 'online' ? 'bg-[#a6e3a1]/10 text-[#a6e3a1]' : member.status === 'idle' ? 'bg-[#f9e2af]/10 text-[#f9e2af]' : member.status === 'dnd' ? 'bg-[#f38ba8]/10 text-[#f38ba8]' : 'bg-[#6c7086]/10 text-[#6c7086]'}`}>
              
                  {member.status === 'online' ?
              t('chat.online') :
              member.status === 'idle' ?
              t('chat.idle') :
              member.status === 'dnd' ?
              t('chat.dnd') :
              t('chat.offline')}
                </span>
              </div>
          )}
          </div>
        }
      </div>
    </div>);

}
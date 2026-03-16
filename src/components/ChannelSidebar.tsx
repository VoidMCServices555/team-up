import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Hash, Volume2, Plus, Settings,
  Mic, Headphones, MicOff, Trash2, X, Users,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { VoicePanel } from './VoicePanel';
import { StatusPicker } from './StatusPicker';
import { ServerDropdownMenu } from './ServerDropdownMenu';
import { db, VoiceState, Category } from '../lib/database';
import type { ConnectedVoiceState, Channel, Member } from '../App';
import { useI18n } from '../lib/i18n';
import { StatusText } from './StatusText';

interface VoiceConnectedUser {
  member: Member;
  isMuted?: boolean;
  isDeafened?: boolean;
}

interface ChannelItemProps {
  name: string;
  type: 'text' | 'voice';
  active?: boolean;
  connected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  connectedUsers?: VoiceConnectedUser[];
  onUserClick?: (member: Member, e: React.MouseEvent) => void;
  canManage?: boolean;
  userLimit?: number;
  connectedCount?: number;
  onEditLimit?: () => void;
}

function ChannelItem({ name, type, active, connected, onClick, onDelete, connectedUsers, onUserClick, canManage, userLimit, connectedCount = 0, onEditLimit }: ChannelItemProps) {
  const isFull = type === 'voice' && userLimit && userLimit > 0 && connectedCount >= userLimit;
  return (
    <div className="mb-[1px]">
      <div onClick={onClick} className={`group flex items-center px-2 py-1 mx-2 rounded cursor-pointer relative ${active ? 'bg-[#313244] text-[#cdd6f4]' : isFull ? 'text-[#585b70] hover:bg-[#313244]/50 cursor-not-allowed' : 'text-[#6c7086] hover:bg-[#313244] hover:text-[#cdd6f4]'}`}>
        {type === 'text' ? <Hash size={20} className="mr-1.5 flex-shrink-0 text-[#6c7086]" /> : <Volume2 size={20} className={`mr-1.5 flex-shrink-0 ${isFull ? 'text-[#585b70]' : 'text-[#6c7086]'}`} />}
        <span className={`font-medium truncate flex-1 ${active || connected ? 'text-[#cdd6f4]' : ''}`}>{name}</span>
        {type === 'voice' && connectedCount > 0 && <span className={`text-[10px] font-medium mr-1 ${isFull ? 'text-[#f38ba8]' : 'text-[#6c7086]'}`}>{connectedCount}{userLimit && userLimit > 0 ? `/${userLimit}` : ''}</span>}
        {type === 'voice' && connectedCount === 0 && userLimit && userLimit > 0 && <span className="text-[10px] text-[#585b70] mr-1">0/{userLimit}</span>}
        {canManage && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {type === 'voice' && onEditLimit && <button onClick={(e) => { e.stopPropagation(); onEditLimit(); }} className="text-[#bac2de] hover:text-[#cdd6f4] p-1" title="Edit User Limit"><Users size={14} /></button>}
            {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[#bac2de] hover:text-[#f38ba8] p-1" title="Delete Channel"><Trash2 size={14} /></button>}
            <button className="text-[#bac2de] hover:text-[#cdd6f4] p-1"><Settings size={14} /></button>
          </div>
        )}
      </div>
      {connectedUsers && connectedUsers.length > 0 && (
        <div className="ml-4 mt-1 space-y-0.5 mb-2">
          {connectedUsers.map((cu, i) => (
            <div key={cu.member.id || i} onClick={(e) => onUserClick?.(cu.member, e)} className="flex items-center px-2 py-1 mx-2 rounded hover:bg-[#313244] cursor-pointer group/user">
              <UserAvatar user={cu.member} size="sm" showStatus className="w-6 h-6 text-[10px] mr-2" />
              <span className="text-[#cdd6f4] text-sm truncate opacity-90 flex-1">{cu.member.displayName || cu.member.username}</span>
              {(cu.isMuted || cu.isDeafened) && <div className="flex items-center text-[#f38ba8]">{cu.isDeafened ? <Headphones size={14} className="ml-1" /> : <MicOff size={14} className="ml-1" />}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditLimitModal({ channelName, currentLimit, onSave, onClose }: { channelName: string; currentLimit: number | undefined; onSave: (limit: number | undefined) => void; onClose: () => void }) {
  const [limitValue, setLimitValue] = useState(currentLimit && currentLimit > 0 ? currentLimit.toString() : '');
  const [isUnlimited, setIsUnlimited] = useState(!currentLimit || currentLimit === 0);
  const handleSave = () => { if (isUnlimited) { onSave(undefined); } else { const num = parseInt(limitValue, 10); onSave(num > 0 ? num : undefined); } onClose(); };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-150">
      <div className="bg-[#1e1e2e] rounded-lg shadow-2xl w-80 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#cdd6f4]">User Limit — #{channelName}</h3>
            <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4]"><X size={16} /></button>
          </div>
          <div className="space-y-3">
            <label className={`flex items-center gap-3 p-2.5 rounded cursor-pointer border transition-colors ${isUnlimited ? 'bg-[#313244] border-[#cba6f7]/30' : 'border-transparent hover:bg-[#313244]/50'}`} onClick={() => setIsUnlimited(true)}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isUnlimited ? 'border-[#cba6f7]' : 'border-[#6c7086]'}`}>{isUnlimited && <div className="w-2 h-2 rounded-full bg-[#cba6f7]" />}</div>
              <div><div className="text-sm text-[#cdd6f4] font-medium">No Limit</div><div className="text-xs text-[#6c7086]">Unlimited users can join</div></div>
            </label>
            <label className={`flex items-center gap-3 p-2.5 rounded cursor-pointer border transition-colors ${!isUnlimited ? 'bg-[#313244] border-[#cba6f7]/30' : 'border-transparent hover:bg-[#313244]/50'}`} onClick={() => setIsUnlimited(false)}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!isUnlimited ? 'border-[#cba6f7]' : 'border-[#6c7086]'}`}>{!isUnlimited && <div className="w-2 h-2 rounded-full bg-[#cba6f7]" />}</div>
              <div className="flex-1"><div className="text-sm text-[#cdd6f4] font-medium">Set Limit</div>{!isUnlimited && <input type="number" min="1" max="99" value={limitValue} onChange={(e) => setLimitValue(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="e.g. 5" className="mt-1.5 w-full bg-[#11111b] text-[#cdd6f4] text-sm px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#cba6f7] placeholder-[#585b70]" autoFocus />}</div>
            </label>
          </div>
        </div>
        <div className="bg-[#181825] p-3 flex justify-end gap-2">
          <button onClick={onClose} className="text-[#cdd6f4] text-xs font-medium hover:underline px-3 py-1.5">Cancel</button>
          <button onClick={handleSave} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-1.5 rounded text-xs font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

interface ChannelSidebarProps {
  server: { id: string; name: string; icon?: string; channels: Array<{ id: string; name: string; type: 'text' | 'voice'; userLimit?: number }>; members: Member[] };
  selectedChannel: { id: string; name: string; type: 'text' | 'voice' } | null;
  onSelectChannel: (channel: { id: string; name: string; type: 'text' | 'voice' }) => void;
  currentUser: Member;
  onOpenSettings: () => void;
  onAddChannel: (categoryId?: string) => void;
  onDeleteChannel: (channelId: string) => void;
  onOpenServerSettings: () => void;
  onCreateCategory: () => void;
  onEditServerProfile: () => void;
  connectedVoice: ConnectedVoiceState | null;
  onJoinVoice: (channel: Channel) => void;
  onLeaveVoice: () => void;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onProfileClick?: (e: React.MouseEvent) => void;
  onMemberClick?: (member: Member, e: React.MouseEvent) => void;
  onStatusChange?: (status: 'online' | 'idle' | 'dnd' | 'offline') => void;
  onCustomStatusChange?: (text: string) => void;
  selectedVoiceChannelId?: string | null;
  onSelectVoiceChannel?: (channel: Channel) => void;
  onDeleteServer: () => void;
  voiceStates: VoiceState[];
  onToggleScreenShare?: () => void;
  onToggleCamera?: () => void;
  isScreenSharing?: boolean;
  isCameraOn?: boolean;
  callStartTime?: number | null;
  onUpdateChannelLimit?: (channelId: string, limit: number | undefined) => void;
  onBack?: () => void;
}

export function ChannelSidebar({
  server, selectedChannel, onSelectChannel, currentUser, onOpenSettings,
  onAddChannel, onDeleteChannel, onOpenServerSettings, onCreateCategory,
  onEditServerProfile, connectedVoice, onJoinVoice, onLeaveVoice,
  isMuted, isDeafened, onToggleMute, onToggleDeafen, onProfileClick,
  onMemberClick, onStatusChange, onCustomStatusChange, selectedVoiceChannelId,
  onSelectVoiceChannel, onDeleteServer, voiceStates, onToggleScreenShare,
  onToggleCamera, isScreenSharing, isCameraOn, callStartTime,
  onUpdateChannelLimit, onBack,
}: ChannelSidebarProps) {
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [editLimitChannelId, setEditLimitChannelId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const isOwner = server.members[0]?.id === currentUser.id;

  // ✅ حساب عدد الأونلاين للـ invite embed
  const onlineCount = server.members.filter((m) => m.status !== 'offline').length;

  useEffect(() => {
    db.getCategories(server.id).then(setCategories);
  }, [server.id]);

  useEffect(() => {
    if (isOwner) { setIsAdmin(true); return; }
    db.getMemberRoles(server.id, currentUser.id).then((roles) => {
      setIsAdmin(roles.some((r) => r.permissions.administrator || r.permissions.manageChannels));
    });
  }, [server.id, currentUser.id, isOwner]);

  useEffect(() => {
    const interval = setInterval(() => {
      db.getCategories(server.id).then(setCategories);
    }, 3000);
    return () => clearInterval(interval);
  }, [server.id]);

  const categorizedChannelIds = new Set(categories.flatMap((c) => c.channelIds));
  const textChannels = server.channels.filter((c) => c.type === 'text' && !categorizedChannelIds.has(c.id));
  const voiceChannels = server.channels.filter((c) => c.type === 'voice' && !categorizedChannelIds.has(c.id));

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => { const next = new Set(prev); if (next.has(catId)) next.delete(catId); else next.add(catId); return next; });
  };

  const deleteCategory = async (catId: string) => {
    if (confirm('Delete this category? Channels will be uncategorized.')) {
      await db.deleteCategory(server.id, catId);
      const cats = await db.getCategories(server.id);
      setCategories(cats);
    }
  };

  const getVoiceConnectedUsers = (channelId: string): VoiceConnectedUser[] => {
    return voiceStates.filter((vs) => vs.channelId === channelId && vs.serverId === server.id)
      .map((state) => { const member = server.members.find((m) => m.id === state.userId); if (!member) return null; return { member, isMuted: state.isMuted, isDeafened: state.isDeafened }; })
      .filter(Boolean) as VoiceConnectedUser[];
  };

  const getVoiceConnectedCount = (channelId: string): number =>
    voiceStates.filter((vs) => vs.channelId === channelId && vs.serverId === server.id).length;

  const currentVoiceUserCount = connectedVoice ? voiceStates.filter((vs) => vs.channelId === connectedVoice.channelId).length : 0;
  const currentVoiceChannelData = connectedVoice ? server.channels.find((c) => c.id === connectedVoice.channelId) : null;

  const handleChannelClick = (channel: { id: string; name: string; type: 'text' | 'voice'; userLimit?: number }) => {
    if (channel.type === 'text') { onSelectChannel(channel); }
    else { if (onSelectVoiceChannel) onSelectVoiceChannel(channel as Channel); else onJoinVoice(channel as Channel); }
  };

  const editLimitChannel = editLimitChannelId ? server.channels.find((c) => c.id === editLimitChannelId) : null;

  return (
    <div className="w-full md:w-60 bg-[#181825] flex flex-col relative">
      {/* Server Header */}
      <div onClick={() => setIsMenuOpen(!isMenuOpen)} className={`h-12 px-4 flex items-center justify-between border-b border-[#11111b] shadow-sm hover:bg-[#313244] cursor-pointer transition-colors ${isMenuOpen ? 'bg-[#313244]' : ''}`}>
        <div className="flex items-center min-w-0 flex-1">
          {onBack && <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden mr-2 text-[#bac2de] hover:text-[#cdd6f4] p-1 -ml-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>}
          <span className="font-semibold text-[#cdd6f4] truncate">{server.name}</span>
        </div>
        {isMenuOpen ? <X size={20} className="text-[#cdd6f4] flex-shrink-0" /> : <ChevronDown size={20} className="text-[#cdd6f4] flex-shrink-0" />}
      </div>

      {/* ✅ ServerDropdownMenu مع الـ props الجديدة */}
      <ServerDropdownMenu
        isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} serverId={server.id}
        serverName={server.name}
        serverMemberCount={server.members.length}
        serverOnlineCount={onlineCount}
        serverIcon={server.icon}
        currentUser={currentUser as any} onServerSettings={onOpenServerSettings}
        onCreateChannel={onAddChannel} onCreateCategory={onCreateCategory}
        onNotificationSettings={() => {}} onPrivacySettings={() => {}}
        onEditServerProfile={onEditServerProfile} onLeaveServer={onDeleteServer}
        onDeleteServer={onDeleteServer} isOwner={isOwner}
      />

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto pt-4 custom-scrollbar">
        {categories.map((cat) => {
          const isCollapsed = collapsedCategories.has(cat.id);
          const catChannels = server.channels.filter((c) => cat.channelIds.includes(c.id));
          return (
            <div key={cat.id} className="mb-2">
              <div className="flex items-center justify-between px-2 mb-1 group cursor-pointer" onClick={() => toggleCategory(cat.id)}>
                <div className="flex items-center gap-1">
                  {isCollapsed ? <ChevronRight size={12} className="text-[#a6adc8]" /> : <ChevronDown size={12} className="text-[#a6adc8]" />}
                  <span className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide">{cat.name}</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onAddChannel(cat.id); }} className="text-[#a6adc8] hover:text-[#cdd6f4] p-0.5" title="Add Channel"><Plus size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="text-[#a6adc8] hover:text-[#f38ba8] p-0.5" title="Delete Category"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
              {!isCollapsed && catChannels.map((channel) => (
                <ChannelItem
                  key={channel.id} name={channel.name} type={channel.type}
                  active={selectedChannel?.id === channel.id || selectedVoiceChannelId === channel.id}
                  connected={connectedVoice?.channelId === channel.id}
                  onClick={() => handleChannelClick(channel)}
                  onDelete={() => onDeleteChannel(channel.id)}
                  connectedUsers={getVoiceConnectedUsers(channel.id)}
                  connectedCount={getVoiceConnectedCount(channel.id)}
                  userLimit={(channel as any).userLimit}
                  onUserClick={onMemberClick} canManage={isAdmin}
                  onEditLimit={isAdmin && channel.type === 'voice' ? () => setEditLimitChannelId(channel.id) : undefined}
                />
              ))}
            </div>
          );
        })}

        {textChannels.length > 0 && (
          <div className="px-2 mb-4">
            <div className="flex items-center justify-between px-2 mb-1 group">
              <span className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide">{t('general.textChannels')}</span>
              {isAdmin && <button onClick={() => onAddChannel()} className="text-[#a6adc8] hover:text-[#cdd6f4] opacity-0 group-hover:opacity-100 transition-opacity" title="Create Channel"><Plus size={14} className="ml-auto cursor-pointer" /></button>}
            </div>
            {textChannels.map((channel) => (
              <ChannelItem key={channel.id} name={channel.name} type="text" active={selectedChannel?.id === channel.id} onClick={() => onSelectChannel(channel)} onDelete={() => onDeleteChannel(channel.id)} canManage={isAdmin} />
            ))}
          </div>
        )}

        {voiceChannels.length > 0 && (
          <div className="px-2">
            <div className="flex items-center justify-between px-2 mb-1 group">
              <span className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide">{t('general.voiceChannels')}</span>
              {isAdmin && <button onClick={() => onAddChannel()} className="text-[#a6adc8] hover:text-[#cdd6f4] opacity-0 group-hover:opacity-100 transition-opacity" title="Create Channel"><Plus size={14} className="ml-auto cursor-pointer" /></button>}
            </div>
            {voiceChannels.map((channel) => (
              <ChannelItem
                key={channel.id} name={channel.name} type="voice"
                active={selectedVoiceChannelId === channel.id}
                connected={connectedVoice?.channelId === channel.id}
                onClick={() => handleChannelClick(channel)}
                onDelete={() => onDeleteChannel(channel.id)}
                connectedUsers={getVoiceConnectedUsers(channel.id)}
                connectedCount={getVoiceConnectedCount(channel.id)}
                userLimit={(channel as any).userLimit}
                onUserClick={onMemberClick} canManage={isAdmin}
                onEditLimit={isAdmin ? () => setEditLimitChannelId(channel.id) : undefined}
              />
            ))}
          </div>
        )}

        {server.channels.length === 0 && isAdmin && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#a6adc8] mb-2">{t('general.noChannels')}</p>
            <button onClick={() => onAddChannel()} className="text-xs text-[#89b4fa] hover:underline">{t('general.createFirst')}</button>
          </div>
        )}
      </div>

      {/* Voice Panel */}
      {connectedVoice && (
        <VoicePanel
          channelName={connectedVoice.channelName} serverName={connectedVoice.serverName}
          onDisconnect={onLeaveVoice} isMuted={isMuted} isDeafened={isDeafened}
          onToggleMute={onToggleMute} onToggleDeafen={onToggleDeafen}
          onToggleScreenShare={onToggleScreenShare} onToggleCamera={onToggleCamera}
          isScreenSharing={isScreenSharing} isCameraOn={isCameraOn}
          joinedAt={callStartTime ?? connectedVoice.joinedAt}
          connectedUserCount={currentVoiceUserCount} userLimit={currentVoiceChannelData?.userLimit}
        />
      )}

      {/* User Panel */}
      <div className="h-[52px] bg-[#181825] px-2 flex items-center gap-2 flex-shrink-0 relative">
        <div className="flex items-center gap-2 flex-1 min-w-0 rounded px-1 py-0.5 cursor-pointer hover:bg-[#1e1e2e] transition-colors">
          <div onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }} className="relative cursor-pointer">
            <UserAvatar user={currentUser as any} size="sm" showStatus />
          </div>
          <div className="flex-1 min-w-0" onClick={onProfileClick}>
            <p className="text-sm font-medium text-[#cdd6f4] truncate">{currentUser.displayName}</p>
            <p className="text-xs text-[#bac2de] truncate cursor-pointer hover:text-[#cdd6f4] transition-colors" onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}>
              {(currentUser as any).customStatus ? <StatusText text={(currentUser as any).customStatus} /> : `#${currentUser.discriminator}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleMute} className={`p-1.5 rounded transition-colors ${isMuted || isDeafened ? 'text-[#f38ba8] hover:bg-[#1e1e2e]' : 'text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e]'}`} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || isDeafened ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button onClick={onToggleDeafen} className={`p-1.5 rounded transition-colors relative ${isDeafened ? 'text-[#f38ba8] hover:bg-[#1e1e2e]' : 'text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e]'}`} title={isDeafened ? 'Undeafen' : 'Deafen'}>
            <Headphones size={18} />
            {isDeafened && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-[#f38ba8] rotate-45" />}
          </button>
          <button onClick={onOpenSettings} className="p-1.5 text-[#bac2de] hover:text-[#cdd6f4] hover:bg-[#1e1e2e] rounded transition-colors"><Settings size={18} /></button>
        </div>

        {showStatusPicker && onStatusChange && onCustomStatusChange && (
          <div className="absolute bottom-full left-0 mb-2 z-50">
            <StatusPicker currentStatus={currentUser.status} customStatus={(currentUser as any).customStatus} onStatusChange={(s) => { onStatusChange(s); setShowStatusPicker(false); }} onCustomStatusChange={onCustomStatusChange} onClose={() => setShowStatusPicker(false)} currentUserId={currentUser.id} />
          </div>
        )}
      </div>

      {editLimitChannel && (
        <EditLimitModal channelName={editLimitChannel.name} currentLimit={(editLimitChannel as any).userLimit} onSave={(limit) => { onUpdateChannelLimit?.(editLimitChannel.id, limit); }} onClose={() => setEditLimitChannelId(null)} />
      )}
    </div>
  );
}

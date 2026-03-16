import React, { useEffect, useState } from 'react';
import {
  Trash2, X, Shield, Users, UserPlus, Search, MoreVertical,
  Plus, Check, ChevronRight, Hash, Volume2, MessageSquare,
  Mic, Image, Settings2, Copy, RefreshCw,
} from 'lucide-react';
import { Server, Member, Channel } from '../App';
import { UserAvatar } from './UserAvatar';
import { db, Role, DEFAULT_ROLE_PERMISSIONS } from '../lib/database';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server;
  onUpdateServer: (serverId: string, updates: Partial<Server>) => void;
  onDeleteServer: (serverId: string) => void;
}

const ROLE_COLORS = [
  '#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#94e2d5',
  '#89dceb', '#74c7ec', '#89b4fa', '#b4befe', '#cba6f7',
  '#f5c2e7', '#f2cdcd', '#9399b2', '#585b70', '#45475a',
];

export function ServerSettingsModal({
  isOpen, onClose, server, onUpdateServer, onDeleteServer,
}: ServerSettingsModalProps) {
  const [name, setName] = useState(server.name);
  const [serverIcon, setServerIcon] = useState<string | undefined>(server.icon);
  const [activeTab, setActiveTab] = useState('Overview');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSubTab, setRoleSubTab] = useState<'display' | 'permissions' | 'members'>('display');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [memberRolesMap, setMemberRolesMap] = useState<Record<string, Role[]>>({});

  const refreshRoles = async () => {
    const r = await db.getRoles(server.id);
    setRoles(r);
  };

  const refreshMemberRoles = async () => {
    const map: Record<string, Role[]> = {};
    for (const member of server.members) {
      map[member.id] = await db.getMemberRoles(server.id, member.id);
    }
    setMemberRolesMap(map);
  };

  useEffect(() => {
    setName(server.name);
    setServerIcon(server.icon);
    refreshRoles();
  }, [server, isOpen]);

  useEffect(() => {
    if (activeTab === 'Members') refreshMemberRoles();
  }, [activeTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updates: Partial<Server> = {};
    if (name.trim() && name !== server.name) updates.name = name;
    if (serverIcon !== server.icon) updates.icon = serverIcon;
    if (Object.keys(updates).length > 0) onUpdateServer(server.id, updates);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${server.name}? This cannot be undone.`)) {
      onDeleteServer(server.id);
      onClose();
    }
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const invite = await db.createInvite(server.id, server.members[0]?.id || '');
      setInviteCode(invite.code);
    } catch (err) {
      console.error('Failed to create invite:', err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const handleCreateRole = async () => {
    const newRole: Role = {
      id: crypto.randomUUID(),
      serverId: server.id,
      name: 'new role',
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      position: roles.length,
      hoist: false,
      permissions: { ...DEFAULT_ROLE_PERMISSIONS },
      memberIds: [],
    };
    await db.saveRole(newRole);
    await refreshRoles();
    setSelectedRoleId(newRole.id);
    setRoleSubTab('display');
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm('Delete this role? Members will lose it.')) {
      await db.deleteRole(server.id, roleId);
      await refreshRoles();
      setSelectedRoleId(null);
    }
  };

  const handleUpdateRole = async (roleId: string, updates: Partial<Role>) => {
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      await db.saveRole({ ...role, ...updates });
      await refreshRoles();
    }
  };

  const handleToggleRoleMember = async (roleId: string, memberId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const hasMember = role.memberIds.includes(memberId);
    const newMemberIds = hasMember
      ? role.memberIds.filter((id) => id !== memberId)
      : [...role.memberIds, memberId];
    await handleUpdateRole(roleId, { memberIds: newMemberIds });
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => setServerIcon(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const SidebarItem = ({ label, count }: { label: string; count?: number }) => (
    <div
      onClick={() => { setActiveTab(label); setSelectedRoleId(null); }}
      className={`px-2.5 py-1.5 rounded cursor-pointer mb-0.5 font-medium text-[15px] flex justify-between items-center ${activeTab === label ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#bac2de] hover:bg-[#313244] hover:text-[#cdd6f4]'}`}
    >
      {label}
      {count !== undefined && (
        <span className="text-xs bg-[#11111b] px-1.5 py-0.5 rounded-full text-[#cdd6f4]">{count}</span>
      )}
    </div>
  );

  const PermissionToggle = ({ label, description, enabled, onChange, icon: Icon }: {
    label: string; description: string; enabled: boolean;
    onChange: (v: boolean) => void; icon?: React.ElementType;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-[#181825] last:border-b-0">
      <div className="flex items-start gap-3 flex-1">
        {Icon && <Icon size={18} className="text-[#bac2de] mt-0.5 flex-shrink-0" />}
        <div>
          <div className="text-[#cdd6f4] font-medium text-sm">{label}</div>
          <div className="text-[#6c7086] text-xs mt-0.5">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ml-4 ${enabled ? 'bg-[#a6e3a1]' : 'bg-[#45475a]'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${enabled ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-[#181825] animate-in fade-in duration-200">
      {/* Sidebar */}
      <div className="w-[218px] bg-[#181825] flex flex-col pt-[60px] pb-4 px-1.5 flex-shrink-0 ml-auto border-r border-[#11111b] overflow-y-auto">
        <div className="px-2.5 pb-1.5">
          <h3 className="text-[#a6adc8] text-xs font-bold uppercase mb-2 px-2.5">{server.name}</h3>
          <SidebarItem label="Overview" />
          <SidebarItem label="Roles" />
          <SidebarItem label="Emoji" />
          <SidebarItem label="Stickers" />
          <SidebarItem label="Widget" />
          <div className="h-[1px] bg-[#45475a] mx-2.5 my-2" />
          <h3 className="text-[#a6adc8] text-xs font-bold uppercase mb-2 px-2.5">User Management</h3>
          <SidebarItem label="Members" count={server.members.length} />
          <SidebarItem label="Invites" />
          <SidebarItem label="Bans" />
          <div className="h-[1px] bg-[#45475a] mx-2.5 my-2" />
          <div
            onClick={handleDelete}
            className="px-2.5 py-1.5 rounded cursor-pointer mb-0.5 font-medium text-[15px] text-[#f38ba8] hover:bg-[#f38ba81a] flex items-center justify-between group"
          >
            Delete Server
            <Trash2 size={16} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#1e1e2e] flex flex-col min-w-0 relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-[60px] px-10 pb-20 max-w-[740px]">
          {/* Close Button */}
          <div className="fixed top-[60px] right-[40px] flex flex-col items-center group cursor-pointer z-50" onClick={onClose}>
            <div className="w-9 h-9 rounded-full border-2 border-[#bac2de] flex items-center justify-center text-[#bac2de] group-hover:bg-[#45475a] transition-colors">
              <X size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[#bac2de] text-xs font-bold mt-2 group-hover:text-[#cdd6f4]">ESC</span>
          </div>

          {/* ── Overview ── */}
          {activeTab === 'Overview' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold text-[#cdd6f4] mb-5">Server Overview</h2>
              <div className="flex gap-8">
                <div className="flex-shrink-0">
                  <input type="file" accept="image/*" onChange={handleIconUpload} className="hidden" id="server-icon-upload" />
                  <label htmlFor="server-icon-upload" className="w-[100px] h-[100px] rounded-full bg-[#cba6f7] flex items-center justify-center text-white text-3xl font-bold relative group cursor-pointer overflow-hidden block">
                    {serverIcon ? <img src={serverIcon} alt="Server icon" className="w-full h-full object-cover" /> : name.substring(0, 2).toUpperCase()}
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-medium">CHANGE ICON</div>
                  </label>
                  <div className="text-xs text-[#bac2de] mt-2 text-center">Minimum Size: <br /> 128x128</div>
                  {serverIcon && <button onClick={() => setServerIcon(undefined)} className="text-xs text-[#f38ba8] hover:underline mt-1 w-full text-center">Remove Icon</button>}
                </div>
                <div className="flex-1 max-w-md">
                  <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">Server Name</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition-colors mb-6"
                  />
                  {(name !== server.name || serverIcon !== server.icon) && (
                    <div className="flex items-center justify-end">
                      <button onClick={() => { setName(server.name); setServerIcon(server.icon); }} className="text-white text-sm mr-4 hover:underline">Reset</button>
                      <button onClick={handleSave} className="bg-[#a6e3a1] hover:bg-[#a6e3a1]/80 text-white px-6 py-2 rounded text-sm font-medium transition-colors">Save Changes</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Invites ── */}
          {activeTab === 'Invites' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold text-[#cdd6f4] mb-2">Invite People</h2>
              <p className="text-[#bac2de] text-sm mb-6">Share this invite code with your friends to join <strong className="text-[#cdd6f4]">{server.name}</strong>.</p>

              {!inviteCode ? (
                <button
                  onClick={handleCreateInvite}
                  disabled={inviteLoading}
                  className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus size={18} />
                  {inviteLoading ? 'Creating...' : 'Create Invite Link'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#11111b] rounded-lg p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-[#6c7086] uppercase font-bold mb-1">Invite Code</div>
                      <div className="text-[#cdd6f4] font-mono text-lg font-bold tracking-wider">{inviteCode}</div>
                      <div className="text-xs text-[#6c7086] mt-1">Expires in 7 days</div>
                    </div>
                    <button
                      onClick={handleCopyInvite}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${inviteCopied ? 'bg-[#a6e3a1] text-[#1e1e2e]' : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'}`}
                    >
                      {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
                      {inviteCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    onClick={handleCreateInvite}
                    disabled={inviteLoading}
                    className="flex items-center gap-2 text-[#bac2de] hover:text-[#cdd6f4] text-sm transition-colors"
                  >
                    <RefreshCw size={14} />
                    Generate new code
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Roles ── */}
          {activeTab === 'Roles' && !selectedRoleId && (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-[#cdd6f4]">Roles</h2>
                <button onClick={handleCreateRole} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2">
                  <Plus size={16} />Create Role
                </button>
              </div>
              <p className="text-[#bac2de] text-sm mb-6">Use roles to group your server members and assign permissions.</p>
              {roles.length === 0 ? (
                <div className="text-center py-12">
                  <Shield size={48} className="mx-auto text-[#45475a] mb-4" />
                  <p className="text-[#6c7086]">No roles yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {roles.map((role) => (
                    <div key={role.id} onClick={() => { setSelectedRoleId(role.id); setRoleSubTab('display'); }} className="flex items-center justify-between p-3 bg-[#181825] rounded hover:bg-[#313244] cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                        <span className="text-[#cdd6f4] font-medium">{role.name}</span>
                        {role.hoist && <span className="text-[10px] bg-[#45475a] text-[#bac2de] px-1.5 py-0.5 rounded">HOISTED</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[#bac2de] text-sm">{role.memberIds.length} members</span>
                        <ChevronRight size={16} className="text-[#bac2de] opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Roles' && selectedRole && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setSelectedRoleId(null)} className="text-[#bac2de] hover:text-[#cdd6f4] transition-colors">← Back</button>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                <h2 className="text-xl font-bold text-[#cdd6f4]">{selectedRole.name}</h2>
              </div>
              <div className="flex gap-1 mb-6 bg-[#181825] rounded-lg p-1 w-fit">
                {(['display', 'permissions', 'members'] as const).map((tab) => (
                  <button key={tab} onClick={() => setRoleSubTab(tab)} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${roleSubTab === tab ? 'bg-[#313244] text-[#cdd6f4]' : 'text-[#bac2de] hover:text-[#cdd6f4]'}`}>{tab}</button>
                ))}
              </div>

              {roleSubTab === 'display' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">Role Name</label>
                    <input type="text" value={selectedRole.name} onChange={(e) => handleUpdateRole(selectedRole.id, { name: e.target.value })} className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors max-w-md" />
                  </div>
                  <div>
                    <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">Role Color</label>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_COLORS.map((color) => (
                        <button key={color} onClick={() => handleUpdateRole(selectedRole.id, { color })} className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center" style={{ backgroundColor: color }}>
                          {selectedRole.color === color && <Check size={14} className="text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PermissionToggle label="Display role members separately" description="Members with this role will be shown separately in the member list" enabled={selectedRole.hoist} onChange={(v) => handleUpdateRole(selectedRole.id, { hoist: v })} icon={Users} />
                  <div className="pt-4 border-t border-[#45475a]">
                    <button onClick={() => handleDeleteRole(selectedRole.id)} className="text-[#f38ba8] hover:bg-[#f38ba8]/10 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
                      <Trash2 size={16} />Delete Role
                    </button>
                  </div>
                </div>
              )}

              {roleSubTab === 'permissions' && (
                <div className="space-y-1">
                  <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-3">General Permissions</h3>
                  <PermissionToggle label="Administrator" description="Members with this permission have every permission and can bypass channel-specific permissions." enabled={selectedRole.permissions.administrator} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, administrator: v } })} icon={Shield} />
                  <PermissionToggle label="Manage Channels" description="Allows members to create, edit, or delete channels." enabled={selectedRole.permissions.manageChannels} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, manageChannels: v } })} icon={Settings2} />
                  <PermissionToggle label="Manage Roles" description="Allows members to create and edit roles lower than their highest role." enabled={selectedRole.permissions.manageRoles} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, manageRoles: v } })} icon={Shield} />
                  <PermissionToggle label="Kick Members" description="Allows members to remove other members from this server." enabled={selectedRole.permissions.kickMembers} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, kickMembers: v } })} icon={UserPlus} />
                  <PermissionToggle label="Ban Members" description="Allows members to permanently ban other members from this server." enabled={selectedRole.permissions.banMembers} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, banMembers: v } })} icon={UserPlus} />
                  <div className="h-[1px] bg-[#45475a] my-4" />
                  <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-3">Text Channel Permissions</h3>
                  <PermissionToggle label="Send Messages" description="Allows members to send messages in text channels." enabled={selectedRole.permissions.sendMessages} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, sendMessages: v } })} icon={MessageSquare} />
                  <PermissionToggle label="Send Photos & Files" description="Allows members to upload images and files in text channels." enabled={selectedRole.permissions.sendPhotos} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, sendPhotos: v } })} icon={Image} />
                  <div className="h-[1px] bg-[#45475a] my-4" />
                  <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-3">Voice Channel Permissions</h3>
                  <PermissionToggle label="Connect to Voice" description="Allows members to join voice channels." enabled={selectedRole.permissions.connectVoice} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, connectVoice: v } })} icon={Volume2} />
                  <PermissionToggle label="Speak in Voice" description="Allows members to speak in voice channels." enabled={selectedRole.permissions.sendVoice} onChange={(v) => handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, sendVoice: v } })} icon={Mic} />
                  <div className="h-[1px] bg-[#45475a] my-4" />
                  <h3 className="text-[#bac2de] text-xs font-bold uppercase mb-3">Channel Visibility</h3>
                  <p className="text-[#6c7086] text-sm mb-4">Select which channels this role can see. Leave all unchecked to allow access to all channels.</p>
                  <div className="space-y-2">
                    {server.channels.map((channel) => {
                      const isRestricted = selectedRole.permissions.viewChannels.includes(channel.id);
                      return (
                        <div key={channel.id} className="flex items-center justify-between p-2 bg-[#181825] rounded">
                          <div className="flex items-center gap-2">
                            {channel.type === 'text' ? <Hash size={16} className="text-[#6c7086]" /> : <Volume2 size={16} className="text-[#6c7086]" />}
                            <span className="text-[#cdd6f4] text-sm">{channel.name}</span>
                          </div>
                          <button onClick={() => { const newChannels = isRestricted ? selectedRole.permissions.viewChannels.filter((id) => id !== channel.id) : [...selectedRole.permissions.viewChannels, channel.id]; handleUpdateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, viewChannels: newChannels } }); }} className={`w-8 h-5 rounded-full relative transition-colors ${isRestricted ? 'bg-[#a6e3a1]' : 'bg-[#45475a]'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isRestricted ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {roleSubTab === 'members' && (
                <div>
                  <p className="text-[#bac2de] text-sm mb-4">{selectedRole.memberIds.length} member{selectedRole.memberIds.length !== 1 ? 's' : ''} with this role</p>
                  <div className="space-y-1">
                    {server.members.map((member) => {
                      const hasRole = selectedRole.memberIds.includes(member.id);
                      return (
                        <div key={member.id} className="flex items-center justify-between p-2 hover:bg-[#181825] rounded group">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={member} size="sm" />
                            <div>
                              <div className="text-[#cdd6f4] font-medium text-sm">{member.displayName}</div>
                              <div className="text-[#6c7086] text-xs">{member.username}#{member.discriminator}</div>
                            </div>
                          </div>
                          <button onClick={() => handleToggleRoleMember(selectedRole.id, member.id)} className={`w-8 h-5 rounded-full relative transition-colors ${hasRole ? 'bg-[#a6e3a1]' : 'bg-[#45475a]'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${hasRole ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Members ── */}
          {activeTab === 'Members' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold text-[#cdd6f4] mb-2">Server Members</h2>
              <p className="text-[#bac2de] text-sm mb-6">{server.members.length} Members</p>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-[#11111b] rounded px-3 py-1.5 flex items-center">
                  <input type="text" placeholder="Search Members" className="bg-transparent border-none outline-none text-[#cdd6f4] text-sm w-full placeholder-[#6c7086]" />
                  <Search size={16} className="text-[#6c7086]" />
                </div>
              </div>
              <div className="space-y-1">
                {server.members.map((member) => {
                  const mRoles = memberRolesMap[member.id] ?? [];
                  return (
                    <div key={member.id} className="flex items-center justify-between p-2 hover:bg-[#181825] rounded group">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={member} size="sm" />
                        <div>
                          <div className="text-[#cdd6f4] font-medium flex items-center gap-2">
                            {member.displayName}
                            {member.id === server.members[0]?.id && <Shield size={12} className="text-[#f9e2af]" fill="currentColor" />}
                          </div>
                          <div className="text-[#bac2de] text-xs flex items-center gap-2">
                            {member.username}#{member.discriminator}
                            {mRoles.length > 0 && (
                              <div className="flex gap-1">
                                {mRoles.map((r) => (
                                  <span key={r.id} className="inline-flex items-center gap-1 bg-[#11111b] px-1.5 py-0.5 rounded text-[10px]">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                        <button className="p-1.5 hover:bg-[#11111b] rounded text-[#bac2de] hover:text-[#cdd6f4]" title="More Options">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Placeholder tabs ── */}
          {['Emoji', 'Stickers', 'Widget', 'Bans'].includes(activeTab) && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 flex flex-col items-center justify-center h-[400px]">
              <div className="w-40 h-40 bg-[#181825] rounded-full flex items-center justify-center mb-6">
                <Settings2 size={64} className="text-[#cdd6f4] opacity-20" />
              </div>
              <h2 className="text-xl font-bold text-[#cdd6f4] mb-2">Work in Progress</h2>
              <p className="text-[#bac2de] text-center max-w-md">This settings page is currently under construction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

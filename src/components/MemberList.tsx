import React, { useEffect, useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { StatusText } from './StatusText';
import { db, Role, ServerProfile, StoredUser } from '../lib/database';
import type { Member } from '../App';
import { Crown } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface MemberListProps {
  members: Member[];
  currentUser: Member;
  onMemberClick: (member: Member, event: React.MouseEvent) => void;
  serverId?: string;
  presenceMap?: Record<string, string>;
}

export function MemberList({ members, onMemberClick, serverId, presenceMap = {} }: MemberListProps) {
  const { t } = useI18n();
  const [roles, setRoles] = useState<Role[]>([]);
  const [serverProfiles, setServerProfiles] = useState<ServerProfile[]>([]);
  const [freshUsers, setFreshUsers] = useState<Record<string, StoredUser>>({});
  useEffect(() => {
    if (!serverId) return;
    db.getRoles(serverId).then(setRoles);
    db.getServerProfiles(serverId).then(setServerProfiles);
  }, [serverId]);

  useEffect(() => {
    if (members.length === 0) return;
    Promise.all(members.map((m) => db.getUser(m.id))).then((users) => {
      const map: Record<string, StoredUser> = {};
      users.forEach((u) => { if (u) map[u.id] = u; });
      setFreshUsers(map);
    });
  }, [members]);

  const getActualStatus = (member: Member): Member['status'] =>
    (presenceMap[member.id] as Member['status'])
    || freshUsers[member.id]?.status
    || member.status

  const hoistedRoles = roles.filter((r) => r.hoist).sort((a, b) => b.position - a.position);
  const ownerId = members[0]?.id;

  const getDisplayName = (member: Member) => {
    const profile = serverProfiles.find((p) => p.userId === member.id);
    return profile?.nickname || member.displayName;
  };

  const getServerAvatar = (member: Member) => {
    const profile = serverProfiles.find((p) => p.userId === member.id);
    return profile?.avatar;
  };

  const getMemberNameColor = (member: Member): string | undefined => {
    if (!serverId) return undefined;
    const memberRoles = roles.filter((r) => r.memberIds?.includes(member.id));
    if (memberRoles.length === 0) return undefined;
    return [...memberRoles].sort((a, b) => b.position - a.position)[0]?.color;
  };

  const groupedMembers: { role: Role; members: Member[] }[] = [];
  const assignedMemberIds = new Set<string>();

  for (const role of hoistedRoles) {
    const roleMembers = members.filter(
      (m) => role.memberIds?.includes(m.id) && !assignedMemberIds.has(m.id)
    );
    if (roleMembers.length > 0) {
      groupedMembers.push({ role, members: roleMembers });
      roleMembers.forEach((m) => assignedMemberIds.add(m.id));
    }
  }

  const onlineRemaining = members.filter(
    (m) => getActualStatus(m) !== 'offline' && !assignedMemberIds.has(m.id)
  );
  const offlineRemaining = members.filter(
    (m) => getActualStatus(m) === 'offline' && !assignedMemberIds.has(m.id)
  );

  const renderMember = (member: Member) => {
    const fresh = freshUsers[member.id];
    const actualStatus = getActualStatus(member);
    const isOffline = actualStatus === 'offline';
    const nameColor = getMemberNameColor(member);
    const customStatus = fresh?.customStatus;
    const freshAvatar = fresh?.avatar || member.avatar;
    const isOwner = member.id === ownerId;

    return (
      <div
        key={member.id}
        onClick={(e) => onMemberClick(member, e)}
        className={`flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#1e1e2e] cursor-pointer group ${isOffline ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
      >
        <UserAvatar
          user={{ ...member, status: actualStatus, avatar: freshAvatar }}
          size="sm" showStatus
          serverAvatar={getServerAvatar(member)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium group-hover:brightness-110 truncate" style={{ color: nameColor || '#cdd6f4' }}>
              {getDisplayName(member)}
            </span>
            {isOwner && <Crown size={14} className="text-[#f9e2af] fill-[#f9e2af] ml-1" />}
          </div>
          {customStatus ? (
            <p className="text-xs text-[#6c7086] truncate"><StatusText text={customStatus} /></p>
          ) : (
            <>
              {actualStatus === 'dnd' && <p className="text-xs text-[#bac2de] truncate">{t('members.dnd')}</p>}
              {actualStatus === 'idle' && <p className="text-xs text-[#bac2de] truncate">{t('members.idle')}</p>}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-60 bg-[#181825] flex flex-col overflow-y-auto p-3">
      {groupedMembers.map(({ role, members: roleMembers }) => (
        <div key={role.id} className="mb-4">
          <h3 className="text-xs font-semibold uppercase mb-2 px-2" style={{ color: role.color }}>
            {role.name} — {roleMembers.length}
          </h3>
          {roleMembers.map(renderMember)}
        </div>
      ))}

      {onlineRemaining.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[#a6adc8] uppercase mb-2 px-2">
            {t('members.online')} — {onlineRemaining.length}
          </h3>
          {onlineRemaining.map(renderMember)}
        </div>
      )}

      {offlineRemaining.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#a6adc8] uppercase mb-2 px-2">
            {t('members.offline')} — {offlineRemaining.length}
          </h3>
          {offlineRemaining.map(renderMember)}
        </div>
      )}
    </div>
  );
}

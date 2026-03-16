import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  SearchIcon,
  UsersIcon,
  CheckIcon,
  ShieldAlertIcon } from
'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useI18n } from '../lib/i18n';
import type { Member } from '../App';
import { db, StoredUser } from '../lib/database';
interface CreateGroupDMModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  friends: StoredUser[];
  onCreateGroupDM: (name: string, memberIds: string[]) => void;
}
const MAX_MEMBERS = 15;
export function CreateGroupDMModal({
  isOpen,
  onClose,
  currentUser,
  friends,
  onCreateGroupDM
}: CreateGroupDMModalProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState('');
  const [searchResults, setSearchResults] = useState<StoredUser[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIds(new Set());
      setCustomName('');
      setSearchResults([]);
      setShowAllUsers(false);
    }
  }, [isOpen]);
  // Search all users when typing
  useEffect(() => {
    if (search.trim().length >= 1) {
      const results = db.searchUsers(search, [currentUser.id]);
      setSearchResults(results);
      setShowAllUsers(true);
    } else {
      setSearchResults([]);
      setShowAllUsers(false);
    }
  }, [search, currentUser.id]);
  if (!isOpen) return null;
  // Combine friends and search results, removing duplicates
  const friendIds = new Set(friends.map((f) => f.id));
  const displayUsers = showAllUsers ?
  searchResults :
  friends.filter(
    (f) =>
    f.username.toLowerCase().includes(search.toLowerCase()) ||
    f.displayName.toLowerCase().includes(search.toLowerCase())
  );
  const autoName = useMemo(() => {
    const allUsers = [...friends, ...searchResults];
    const uniqueUsers = Array.from(
      new Map(allUsers.map((u) => [u.id, u])).values()
    );
    const selected = uniqueUsers.filter((f) => selectedIds.has(f.id));
    if (selected.length === 0) return '';
    const names = selected.slice(0, 3).map((f) => f.displayName || f.username);
    if (selected.length > 3) return names.join(', ') + ', ...';
    return names.join(', ');
  }, [selectedIds, friends, searchResults]);
  const groupName = customName || autoName;
  const toggleUser = (user: StoredUser) => {
    // Check privacy settings for non-friends
    if (!friendIds.has(user.id)) {
      const canMsg = db.canMessage(currentUser.id, user.id);
      if (!canMsg.allowed) {
        return; // Can't add this user
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(user.id)) {
        next.delete(user.id);
      } else if (next.size < MAX_MEMBERS) {
        next.add(user.id);
      }
      return next;
    });
  };
  const handleCreate = () => {
    if (selectedIds.size < 1) return;
    const memberIds = [currentUser.id, ...Array.from(selectedIds)];
    onCreateGroupDM(groupName || 'Group', memberIds);
    onClose();
  };
  const canCreate = selectedIds.size >= 1;
  // Check if user can be added (privacy)
  const canAddUser = (
  user: StoredUser)
  : {
    allowed: boolean;
    reason?: string;
  } => {
    if (friendIds.has(user.id))
    return {
      allowed: true
    };
    return db.canMessage(currentUser.id, user.id);
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e2e] w-full max-w-[480px] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg font-bold text-[#cdd6f4]">
              {t('groupDM.create')}
            </h2>
            <button
              onClick={onClose}
              className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors">
              
              <X size={22} />
            </button>
          </div>
          <p className="text-xs text-[#6c7086]">
            {t('groupDM.maxMembers')} · {selectedIds.size}{' '}
            {t('groupDM.selected')}
          </p>
        </div>

        {/* Group Name */}
        <div className="px-5 pb-3">
          <label className="block text-[#bac2de] text-xs font-bold uppercase mb-1.5">
            {t('groupDM.groupName')}
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={autoName || 'Group'}
            className="w-full bg-[#11111b] text-[#cdd6f4] text-sm px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#cba6f7] placeholder-[#585b70]" />
          
        </div>

        {/* Search */}
        <div className="px-5 pb-2">
          <label className="block text-[#bac2de] text-xs font-bold uppercase mb-1.5">
            {t('groupDM.selectFriends')}
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c7086]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('groupDM.searchFriends')}
              className="w-full bg-[#11111b] text-[#cdd6f4] text-sm pl-8 pr-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#cba6f7] placeholder-[#585b70]" />
            
          </div>
          {showAllUsers &&
          <p className="text-[10px] text-[#6c7086] mt-1">
              Searching all users. Type a name or username#tag.
            </p>
          }
        </div>

        {/* Selected chips */}
        {selectedIds.size > 0 &&
        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {Array.from(selectedIds).map((id) => {
            const user =
            friends.find((f) => f.id === id) ||
            searchResults.find((u) => u.id === id);
            if (!user) return null;
            const isFriend = friendIds.has(id);
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isFriend ? 'bg-[#cba6f7]/20 text-[#cba6f7]' : 'bg-[#89b4fa]/20 text-[#89b4fa]'}`}>
                
                  {user.displayName || user.username}
                  {!isFriend &&
                <span className="text-[8px] opacity-70">(non-friend)</span>
                }
                  <button
                  onClick={() => toggleUser(user)}
                  className="hover:text-white transition-colors">
                  
                    <X size={12} />
                  </button>
                </span>);

          })}
          </div>
        }

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar min-h-0">
          {displayUsers.length === 0 ?
          <div className="flex flex-col items-center justify-center py-10 text-[#6c7086]">
              <UsersIcon className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">
                {search ? t('dm.noUsersFound') : t('groupDM.noFriends')}
              </p>
            </div> :

          displayUsers.map((user) => {
            const isSelected = selectedIds.has(user.id);
            const isFriend = friendIds.has(user.id);
            const addCheck = canAddUser(user);
            const isDisabled =
            !addCheck.allowed ||
            !isSelected && selectedIds.size >= MAX_MEMBERS;
            return (
              <div
                key={user.id}
                onClick={() => !isDisabled && toggleUser(user)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed' : isSelected ? 'bg-[#cba6f7]/10' : 'hover:bg-[#313244]'}`}>
                
                  <UserAvatar user={user} size="sm" showStatus />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-[#cdd6f4] font-medium truncate">
                        {user.displayName || user.username}
                      </p>
                      {!isFriend &&
                    <span className="text-[9px] text-[#89b4fa] bg-[#89b4fa]/10 px-1.5 py-0.5 rounded">
                          User
                        </span>
                    }
                    </div>
                    <p className="text-xs text-[#6c7086] truncate">
                      {user.username}#{user.discriminator}
                    </p>
                  </div>
                  {!addCheck.allowed ?
                <div
                  className="flex items-center gap-1 text-[#f9e2af]"
                  title={t('groupDM.privacyBlocked')}>
                  
                      <ShieldAlertIcon size={14} />
                    </div> :

                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-[#cba6f7] border-[#cba6f7]' : 'border-[#585b70]'}`}>
                  
                      {isSelected &&
                  <CheckIcon className="w-3 h-3 text-white" />
                  }
                    </div>
                }
                </div>);

          })
          }
        </div>

        {/* Footer */}
        <div className="bg-[#181825] p-4 flex items-center justify-between">
          <p className="text-xs text-[#6c7086]">
            {selectedIds.size < 1 ?
            t('groupDM.minRequired') :
            `${selectedIds.size + 1} ${t('groupDM.members')}`}
          </p>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-5 py-2 rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            
            {t('groupDM.createButton')}
          </button>
        </div>
      </div>
    </div>);

}
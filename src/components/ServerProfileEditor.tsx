import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { db, ServerProfile } from '../lib/database';
import type { Member } from '../App';

interface ServerProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  serverId: string;
  serverName: string;
}

export function ServerProfileEditor({
  isOpen,
  onClose,
  currentUser,
  serverId,
  serverName
}: ServerProfileEditorProps) {
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setLoading(true);
      db.getServerProfile(serverId, currentUser.id)
        .then(profile => {
          if (profile) {
            setNickname(profile.nickname || '');
            setAvatar(profile.avatar || undefined);
          } else {
            setNickname('');
            setAvatar(undefined);
          }
        })
        .catch(err => console.error('Failed to load server profile:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, serverId, currentUser]);

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const profile: ServerProfile = {
        serverId,
        userId: currentUser.id,
        nickname: nickname.trim() || undefined,
        avatar: avatar || undefined
      };
      await db.saveServerProfile(profile);
      onClose();
    } catch (err) {
      console.error('Failed to save server profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await db.deleteServerProfile(serverId, currentUser.id);
      setNickname('');
      setAvatar(undefined);
      onClose();
    } catch (err) {
      console.error('Failed to reset server profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const previewUser = {
    ...currentUser,
    displayName: nickname || currentUser.displayName,
    avatar: avatar || currentUser.avatar
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e2e] w-full max-w-[520px] rounded-lg shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-[#cdd6f4]">Server Profile</h2>
            <button onClick={onClose} className="text-[#bac2de] hover:text-[#cdd6f4]" disabled={loading}>
              <X size={24} />
            </button>
          </div>
          <p className="text-[#bac2de] text-sm mb-6">
            Customize how you appear in{' '}
            <strong className="text-[#cdd6f4]">{serverName}</strong>. This won't affect your global profile.
          </p>

          <div className="flex gap-8">
            <div className="flex-1 space-y-5">
              <div>
                <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">
                  Server Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={currentUser.displayName}
                  disabled={loading}
                  className="w-full bg-[#11111b] border border-[#11111b] rounded p-2.5 text-[#cdd6f4] focus:outline-none focus:border-[#cba6f7] transition-colors placeholder-[#6c7086] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">
                  Server Avatar
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    Upload
                  </button>
                  {avatar && (
                    <button
                      onClick={() => setAvatar(undefined)}
                      disabled={loading}
                      className="text-[#f38ba8] hover:text-[#f38ba8]/80 text-sm flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="w-[160px] flex-shrink-0">
              <div className="text-[#bac2de] text-xs font-bold uppercase mb-2">Preview</div>
              <div className="bg-[#11111b] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar user={previewUser} size="md" showStatus />
                  <div className="min-w-0">
                    <div className="text-[#cdd6f4] font-medium text-sm truncate">
                      {nickname || currentUser.displayName}
                    </div>
                    <div className="text-[#6c7086] text-xs">#{currentUser.discriminator}</div>
                  </div>
                </div>
                {nickname && nickname !== currentUser.displayName && (
                  <div className="text-[#6c7086] text-[10px] mt-1">aka {currentUser.displayName}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#181825] p-4 flex justify-between items-center">
          <button
            onClick={handleReset}
            disabled={loading}
            className="text-[#f38ba8] text-sm font-medium hover:underline disabled:opacity-50"
          >
            Reset Server Profile
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="text-[#cdd6f4] text-sm font-medium hover:underline px-4 py-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

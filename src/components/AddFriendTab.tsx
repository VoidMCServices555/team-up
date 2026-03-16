import React, { useState } from 'react';
import { ShieldBan, ShieldAlert } from 'lucide-react';
import { db, StoredUser } from '../lib/database';
import { useI18n } from '../lib/i18n';

interface AddFriendTabProps {
  currentUser: StoredUser;
}

export function AddFriendTab({ currentUser }: AddFriendTabProps) {
  const { t } = useI18n();
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'success' | 'error' | 'blocked_by_you' | 'blocked_by_them' | 'privacy_blocked'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSendRequest = async () => {
    const parts = usernameInput.trim().split('#');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setStatus('error');
      setMessage(t('addFriend.errorFormat'));
      return;
    }

    const [username, discriminator] = parts;

    if (username === currentUser.username && discriminator === currentUser.discriminator) {
      setStatus('error');
      setMessage(t('addFriend.errorSelf'));
      return;
    }

    setLoading(true);
    try {
      const targetUser = await db.findUserByTag(username, discriminator);
      if (!targetUser) {
        setStatus('error');
        setMessage(t('addFriend.errorFormat'));
        return;
      }

      const result = await db.sendFriendRequest(currentUser.id, targetUser.id);

      if (result === 'sent') {
        setStatus('success');
        setMessage(t('addFriend.successSent').replace('{user}', targetUser.username));
        setUsernameInput('');
      } else if (result === 'exists') {
        setStatus('error');
        setMessage(t('addFriend.errorExists'));
      } else if (result === 'accepted') {
        setStatus('success');
        setMessage(t('addFriend.successAccepted').replace('{user}', targetUser.username));
        setUsernameInput('');
      } else if (result === 'blocked_by_you') {
        setStatus('blocked_by_you');
        setMessage(t('addFriend.blockedByYou'));
      } else if (result === 'blocked_by_them') {
        setStatus('blocked_by_them');
        setMessage(t('addFriend.blockedByThem'));
      } else if (result === 'privacy_blocked') {
        setStatus('privacy_blocked');
        setMessage(t('addFriend.privacyBlocked') || 'This user is blocking everyone from sending them friend requests.');
      }
    } catch (err) {
      console.error('Failed to send friend request:', err);
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputBorderColor =
    status === 'success' ? 'border-[#a6e3a1]' :
    status === 'blocked_by_you' ? 'border-[#f9e2af]' :
    status === 'error' || status === 'blocked_by_them' || status === 'privacy_blocked' ? 'border-[#f38ba8]' :
    'border-[#11111b]';

  return (
    <div className="p-8 w-full max-w-3xl">
      <h2 className="text-[#cdd6f4] font-bold text-base mb-2 uppercase">
        {t('addFriend.title')}
      </h2>
      <p className="text-[#bac2de] text-sm mb-4">
        {t('addFriend.description')}
      </p>

      <div className={`relative flex items-center rounded-lg border ${inputBorderColor}`}>
        <div className="flex-1 relative">
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value);
              setStatus('idle');
              setMessage('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && !loading && usernameInput && handleSendRequest()}
            placeholder={t('addFriend.placeholder')}
            disabled={loading}
            className="w-full bg-[#11111b] rounded-lg py-3 px-4 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none transition-colors disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleSendRequest}
          disabled={!usernameInput || loading}
          className="absolute right-3 bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : t('addFriend.sendRequest')}
        </button>
      </div>

      {status === 'blocked_by_you' && (
        <div className="mt-3 border-l-4 border-[#f9e2af] bg-[#f9e2af]/10 rounded-r-lg p-3 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
          <ShieldAlert size={20} className="text-[#f9e2af] flex-shrink-0 mt-0.5" />
          <p className="text-[#f9e2af] text-sm font-medium">{message}</p>
        </div>
      )}

      {(status === 'blocked_by_them' || status === 'privacy_blocked') && (
        <div className="mt-3 border-l-4 border-[#f38ba8] bg-[#f38ba8]/10 rounded-r-lg p-3 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
          <ShieldBan size={20} className="text-[#f38ba8] flex-shrink-0 mt-0.5" />
          <p className="text-[#f38ba8] text-sm font-medium">{message}</p>
        </div>
      )}

      {message && status !== 'blocked_by_you' && status !== 'blocked_by_them' && status !== 'privacy_blocked' && (
        <p className={`text-sm mt-2 ${status === 'success' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

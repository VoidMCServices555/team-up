import React, { useState } from 'react';
import { Hash, Volume2, X, Users } from 'lucide-react';
import { useI18n } from '../lib/i18n';
interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (
  name: string,
  type: 'text' | 'voice',
  userLimit?: number)
  => void;
}
export function CreateChannelModal({
  isOpen,
  onClose,
  onCreateChannel
}: CreateChannelModalProps) {
  const { t } = useI18n();
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [channelName, setChannelName] = useState('');
  const [hasLimit, setHasLimit] = useState(false);
  const [userLimit, setUserLimit] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (channelName.trim()) {
      const limit =
      hasLimit && channelType === 'voice' ?
      parseInt(userLimit, 10) :
      undefined;
      onCreateChannel(
        channelName.trim(),
        channelType,
        limit && limit > 0 ? limit : undefined
      );
      setChannelName('');
      setHasLimit(false);
      setUserLimit('');
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e2e] w-full max-w-[460px] rounded-md shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#cdd6f4]">
              {t('createChannel.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-[#bac2de] hover:text-[#cdd6f4]">
              
              <X size={24} />
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-[#bac2de] text-xs font-bold uppercase mb-3">
              {t('createChannel.channelType')}
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center p-3 rounded cursor-pointer border ${channelType === 'text' ? 'bg-[#313244] border-transparent' : 'border-transparent hover:bg-[#313244]'}`}
                onClick={() => {
                  setChannelType('text');
                  setHasLimit(false);
                }}>
                
                <Hash size={24} className="text-[#a6adc8] mr-3" />
                <div className="flex-1">
                  <div className="text-[#cdd6f4] font-medium">
                    {t('modal.text')}
                  </div>
                  <div className="text-[#bac2de] text-xs">
                    {t('modal.textDesc')}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${channelType === 'text' ? 'border-[#cba6f7]' : 'border-[#bac2de]'}`}>
                  
                  {channelType === 'text' &&
                  <div className="w-2.5 h-2.5 rounded-full bg-[#cba6f7]" />
                  }
                </div>
              </label>

              <label
                className={`flex items-center p-3 rounded cursor-pointer border ${channelType === 'voice' ? 'bg-[#313244] border-transparent' : 'border-transparent hover:bg-[#313244]'}`}
                onClick={() => setChannelType('voice')}>
                
                <Volume2 size={24} className="text-[#a6adc8] mr-3" />
                <div className="flex-1">
                  <div className="text-[#cdd6f4] font-medium">
                    {t('modal.voice')}
                  </div>
                  <div className="text-[#bac2de] text-xs">
                    {t('modal.voiceDesc')}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${channelType === 'voice' ? 'border-[#cba6f7]' : 'border-[#bac2de]'}`}>
                  
                  {channelType === 'voice' &&
                  <div className="w-2.5 h-2.5 rounded-full bg-[#cba6f7]" />
                  }
                </div>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">
              {t('createChannel.channelName')}
            </label>
            <div className="relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[#bac2de]">
                {channelType === 'text' ?
                <Hash size={16} /> :

                <Volume2 size={16} />
                }
              </div>
              <input
                type="text"
                value={channelName}
                onChange={(e) =>
                setChannelName(
                  e.target.value.toLowerCase().replace(/\s+/g, '-')
                )
                }
                placeholder="new-channel"
                className="w-full bg-[#11111b] text-[#cdd6f4] p-2.5 pl-8 rounded border-none focus:ring-0 font-medium"
                autoFocus />
              
            </div>

            {/* User Limit (voice only) */}
            {channelType === 'voice' &&
            <div className="mt-4">
                <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">
                  {t('modal.userLimit')}
                </label>
                <div className="space-y-2">
                  <label
                  className={`flex items-center gap-2.5 p-2.5 rounded cursor-pointer transition-colors ${!hasLimit ? 'bg-[#313244]' : 'hover:bg-[#313244]/50'}`}
                  onClick={() => setHasLimit(false)}>
                  
                    <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!hasLimit ? 'border-[#cba6f7]' : 'border-[#6c7086]'}`}>
                    
                      {!hasLimit &&
                    <div className="w-2 h-2 rounded-full bg-[#cba6f7]" />
                    }
                    </div>
                    <span className="text-sm text-[#cdd6f4]">
                      {t('modal.noLimit')}
                    </span>
                  </label>
                  <label
                  className={`flex items-center gap-2.5 p-2.5 rounded cursor-pointer transition-colors ${hasLimit ? 'bg-[#313244]' : 'hover:bg-[#313244]/50'}`}
                  onClick={() => setHasLimit(true)}>
                  
                    <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${hasLimit ? 'border-[#cba6f7]' : 'border-[#6c7086]'}`}>
                    
                      {hasLimit &&
                    <div className="w-2 h-2 rounded-full bg-[#cba6f7]" />
                    }
                    </div>
                    <Users size={14} className="text-[#a6adc8]" />
                    <span className="text-sm text-[#cdd6f4]">
                      {t('modal.setLimit')}
                    </span>
                    {hasLimit &&
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={userLimit}
                    onChange={(e) => setUserLimit(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="e.g. 5"
                    className="ml-auto w-20 bg-[#11111b] text-[#cdd6f4] text-sm px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-[#cba6f7] placeholder-[#585b70]" />

                  }
                  </label>
                </div>
              </div>
            }
          </form>
        </div>

        <div className="bg-[#181825] p-4 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="text-[#cdd6f4] text-sm font-medium hover:underline px-4 py-2">
            
            {t('settings.cancel')}
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={!channelName.trim()}
            className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            
            {t('createChannel.title')}
          </button>
        </div>
      </div>
    </div>);

}
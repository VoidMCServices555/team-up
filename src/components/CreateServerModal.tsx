import React, { useState, useRef } from 'react';
import { XIcon, UploadIcon, ChevronRightIcon, ImageIcon } from 'lucide-react';
import { useI18n } from '../lib/i18n';
interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateServer: (name: string, icon?: string) => void;
}
export function CreateServerModal({
  isOpen,
  onClose,
  onCreateServer
}: CreateServerModalProps) {
  const { t } = useI18n();
  const [serverName, setServerName] = useState('');
  const [serverIcon, setServerIcon] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (serverName.trim()) {
      onCreateServer(serverName.trim(), serverIcon);
      setServerName('');
      setServerIcon(undefined);
    }
  };
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t('createServer.imageTooLarge'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setServerIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e2e] rounded-lg w-full max-w-[440px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-[#cdd6f4] mb-2">
            {t('createServer.title')}
          </h2>
          <p className="text-[#6c7086] text-sm mb-6">
            {t('createServer.description')}
          </p>

          <div className="flex justify-center mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconUpload}
              className="hidden" />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full border-2 border-dashed border-[#bac2de] flex flex-col items-center justify-center cursor-pointer hover:bg-[#313244] transition-colors overflow-hidden relative">
              
              {serverIcon ?
              <>
                  <img
                  src={serverIcon}
                  alt="Server icon"
                  className="w-full h-full object-cover" />
                
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-white uppercase">
                      {t('createServer.change')}
                    </span>
                  </div>
                </> :

              <>
                  <div className="bg-[#cba6f7] rounded-full p-2 mb-1">
                    <UploadIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-[#6c7086] uppercase">
                    {t('createServer.upload')}
                  </span>
                </>
              }
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="text-left mb-6">
              <label className="block text-xs font-bold text-[#6c7086] uppercase mb-2">
                {t('createServer.serverName')}
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder={t('createServer.placeholder')}
                className="w-full bg-[#313244] p-2.5 rounded border-none focus:ring-0 text-[#cdd6f4] placeholder-[#9399b2]"
                autoFocus />
              
            </div>

            <div className="text-[10px] text-[#6c7086] text-left mb-8">
              {t('createServer.guidelines')}{' '}
              <span className="text-[#89b4fa] font-bold cursor-pointer">
                {t('createServer.communityGuidelines')}
              </span>
              .
            </div>
          </form>
        </div>

        <div className="bg-[#181825] p-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="text-[#cdd6f4] text-sm font-medium hover:underline px-4 py-2">
            
            {t('createServer.back')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!serverName.trim()}
            className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            
            {t('createServer.create')}
          </button>
        </div>
      </div>
    </div>);

}
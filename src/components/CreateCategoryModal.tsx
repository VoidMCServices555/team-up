import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useI18n } from '../lib/i18n';
interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCategory: (name: string) => void;
}
export function CreateCategoryModal({
  isOpen,
  onClose,
  onCreateCategory
}: CreateCategoryModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateCategory(name.trim());
      setName('');
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e2e] w-full max-w-[460px] rounded-md shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#cdd6f4]">
              {t('createCategory.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-[#bac2de] hover:text-[#cdd6f4]">
              
              <X size={24} />
            </button>
          </div>

          <p className="text-[#bac2de] text-sm mb-6">
            {t('createCategory.description')}
          </p>

          <form onSubmit={handleSubmit}>
            <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">
              {t('createCategory.name')}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bac2de]">
                <FolderPlus size={16} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('createCategory.placeholder')}
                className="w-full bg-[#11111b] text-[#cdd6f4] p-2.5 pl-10 rounded border-none focus:outline-none focus:ring-1 focus:ring-[#cba6f7] font-medium"
                autoFocus />
              
            </div>
          </form>
        </div>

        <div className="bg-[#181825] p-4 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="text-[#cdd6f4] text-sm font-medium hover:underline px-4 py-2">
            
            {t('settings.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            
            {t('createCategory.title')}
          </button>
        </div>
      </div>
    </div>);

}
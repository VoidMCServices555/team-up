import React, { useState } from 'react';
import { X, FolderPlusIcon } from 'lucide-react';
import { useI18n } from '../lib/i18n';
interface CreateDMCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCategory: (name: string) => void;
  existingNames?: string[];
}
export function CreateDMCategoryModal({
  isOpen,
  onClose,
  onCreateCategory,
  existingNames = []
}: CreateDMCategoryModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Category name is required');
      return;
    }
    if (
    existingNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase()))
    {
      setError('A category with this name already exists');
      return;
    }
    onCreateCategory(trimmedName);
    setName('');
    setError('');
    onClose();
  };
  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e2e] w-full max-w-[400px] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <FolderPlusIcon className="w-5 h-5 text-[#cba6f7]" />
              <h2 className="text-lg font-bold text-[#cdd6f4]">
                {t('dmCategory.create')}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors">
              
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-[#6c7086]">
            Organize your DMs into categories for easier access.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-[#bac2de] text-xs font-bold uppercase mb-2">
              {t('dmCategory.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder={t('dmCategory.placeholder')}
              maxLength={32}
              autoFocus
              className="w-full bg-[#11111b] text-[#cdd6f4] text-sm px-3 py-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[#cba6f7] placeholder-[#585b70]" />
            
            {error && <p className="text-[#f38ba8] text-xs mt-1.5">{error}</p>}
            <p className="text-[#6c7086] text-xs mt-1.5 text-right">
              {name.length}/32
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[#cdd6f4] hover:underline">
              
              {t('general.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              
              {t('dmCategory.create')}
            </button>
          </div>
        </form>
      </div>
    </div>);

}
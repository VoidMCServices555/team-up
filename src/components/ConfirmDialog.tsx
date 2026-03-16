import React from 'react';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onCancel}>
      
      <div
        className="bg-[#1e1e2e] rounded-xl shadow-2xl w-[440px] max-w-[90vw] animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}>
        
        <div className="p-6">
          <div className="flex items-start gap-3 mb-2">
            {isDestructive &&
            <div className="w-10 h-10 rounded-full bg-[#f38ba8]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangleIcon className="w-5 h-5 text-[#f38ba8]" />
              </div>
            }
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[#cdd6f4] mb-1">{title}</h3>
              <p className="text-sm text-[#bac2de] leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-1 -mt-1 -mr-1 flex-shrink-0">
              
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#cdd6f4] hover:underline transition-colors">
            
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${isDestructive ? 'bg-[#f38ba8] hover:bg-[#eba0ac] text-white' : 'bg-[#cba6f7] hover:bg-[#b4befe] text-white'}`}>
            
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>);

}
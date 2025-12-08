'use client';

import { marked } from 'marked';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export function AIModal({ isOpen, onClose, title, content }: AIModalProps) {
  if (!isOpen) return null;

  // marked() returns a string synchronously in the version we're using
  const htmlContent: string = marked(content || 'No content available.') as string;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[90] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-[#D31145]/20 w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col my-auto">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-red-50 to-pink-50 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#D31145] to-red-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-lg sm:text-xl">✨</span>
            </div>
            <h3 className="font-bold text-slate-800 text-base sm:text-lg truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-red-50 text-slate-500 hover:text-[#D31145] flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110 flex-shrink-0 ml-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div
          className="p-4 sm:p-5 lg:p-6 overflow-y-auto prose prose-sm max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
        <div className="p-3 sm:p-4 lg:p-5 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-red-50/30 rounded-b-xl sm:rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-[#D31145] to-red-600 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import { Check, Save } from 'lucide-react';

const SaveMenu = ({
  isOpen,
  setIsOpen,
  folders,
  savedWordInSearch,
  searchResult,
  saveButtonFeedback,
  onSave,
  onRemove,
  saveButtonLabel
}) => (
  <div className="relative w-full sm:w-auto shrink-0 flex items-start sm:items-center">
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="flex w-auto sm:w-auto items-center justify-center gap-2 bg-green-600 text-white px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base rounded-lg hover:bg-green-700 transition shadow-sm"
    >
      {saveButtonFeedback ? (
        <>
          <Check className="w-4 h-4" /> 已加入
        </>
      ) : (
        <>
          <Save className="w-4 h-4" /> {saveButtonLabel || '儲存'}
        </>
      )}
    </button>

    {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />}

    {isOpen && (
      <div className="absolute left-0 sm:right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-20 p-1">
        {[...folders].reverse().map(f => {
          const isSavedInFolder = savedWordInSearch?.folderIds?.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => {
                if (isSavedInFolder) {
                  if (confirm(`要將 "${searchResult.word}" 從「${f.name}」移除嗎？`)) {
                    onRemove(savedWordInSearch, f.id);
                  }
                } else {
                  onSave(f.id);
                }
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm flex items-center justify-between gap-3"
            >
              <span className="truncate">{f.name}</span>
              {isSavedInFolder && <Check className="w-4 h-4 text-green-600" />}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default SaveMenu;

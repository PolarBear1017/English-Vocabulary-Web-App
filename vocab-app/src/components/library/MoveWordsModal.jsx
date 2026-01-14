import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const MoveWordsModal = ({
  folders,
  currentFolderId,
  onSubmit,
  onClose,
  isSaving
}) => {
  const availableFolders = (folders || []).filter(folder => folder.id !== currentFolderId);
  const [targetId, setTargetId] = useState(availableFolders[0]?.id || '');

  useEffect(() => {
    setTargetId(availableFolders[0]?.id || '');
  }, [currentFolderId, folders]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          disabled={isSaving}
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-blue-700 mb-4">批次移動單字</h2>

        {availableFolders.length === 0 ? (
          <p className="text-sm text-gray-500">沒有可移動的目標資料夾。</p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!targetId) return;
              onSubmit(targetId);
            }}
            className="space-y-4"
          >
            <label className="block text-sm text-gray-600">
              目標資料夾
              <select
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                disabled={isSaving}
              >
                {availableFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                disabled={isSaving}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                disabled={isSaving || !targetId}
              >
                {isSaving ? '移動中...' : '移動'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MoveWordsModal;

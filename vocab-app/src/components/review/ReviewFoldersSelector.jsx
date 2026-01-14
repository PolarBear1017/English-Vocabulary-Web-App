import React from 'react';
import { ArrowLeft } from 'lucide-react';

const ReviewFoldersSelector = ({
  sortedFolders,
  allFoldersSelected,
  selectedReviewFolders,
  allFolderIds,
  setSelectedReviewFolders,
  toggleReviewFolder,
  onBack
}) => (
  <div className="animate-in slide-in-from-right duration-300">
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-4 transition"
    >
      <ArrowLeft className="w-4 h-4" /> 返回複習中心
    </button>

    <h1 className="text-2xl font-bold mb-6">選擇複習資料夾</h1>
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={allFoldersSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedReviewFolders(allFolderIds.length > 0 ? allFolderIds : ['all']);
              } else {
                setSelectedReviewFolders([]);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          全部資料夾
        </label>
        <div className="border-t border-gray-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sortedFolders.map(folder => (
            <label key={folder.id} className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={allFoldersSelected || selectedReviewFolders.includes(folder.id)}
                onChange={() => toggleReviewFolder(folder.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {folder.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ReviewFoldersSelector;

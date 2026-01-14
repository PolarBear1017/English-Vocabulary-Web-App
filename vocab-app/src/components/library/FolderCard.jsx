import React from 'react';
import { Folder, Trash2, Sparkles } from 'lucide-react';
import ProficiencyDots from '../common/ProficiencyDots';
import { formatDate } from '../../utils/data';

const FolderCard = ({
  folder,
  folderWords,
  folderStats,
  onOpen,
  onDelete,
  onStartReview,
  onGenerateStory
}) => {
  const words = folderWords || [];
  const totalCount = folderStats?.count ?? words.length;
  const dueCount = folderStats?.dueCount ?? words.filter(word => new Date(word.nextReview) <= new Date()).length;
  const completionPercent = totalCount > 0
    ? Math.round(((totalCount - dueCount) / totalCount) * 100)
    : 0;
  const totalProficiency = words.reduce((sum, word) => sum + (word.proficiencyScore || 0), 0);
  const comprehensionPercent = totalCount > 0
    ? Math.round((totalProficiency / (totalCount * 5)) * 100)
    : 0;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onOpen}>
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg hover:text-blue-600 transition">{folder.name}</h3>
            <p className="text-sm text-gray-500">{totalCount} 個單字</p>
          </div>
        </div>
        {folder.id !== 'default' && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>複習完成度</span>
          <span className="font-semibold text-gray-700">{completionPercent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${completionPercent}%` }}
            aria-label={`複習完成度 ${completionPercent}%`}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
          <span>理解程度</span>
          <span className="font-semibold text-gray-700">{comprehensionPercent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all"
            style={{ width: `${comprehensionPercent}%` }}
            aria-label={`理解程度 ${comprehensionPercent}%`}
          />
        </div>
      </div>

      {words.length === 0 && (
        <div className="text-center text-xs text-gray-400 py-2">
          尚無單字，點擊查看詳情
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={onStartReview}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          複習
        </button>
        <button
          onClick={onGenerateStory}
          className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition flex items-center justify-center gap-1"
        >
          <Sparkles className="w-3 h-3" /> 生成故事
        </button>
      </div>
    </div>
  );
};

export default FolderCard;

import React from 'react';
import { ArrowLeft, ArrowUpDown, Folder, Volume2, Trash2, Book, Pencil } from 'lucide-react';
import ProficiencyDots from '../common/ProficiencyDots';
import { formatDate } from '../../utils/data';
import { speak } from '../../services/speechService';

const FolderDetail = ({
  activeFolder,
  wordSortBy,
  setWordSortBy,
  sortedActiveFolderWords,
  activeFolderStats,
  onBack,
  onEditFolder,
  onDeleteFolder,
  onShowDetails,
  onRemoveWordFromFolder,
  onGoSearch
}) => (
  <div className="animate-in fade-in slide-in-from-right duration-300">
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition group">
          <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="w-6 h-6 text-blue-500" />
            {activeFolder.name}
          </h1>
          <p className="text-gray-500 text-sm">{activeFolderStats?.count ?? sortedActiveFolderWords.length} 個單字</p>
          {activeFolder.description ? (
            <p className="text-xs text-gray-400 mt-1">{activeFolder.description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onEditFolder && (
          <button
            onClick={onEditFolder}
            className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
            title="編輯資料夾"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {onDeleteFolder && activeFolder.id !== 'default' && (
          <button
            onClick={onDeleteFolder}
            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition"
            title="刪除資料夾"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ArrowUpDown className="w-4 h-4" />
          <select
            className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white"
            value={wordSortBy}
            onChange={(e) => setWordSortBy(e.target.value)}
          >
            <option value="added_desc">最新加入</option>
            <option value="alphabetical_asc">A-Z</option>
            <option value="proficiency_asc">最不熟</option>
            <option value="next_review_asc">最先到期</option>
          </select>
        </div>
      </div>
    </header>

    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {sortedActiveFolderWords.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {sortedActiveFolderWords.map(word => (
            <div key={word.id} onClick={() => onShowDetails(word)} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition">{word.word}</span>
                  <button onClick={(e) => { e.stopPropagation(); speak(word.word); }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition">
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{word.pos}</span>
                </div>
                <p className="text-gray-600 text-sm">{word.translation || word.definition}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-400">理解程度</span>
                  <ProficiencyDots score={word.proficiencyScore} />
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="text-xs text-gray-400">下次複習</div>
                  <div className={`text-sm font-medium ${new Date(word.nextReview) <= new Date() ? 'text-red-500' : 'text-green-600'}`}>
                    {formatDate(word.nextReview)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`確定要將 "${word.word}" 從「${activeFolder.name}」移除嗎？`)) {
                      onRemoveWordFromFolder(word, activeFolder.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                  title="移除單字"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-gray-400 flex flex-col items-center">
          <Book className="w-12 h-12 mb-3 opacity-20" />
          <p>這個資料夾還是空的</p>
          <button onClick={onGoSearch} className="mt-4 text-blue-600 hover:underline text-sm">
            去查詢並新增單字
          </button>
        </div>
      )}
    </div>
  </div>
);

export default FolderDetail;

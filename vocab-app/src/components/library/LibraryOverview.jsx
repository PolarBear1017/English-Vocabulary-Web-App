import React from 'react';
import { RefreshCw, ArrowUpDown, Plus, Search, X } from 'lucide-react';
import FolderCard from './FolderCard';
import { isWordMatch } from '../../utils/data';

const LibraryOverview = ({
  sortedFolders,
  folderSortBy,
  setFolderSortBy,
  onOpenCreateFolder,
  handleManualSync,
  isDataLoaded,
  isSelectionMode,
  onToggleSelectionMode,
  setSelectedReviewFolders,
  setReviewSetupView,
  setActiveTab,
  generateFolderStory,
  handleDeleteFolder,
  handleEditFolder,
  setViewingFolderId,
  selectedFolderIds,
  onToggleFolder,
  onEnterSelectionMode,
  dragHandleProps,
  entriesByFolderId,
  statsByFolderId
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredFolders = React.useMemo(() => {
    if (!searchQuery.trim()) return sortedFolders;
    const query = searchQuery.toLowerCase().trim();

    return sortedFolders.filter(folder => {
      // Check for folder name match
      if (folder.name.toLowerCase().includes(query)) return true;

      // Check for matching words inside the folder
      const words = entriesByFolderId[folder.id] || [];
      return words.some(word => isWordMatch(word, searchQuery));
    });
  }, [sortedFolders, searchQuery, entriesByFolderId]);

  return (
    <>
      <header className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">我的單字庫</h1>
            <button onClick={handleManualSync} className="p-2 text-gray-400 hover:text-blue-600 transition rounded-full hover:bg-blue-50" title="手動同步資料">
              <RefreshCw className={`w-5 h-5 ${!isDataLoaded ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            {searchQuery && (
              <span className="text-gray-500 text-sm">
                搜尋到 {filteredFolders.length} 個資料夾
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onToggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${isSelectionMode ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              {isSelectionMode ? '取消選取' : '選取'}
            </button>
            <button onClick={onOpenCreateFolder} className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
              <Plus className="w-4 h-4" /> 新增資料夾
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋資料夾..."
              autoCapitalize="off"
              className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
            <ArrowUpDown className="w-4 h-4" />
            <select
              className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white w-full sm:w-auto"
              value={folderSortBy}
              onChange={(e) => setFolderSortBy(e.target.value)}
            >
              <option value="created_desc">最新</option>
              <option value="name_asc">名稱 A-Z</option>
              <option value="count_desc">單字數多</option>
            </select>
          </div>
        </div>
      </header>

      {filteredFolders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFolders.map(folder => (
            <FolderCard
              key={folder.id}
              folder={folder}
              folderWords={entriesByFolderId[folder.id] || []}
              folderStats={statsByFolderId[folder.id]}
              isSelectionMode={isSelectionMode}
              isSelected={selectedFolderIds.includes(folder.id)}
              dragHandleProps={dragHandleProps}
              onToggleSelect={onToggleFolder}
              onEnterSelectionMode={onEnterSelectionMode}
              onOpen={() => setViewingFolderId(folder.id)}
              onDelete={() => handleDeleteFolder(folder.id)}
              onEdit={() => handleEditFolder(folder)}
              onStartReview={() => {
                setSelectedReviewFolders([folder.id]);
                setReviewSetupView('main');
                setActiveTab('review');
              }}
              onGenerateStory={() => generateFolderStory(folder)}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-gray-400 flex flex-col items-center">
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 mb-3 opacity-20" />
              <p>找不到符合「{searchQuery}」的資料夾</p>
              <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-600 hover:underline text-sm">
                清除搜尋
              </button>
            </>
          ) : (
            <p>目前沒有資料夾</p>
          )}
        </div>
      )}
    </>
  );
};

export default LibraryOverview;

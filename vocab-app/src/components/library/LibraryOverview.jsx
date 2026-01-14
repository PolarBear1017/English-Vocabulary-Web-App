import React from 'react';
import { RefreshCw, ArrowUpDown, Plus } from 'lucide-react';
import FolderCard from './FolderCard';

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
  entriesByFolderId,
  statsByFolderId
}) => (
  <>
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">我的單字庫</h1>
        <button onClick={handleManualSync} className="p-2 text-gray-400 hover:text-blue-600 transition rounded-full hover:bg-blue-50" title="手動同步資料">
          <RefreshCw className={`w-5 h-5 ${!isDataLoaded ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ArrowUpDown className="w-4 h-4" />
          <select
            className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white"
            value={folderSortBy}
            onChange={(e) => setFolderSortBy(e.target.value)}
          >
            <option value="created_desc">最新</option>
            <option value="name_asc">名稱 A-Z</option>
            <option value="count_desc">單字數多</option>
          </select>
        </div>
        <button
          onClick={onToggleSelectionMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            isSelectionMode ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {isSelectionMode ? '取消選取' : '選取'}
        </button>
        <button onClick={onOpenCreateFolder} className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
          <Plus className="w-4 h-4" /> 新增資料夾
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sortedFolders.map(folder => (
        <FolderCard
          key={folder.id}
          folder={folder}
          folderWords={entriesByFolderId[folder.id] || []}
          folderStats={statsByFolderId[folder.id]}
          isSelectionMode={isSelectionMode}
          isSelected={selectedFolderIds.includes(folder.id)}
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
        />
      ))}
    </div>
  </>
);

export default LibraryOverview;

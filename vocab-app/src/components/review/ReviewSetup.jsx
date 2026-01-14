import React from 'react';
import { ArrowRight, Folder, Book, RefreshCw, Settings, Mic } from 'lucide-react';
import ReviewFoldersSelector from './ReviewFoldersSelector';

const ReviewSetup = ({
  reviewSetupView,
  setReviewSetupView,
  vocabData,
  selectedFolderLabel,
  selectedReviewFolders,
  startReview,
  sortedFolders,
  allFoldersSelected,
  toggleReviewFolder,
  allFolderIds,
  setSelectedReviewFolders
}) => {
  if (reviewSetupView === 'folders') {
    return (
      <ReviewFoldersSelector
        sortedFolders={sortedFolders}
        allFoldersSelected={allFoldersSelected}
        selectedReviewFolders={selectedReviewFolders}
        allFolderIds={allFolderIds}
        setSelectedReviewFolders={setSelectedReviewFolders}
        toggleReviewFolder={toggleReviewFolder}
        onBack={() => setReviewSetupView('main')}
      />
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">複習中心</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-8 flex justify-around">
        <div className="text-center">
          <div className="text-3xl font-bold text-pink-600">{vocabData.filter(w => new Date(w.nextReview) <= new Date()).length}</div>
          <div className="text-sm text-gray-600">待複習</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{vocabData.length}</div>
          <div className="text-sm text-gray-600">總單字量</div>
        </div>
      </div>

      <button
        onClick={() => setReviewSetupView('folders')}
        className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <Folder className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-800">選擇複習資料夾</div>
            <div className="text-sm text-gray-500">{selectedFolderLabel}</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300" />
      </button>

      <h3 className="font-bold text-gray-700 mb-4">選擇複習模式</h3>
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: 'flashcard', name: '單字卡模式 (Flashcards)', icon: Book, desc: '經典翻牌，自我評分' },
          { id: 'spelling', name: '看義拼字 (Spelling)', icon: RefreshCw, desc: '根據中文解釋拼寫單字' },
          { id: 'cloze', name: '例句填空 (Cloze)', icon: Settings, desc: '根據例句填入缺失單字' },
          { id: 'dictation', name: '聽音拼字 (Dictation)', icon: Mic, desc: '聽發音拼寫單字' }
        ].map(mode => (
          <button key={mode.id} onClick={() => startReview(selectedReviewFolders, mode.id)} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition text-left group">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition"><mode.icon className="w-6 h-6" /></div>
            <div>
              <div className="font-bold text-gray-800">{mode.name}</div>
              <div className="text-sm text-gray-500">{mode.desc}</div>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-blue-500" />
          </button>
        ))}
      </div>
    </>
  );
};

export default ReviewSetup;

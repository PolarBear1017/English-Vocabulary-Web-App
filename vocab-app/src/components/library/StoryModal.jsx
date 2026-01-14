import React from 'react';
import { X, Sparkles, Loader2, Volume2 } from 'lucide-react';
import { speak } from '../../utils/speech';

const StoryModal = ({ story, isGeneratingStory, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
      <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
        <X className="w-6 h-6" />
      </button>
      <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5" /> AI 單字故事
      </h2>

      {isGeneratingStory ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-purple-500" />
          <p>正在發揮創意編寫故事中...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="prose prose-purple max-w-none text-gray-700 max-h-[60vh] overflow-y-auto">
            <p className="whitespace-pre-line leading-relaxed">{story}</p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button onClick={() => speak(story.replace(/\*\*/g, ''))} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">
              <Volume2 className="w-4 h-4" /> 朗讀故事
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700">
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default StoryModal;

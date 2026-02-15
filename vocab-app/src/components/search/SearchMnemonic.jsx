import React, { useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

const SearchMnemonic = ({ mnemonics, groqApiKey, aiLoading, onGenerate }) => {
  const displayText = useMemo(() => {
    if (!mnemonics) return '';
    if (typeof mnemonics === 'string') return mnemonics;
    const method = mnemonics.method ? `方法：${mnemonics.method}` : '';
    const content = mnemonics.content || '';
    return [method, content].filter(Boolean).join('\n');
  }, [mnemonics]);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-100 relative group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-purple-800">AI 記憶助手</h3>
        </div>
        {displayText && groqApiKey && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate();
            }}
            disabled={aiLoading}
            className="p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
            title="重新生成"
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {displayText ? (
        <div className="relative">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{displayText}</p>
        </div>
      ) : (
        <div className="text-center py-2">
          {groqApiKey ? (
            <button
              onClick={onGenerate}
              disabled={aiLoading}
              className="bg-white text-purple-600 border border-purple-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</> : <><Sparkles className="w-4 h-4" /> 生成字根/諧音記憶法</>}
            </button>
          ) : (
            <p className="text-sm text-gray-400">請設定 API Key 以啟用記憶法生成</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchMnemonic;

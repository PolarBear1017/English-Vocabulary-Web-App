import React, { useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const isValidPart = (val) => Boolean(val && !['無', 'none', 'n/a', '-', 'null'].includes(val.trim().toLowerCase()));

const SearchMnemonic = ({ mnemonics, groqApiKey, aiLoading, onGenerate }) => {
  const { t } = useTranslation();
  const displayText = useMemo(() => {
    if (!mnemonics) return '';
    if (typeof mnemonics === 'string') return mnemonics;
    const content = mnemonics.content || '';
    return content;
  }, [mnemonics]);

  const methodText = useMemo(() => {
    if (!mnemonics || typeof mnemonics === 'string') return '';
    return mnemonics.method || '';
  }, [mnemonics]);

  const details = mnemonics?.details;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-100 relative group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-purple-800">{t('card.aiMnemonicAssistant')}</h3>
        </div>
        {displayText && groqApiKey && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate();
            }}
            disabled={aiLoading}
            className="p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
            title={t('card.regenerate')}
          >
            {aiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {displayText || details ? (
        <div className="relative">
          {methodText && <p className="text-sm font-semibold text-purple-700 mb-2">{methodText}</p>}
          
          {details && (
            <div className="flex flex-wrap gap-2 mb-3">
              {isValidPart(details.prefix) && (
                <div className="bg-blue-100/80 text-blue-800 px-3 py-1.5 rounded-lg text-sm border border-blue-200">
                  <span className="font-bold mr-1 block sm:inline">{details.prefix}</span>
                  <span className="text-blue-600/80 text-xs sm:text-sm">{details.prefixMeaning}</span>
                </div>
              )}
              {isValidPart(details.root) && (
                <div className="bg-emerald-100/80 text-emerald-800 px-3 py-1.5 rounded-lg text-sm border border-emerald-200">
                  <span className="font-bold mr-1 block sm:inline">{details.root}</span>
                  <span className="text-emerald-600/80 text-xs sm:text-sm">{details.rootMeaning}</span>
                </div>
              )}
              {isValidPart(details.suffix) && (
                <div className="bg-pink-100/80 text-pink-800 px-3 py-1.5 rounded-lg text-sm border border-pink-200">
                  <span className="font-bold mr-1 block sm:inline">{details.suffix}</span>
                  <span className="text-pink-600/80 text-xs sm:text-sm">{details.suffixMeaning}</span>
                </div>
              )}
            </div>
          )}
          
          {displayText && (
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-white/50 p-3 rounded-lg border border-purple-50/50">
              {displayText}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          {groqApiKey ? (
            <button
              onClick={onGenerate}
              disabled={aiLoading}
              className="bg-white text-purple-600 border border-purple-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('card.generating')}</> : <><Sparkles className="w-4 h-4" /> {t('card.generateMnemonic')}</>}
            </button>
          ) : (
            <p className="text-sm text-gray-400">{t('card.setApiKeyForMnemonic')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchMnemonic;

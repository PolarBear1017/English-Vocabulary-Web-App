import React, { useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const isValidPart = (val) => Boolean(val && !['無', 'none', 'n/a', '-', 'null'].includes(val.trim().toLowerCase()));

const SearchMnemonic = ({
  mnemonics,
  groqApiKey,
  aiLoading,
  onGenerate,
  isOpen = true,
  onToggleOpen
}) => {
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

  const summaryChips = useMemo(() => {
    if (details) {
      const parts = [
        isValidPart(details.prefix) ? details.prefix : null,
        isValidPart(details.root) ? details.root : null,
        isValidPart(details.suffix) ? details.suffix : null
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(' + ');
      }
    }
    if (methodText) return methodText;
    if (displayText) {
      return displayText.length > 35 ? displayText.slice(0, 35) + '...' : displayText;
    }
    return '';
  }, [details, methodText, displayText]);

  if (!isOpen) {
    return (
      <div
        onClick={onToggleOpen}
        className="bg-gradient-to-r from-purple-50/90 to-indigo-50/90 hover:from-purple-100/90 hover:to-indigo-100/90 px-4 py-2.5 rounded-xl border border-purple-100 flex items-center justify-between cursor-pointer transition shadow-xs group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-purple-900 shrink-0">
            {t('card.aiMnemonicAssistant')}
          </span>
          {aiLoading ? (
            <span className="text-xs text-purple-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span className="truncate">{t('card.generating', '生成中...')}</span>
            </span>
          ) : summaryChips ? (
            <span className="text-xs text-purple-700 bg-white/70 px-2 py-0.5 rounded-md border border-purple-100 truncate max-w-[200px] sm:max-w-xs">
              {summaryChips}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="p-1 text-purple-400 group-hover:text-purple-700 transition shrink-0"
          title={t('common.expand', '展開')}
          onClick={(e) => {
            e.stopPropagation();
            onToggleOpen?.();
          }}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 sm:p-5 rounded-xl border border-purple-100 relative group transition-all">
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={onToggleOpen}
        >
          <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
          <h3 className="font-bold text-sm sm:text-base text-purple-900">{t('card.aiMnemonicAssistant')}</h3>
          {aiLoading && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('card.generating', '生成中...')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {displayText && groqApiKey && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              disabled={aiLoading}
              className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-100/70 rounded-lg transition-colors disabled:opacity-50"
              title={t('card.regenerate')}
            >
              {aiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          )}
          {onToggleOpen && (
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 text-purple-400 hover:text-purple-700 hover:bg-purple-100/70 rounded-lg transition-colors"
              title={t('common.collapse', '收合')}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {aiLoading && !displayText && !details ? (
        <div className="space-y-2.5 py-1">
          <div className="flex items-center gap-2 text-xs text-purple-700 font-medium animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
            <span>{t('card.generatingMnemonic', 'AI 正在為你提煉字根與聯想記憶...')}</span>
          </div>
          <div className="h-4 bg-purple-200/50 rounded-md w-3/4 animate-pulse" />
          <div className="h-3.5 bg-purple-200/35 rounded-md w-1/2 animate-pulse" />
        </div>
      ) : displayText || details ? (
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
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-white/60 p-3 rounded-lg border border-purple-50/50">
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
              className="bg-white text-purple-600 border border-purple-200 px-4 py-2 rounded-lg text-sm font-medium shadow-xs hover:shadow-sm transition flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('card.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> {t('card.generateMnemonic')}
                </>
              )}
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

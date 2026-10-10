import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bookmark, Sparkles } from 'lucide-react';
import { getVerbForms } from '../../utils/verbForms';

const POS_CONFIG = {
  noun: {
    tagKey: 'card.posNoun',
    fallbackLabel: 'n.',
    containerClass: 'border-emerald-200/90 bg-emerald-50/35',
    badgeClass: 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
  },
  verb: {
    tagKey: 'card.posVerb',
    fallbackLabel: 'v.',
    containerClass: 'border-blue-200/90 bg-blue-50/35',
    badgeClass: 'bg-blue-100/90 text-blue-800 border-blue-300'
  },
  adjective: {
    tagKey: 'card.posAdjective',
    fallbackLabel: 'adj.',
    containerClass: 'border-amber-200/90 bg-amber-50/35',
    badgeClass: 'bg-amber-100/90 text-amber-800 border-amber-300'
  },
  adverb: {
    tagKey: 'card.posAdverb',
    fallbackLabel: 'adv.',
    containerClass: 'border-purple-200/90 bg-purple-50/35',
    badgeClass: 'bg-purple-100/90 text-purple-800 border-purple-300'
  }
};

const SearchSimilarList = ({
  currentWord = null,
  verbForms = null,
  wordFamily = null,
  similarWords = [],
  savedWordsSet = null,
  historyTrail = [],
  onSelect,
  onBack
}) => {
  const { t } = useTranslation();

  const safeSimilar = Array.isArray(similarWords) ? similarWords : [];
  const safeFamily = wordFamily && typeof wordFamily === 'object' ? wordFamily : {};

  const hasFamily = Object.values(safeFamily).some((arr) => Array.isArray(arr) && arr.length > 0);
  const hasSimilar = safeSimilar.length > 0;
  const canGoBack = Array.isArray(historyTrail) && historyTrail.length > 1;

  const resolvedVerbForms = useMemo(() => {
    if (verbForms && verbForms.present && verbForms.past) {
      return verbForms;
    }
    const target = currentWord || (canGoBack ? historyTrail[historyTrail.length - 1] : null);
    return target ? getVerbForms(target) : null;
  }, [verbForms, currentWord, canGoBack, historyTrail]);

  if (!hasFamily && !hasSimilar && !canGoBack && !resolvedVerbForms) {
    return null;
  }

  const previousWord = canGoBack ? historyTrail[historyTrail.length - 2] : null;

  return (
    <div className="mt-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 p-4 space-y-4 text-left transition-all">
      {/* 1. 麵包屑回溯按鈕 (防迷航機制) */}
      {canGoBack && previousWord && (
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>
              {t('card.backToPrevious', '回到上一字')}: <span className="underline font-semibold">{previousWord}</span>
            </span>
          </button>
        </div>
      )}

      {/* 2. 動詞三態 (Verb Forms) - 獨立 Category */}
      {resolvedVerbForms && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('card.verbForms', '動詞三態')}</span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl border border-indigo-200/90 bg-indigo-50/35">
            <div className="flex flex-wrap items-center gap-3">
              {[
                {
                  key: 'present',
                  labelKey: 'card.presentTense',
                  fallbackLabel: '現在式',
                  word: resolvedVerbForms.present
                },
                {
                  key: 'past',
                  labelKey: 'card.pastTense',
                  fallbackLabel: '過去式',
                  word: resolvedVerbForms.past
                },
                {
                  key: 'pastParticiple',
                  labelKey: 'card.pastParticiple',
                  fallbackLabel: '過去分詞',
                  word: resolvedVerbForms.pastParticiple
                }
              ].map((item, idx) => {
                const isSaved = savedWordsSet?.has(item.word?.toLowerCase());
                return (
                  <div key={item.key} className="flex items-center gap-1.5">
                    {idx > 0 && <span className="text-indigo-300 text-xs mr-0.5 hidden sm:inline">→</span>}
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded border bg-indigo-100/90 text-indigo-800 border-indigo-300 shadow-2xs">
                      {t(item.labelKey, item.fallbackLabel)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelect(item.word)}
                      title={isSaved ? `${item.word} (${t('card.savedInLibrary', '已在單字庫中')})` : item.word}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-white/95 hover:border-slate-300 border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 transition shadow-2xs cursor-pointer"
                    >
                      <span>{item.word}</span>
                      {isSaved && (
                        <Bookmark className="w-2.5 h-2.5 text-blue-500 fill-blue-500 shrink-0" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. 詞性變化 (Word Family) */}
      {hasFamily && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('card.wordFamily', '詞性變化')}</span>
          </div>

          <div className="space-y-2">
            {Object.entries(POS_CONFIG).map(([posKey, config]) => {
              const list = Array.isArray(safeFamily[posKey]) ? safeFamily[posKey] : [];
              if (list.length === 0) return null;

              return (
                <div
                  key={posKey}
                  className={`flex flex-wrap items-center gap-2 p-2 sm:p-2.5 rounded-xl border ${config.containerClass}`}
                >
                  <span
                    className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${config.badgeClass}`}
                  >
                    {t(config.tagKey, config.fallbackLabel)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {list.map((word) => {
                      const isSaved = savedWordsSet?.has(word.toLowerCase());
                      return (
                        <button
                          key={word}
                          type="button"
                          onClick={() => onSelect(word)}
                          title={isSaved ? `${word} (${t('card.savedInLibrary', '已在單字庫中')})` : word}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-white/95 hover:border-slate-300 border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 transition shadow-2xs cursor-pointer"
                        >
                          <span>{word}</span>
                          {isSaved && (
                            <Bookmark className="w-2.5 h-2.5 text-blue-500 fill-blue-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. 相似字 (Similar Words) */}
      {hasSimilar && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('card.similarWords', '相似字')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safeSimilar.map((word) => {
              const isSaved = savedWordsSet?.has(word.toLowerCase());
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => onSelect(word)}
                  title={isSaved ? `${word} (${t('card.savedInLibrary', '已在單字庫中')})` : word}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 transition shadow-2xs cursor-pointer"
                >
                  <span>{word}</span>
                  {isSaved && (
                    <Bookmark className="w-2.5 h-2.5 text-blue-500 fill-blue-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchSimilarList;

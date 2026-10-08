import React, { useState } from 'react';
import { Keyboard, RotateCcw, Info, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsContext } from '../../contexts/SettingsContext';

const DEFAULT_PLAY_SHORTCUT = 'Tab';

const SettingsShortcuts = () => {
  const { t } = useTranslation();
  const settings = useSettingsContext();
  const { playAudioShortcut } = settings.state;
  const { setPlayAudioShortcut } = settings.actions;

  const [isRecording, setIsRecording] = useState(false);

  const currentShortcut = playAudioShortcut || DEFAULT_PLAY_SHORTCUT;

  const handleKeyDown = (e) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();

    // Prevent pure modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    let keyName = e.key;
    if (keyName === ' ') keyName = 'Space';
    if (keyName === 'Escape') {
      setIsRecording(false);
      return;
    }

    setPlayAudioShortcut(keyName);
    setIsRecording(false);
  };

  const handleReset = () => {
    setPlayAudioShortcut(DEFAULT_PLAY_SHORTCUT);
    setIsRecording(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Keyboard className="w-6 h-6 text-blue-600" />
          {t('settings.shortcutsTitle', '快捷鍵設定')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('settings.shortcutsSubtitle', '自訂單字發音與介面操作快捷鍵（僅適用於桌面電腦與具備實體鍵盤的裝置）。')}
        </p>
      </div>

      {/* Main customizable shortcut card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-gray-800">
                {t('settings.shortcutPlayAudio', '播放/重聽單字發音')}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {t('settings.shortcutPlayAudioDesc', '在查詢結果、單字詳情、聽寫模式與複習卡背時一鍵播放。')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onKeyDown={handleKeyDown}
              onClick={() => setIsRecording(true)}
              onBlur={() => setIsRecording(false)}
              className={`px-4 py-2 rounded-xl font-mono text-sm font-semibold border transition outline-none cursor-pointer ${
                isRecording
                  ? 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-200 animate-pulse'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
              title={isRecording ? t('settings.pressAnyKey', '請按下鍵盤上的任一鍵...') : t('settings.clickToRecord', '點擊以錄製快捷鍵')}
            >
              {isRecording ? t('settings.listeningKey', '按下按鍵...') : currentShortcut}
            </button>

            {currentShortcut !== DEFAULT_PLAY_SHORTCUT && (
              <button
                type="button"
                onClick={handleReset}
                title={t('settings.resetDefault', '重置預設')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isRecording && (
          <p className="text-xs text-blue-600 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
            {t('settings.recordingHint', '請直接按下您想設定的鍵盤按鍵（按 Esc 可取消錄製）。')}
          </p>
        )}
      </div>

      {/* Preset shortcuts overview */}
      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <Info className="w-4 h-4 text-blue-500" />
          {t('settings.presetShortcutsTitle', '其他內建快捷鍵一覽')}
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
            <span>{t('settings.shortcutReviewFlip', '複習模式：送出答案 / 翻開卡片')}</span>
            <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono font-medium">Enter</kbd>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
            <span>{t('settings.shortcutReviewRating', '翻牌後評分 (1: Again ~ 4: Easy)')}</span>
            <div className="flex gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700">1</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700">2</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700">3</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700">4</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
            <span>{t('settings.shortcutLibraryNav', '單字詳情卡片：切換上一個 / 下一個單字')}</span>
            <div className="flex gap-1 font-mono">
              <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700">←</kbd>
              <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700">→</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>{t('settings.shortcutSearchSave', '單字查詢結果：快速開始儲存')}</span>
            <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono font-medium">Enter</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsShortcuts;

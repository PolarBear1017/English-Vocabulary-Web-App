import React, { useState } from 'react';
import {
  Keyboard,
  RotateCcw,
  Info,
  Volume2,
  Search,
  BookOpen,
  Book,
} from 'lucide-react';
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

  const shortcutGroups = [
    {
      id: 'search',
      title: t('settings.shortcutGroupSearch', '單字查詢與導航'),
      icon: Search,
      items: [
        {
          label: t('settings.shortcutSearchSubmit', '搜尋框：送出查詢單字'),
          combinations: [['Enter']],
        },
        {
          label: t('settings.shortcutSearchSave', '查詢結果：快速開始儲存單字'),
          combinations: [['Enter']],
        },
        {
          label: t('settings.shortcutFolderConfirm', '資料夾選單：確認儲存至選定資料夾'),
          combinations: [['Enter']],
        },
        {
          label: t('settings.shortcutFolderCancel', '資料夾選單：取消並關閉選單'),
          combinations: [['Esc']],
        },
        {
          label: t('settings.shortcutNavTrackNext', '側邊軌道：跳轉至下一個區塊'),
          combinations: [['↓'], ['J']],
        },
        {
          label: t('settings.shortcutNavTrackPrev', '側邊軌道：跳轉至上一個區塊'),
          combinations: [['↑'], ['K']],
        },
        {
          label: t('settings.shortcutToggleDefinition', '自訂釋義：切換勾選目前選取的釋義'),
          combinations: [['Space'], ['Enter']],
        },
      ],
    },
    {
      id: 'review',
      title: t('settings.shortcutGroupReview', '複習測驗'),
      icon: BookOpen,
      items: [
        {
          label: t('settings.shortcutReviewFlip', '翻開卡片 / 送出答案'),
          combinations: [['Space'], ['Enter']],
        },
        {
          label: t('settings.shortcutReviewRating', '翻牌後評分 (1: Again ~ 4: Easy)'),
          combinations: [['1', '2', '3', '4']],
        },
      ],
    },
    {
      id: 'library',
      title: t('settings.shortcutGroupLibrary', '單字庫瀏覽'),
      icon: Book,
      items: [
        {
          label: t('settings.shortcutLibraryPrev', '切換上一個單字'),
          combinations: [['←'], ['H']],
        },
        {
          label: t('settings.shortcutLibraryNext', '切換下一個單字'),
          combinations: [['→'], ['L']],
        },
        {
          label: t('settings.shortcutLibraryClose', '關閉單字詳情彈窗'),
          combinations: [['Esc']],
        },
      ],
    },
  ];

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
                {t('settings.shortcutPlayAudio', '播放 / 重聽單字發音')}
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
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-800">
            {t('settings.presetShortcutsTitle', '全站內建快捷鍵一覽')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shortcutGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div
                key={group.id}
                className={`bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 ${
                  group.id === 'search' ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                    <GroupIcon className="w-3.5 h-3.5" />
                  </div>
                  <span>{group.title}</span>
                </div>

                <div className="divide-y divide-gray-100 text-xs">
                  {group.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2.5 gap-4"
                    >
                      <span className="text-gray-600 leading-snug">{item.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        {item.combinations.map((combo, cIdx) => (
                          <React.Fragment key={cIdx}>
                            {cIdx > 0 && (
                              <span className="text-gray-300 text-xs select-none">/</span>
                            )}
                            <div className="flex items-center gap-1">
                              {combo.map((k) => (
                                <kbd
                                  key={k}
                                  className="px-2 py-0.5 min-w-[24px] text-center bg-gray-50 border border-gray-200 rounded-md text-gray-700 font-medium shadow-xs"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SettingsShortcuts;

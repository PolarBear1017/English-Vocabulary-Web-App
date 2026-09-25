import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Languages } from 'lucide-react';
import { useSettingsContext } from '../../contexts/SettingsContext';

const SettingsLanguage = () => {
  const { t } = useTranslation();
  const settings = useSettingsContext();
  const { uiLanguage, definitionLanguage } = settings.state;
  const { setUiLanguage, setDefinitionLanguage } = settings.actions;

  const uiLanguages = [
    { code: 'zh-TW', label: t('settings.langZhTw') },
    { code: 'en', label: t('settings.langEn') }
  ];

  const definitionLanguages = [
    { code: 'zh-TW', label: t('settings.defZhTw') },
    { code: 'en', label: t('settings.defEn') }
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        {t('settings.languageSection')}
      </h2>

      {/* 介面語言 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Globe className="w-4 h-4 text-blue-600" />
          {t('settings.uiLanguage')}
        </label>
        <p className="text-xs text-gray-500">
          {t('settings.uiLanguageDesc')}
        </p>
        <select
          value={uiLanguage}
          onChange={(e) => setUiLanguage(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {uiLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <hr className="border-gray-100" />

      {/* 字典與 AI 釋義語言 */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Languages className="w-4 h-4 text-emerald-600" />
          {t('settings.definitionLanguage')}
        </label>
        <p className="text-xs text-gray-500">
          {t('settings.definitionLanguageDesc')}
        </p>
        <select
          value={definitionLanguage}
          onChange={(e) => setDefinitionLanguage(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {definitionLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SettingsLanguage;

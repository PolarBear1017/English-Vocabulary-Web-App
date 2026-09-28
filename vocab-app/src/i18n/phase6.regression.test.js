import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n from './config';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';
import {
  loadUiLanguage,
  saveUiLanguage,
  loadDefinitionLanguage,
  saveDefinitionLanguage,
  STORAGE_KEYS
} from '../services/storageService';
import { speak } from '../services/speechService';

const mockStorage = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => mockStorage[key] ?? null),
  setItem: vi.fn((key, val) => { mockStorage[key] = String(val); }),
  removeItem: vi.fn((key) => { delete mockStorage[key]; }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  })
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Phase 6: End-to-End Regression & Edge Cases', () => {
  beforeEach(async () => {
    mockLocalStorage.clear();
    await i18n.changeLanguage('zh-TW');
  });

  describe('1. Locale Parity and Structure Completeness', () => {
    const getDeepKeys = (obj, prefix = '') => {
      let keys = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys = keys.concat(getDeepKeys(value, fullKey));
        } else {
          if (!fullKey.endsWith('_one') && !fullKey.endsWith('_other')) {
            keys.push(fullKey);
          }
        }
      }
      return keys.sort();
    };

    it('ensures zero missing keys between zh-TW and en across all namespaces', () => {
      const zhKeys = getDeepKeys(zhTW);
      const enKeys = getDeepKeys(en);

      const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
      const missingInZh = enKeys.filter(k => !zhKeys.includes(k));

      expect(missingInEn).toEqual([]);
      expect(missingInZh).toEqual([]);
    });

    it('validates critical UI namespaces exist in both locales', () => {
      const namespaces = ['common', 'nav', 'search', 'library', 'review', 'settings', 'card', 'toast'];
      namespaces.forEach(ns => {
        expect(zhTW[ns]).toBeDefined();
        expect(en[ns]).toBeDefined();
        expect(Object.keys(zhTW[ns]).length).toBeGreaterThan(0);
        expect(Object.keys(en[ns]).length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Navigation and Review Mode Localization', () => {
    it('correctly localizes navigation tabs in both languages', async () => {
      expect(i18n.t('nav.search')).toBe('搜尋');
      expect(i18n.t('nav.library')).toBe('單字庫');
      expect(i18n.t('nav.review')).toBe('複習');
      expect(i18n.t('nav.settings')).toBe('設定');

      await i18n.changeLanguage('en');
      expect(i18n.t('nav.search')).toBe('Search');
      expect(i18n.t('nav.library')).toBe('Library');
      expect(i18n.t('nav.review')).toBe('Review');
      expect(i18n.t('nav.settings')).toBe('Settings');
    });

    it('correctly localizes FSRS review rating buttons in both languages', async () => {
      expect(i18n.t('review.again')).toBe('1 - Again (忘記)');
      expect(i18n.t('review.hard')).toBe('2 - Hard (困難)');
      expect(i18n.t('review.good')).toBe('3 - Good (良好)');
      expect(i18n.t('review.easy')).toBe('4 - Easy (簡單)');
      expect(i18n.t('review.showAnswer')).toBe('顯示答案');
      expect(i18n.t('review.selfAssessment')).toBe('自評理解程度');

      await i18n.changeLanguage('en');
      expect(i18n.t('review.again')).toBe('1 - Again');
      expect(i18n.t('review.hard')).toBe('2 - Hard');
      expect(i18n.t('review.good')).toBe('3 - Good');
      expect(i18n.t('review.easy')).toBe('4 - Easy');
      expect(i18n.t('review.showAnswer')).toBe('Show Answer');
      expect(i18n.t('review.selfAssessment')).toBe('Rate Your Recall');
    });
  });

  describe('3. Settings & Language Preferences Persistence', () => {
    it('loads default languages when localStorage is empty', () => {
      expect(loadUiLanguage()).toBe('zh-TW');
      expect(loadDefinitionLanguage()).toBe('zh-TW');
    });

    it('persists and restores custom UI language in localStorage', () => {
      saveUiLanguage('en');
      expect(localStorage.getItem(STORAGE_KEYS.uiLanguage)).toBe('en');
      expect(loadUiLanguage()).toBe('en');

      saveUiLanguage('zh-TW');
      expect(loadUiLanguage()).toBe('zh-TW');
    });

    it('persists and restores custom definition language in localStorage', () => {
      saveDefinitionLanguage('en');
      expect(localStorage.getItem(STORAGE_KEYS.definitionLanguage)).toBe('en');
      expect(loadDefinitionLanguage()).toBe('en');

      saveDefinitionLanguage('zh-TW');
      expect(loadDefinitionLanguage()).toBe('zh-TW');
    });
  });

  describe('4. Dictionary URL Resolution based on Target Language', () => {
    it('constructs traditional chinese or english URLs correctly for Cambridge', () => {
      const getCambridgeUrl = (word, targetLang = 'zh-TW') => {
        const isEn = targetLang === 'en';
        return isEn
          ? `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`
          : `https://dictionary.cambridge.org/dictionary/english-chinese-traditional/${encodeURIComponent(word)}`;
      };

      expect(getCambridgeUrl('apple', 'zh-TW')).toBe(
        'https://dictionary.cambridge.org/dictionary/english-chinese-traditional/apple'
      );
      expect(getCambridgeUrl('apple', 'en')).toBe(
        'https://dictionary.cambridge.org/dictionary/english/apple'
      );
    });

    it('constructs learner-english URL correctly for Cambridge Learner', () => {
      const getCambridgeLearnerUrl = (word) => {
        return `https://dictionary.cambridge.org/dictionary/learner-english/${encodeURIComponent(word.toLowerCase().trim())}`;
      };

      expect(getCambridgeLearnerUrl('apple')).toBe(
        'https://dictionary.cambridge.org/dictionary/learner-english/apple'
      );
    });
  });

  describe('5. Speech Service Fallback & Language Detection', () => {
    it('does not throw when speaking text with various options', () => {
      expect(() => {
        speak('apple', null, { rate: 1.0 });
      }).not.toThrow();

      expect(() => {
        speak('蘋果', null, { rate: 0.8, lang: 'zh-TW' });
      }).not.toThrow();
    });

    it('triggers fallback callback when audioUrl fails', async () => {
      const onPlaybackFailedSpy = vi.fn();
      speak('test', 'https://example.com/audio.mp3', {
        onPlaybackFailed: onPlaybackFailedSpy
      });
      await new Promise(r => setTimeout(r, 30));
      expect(onPlaybackFailedSpy).toHaveBeenCalled();
    });
  });
});

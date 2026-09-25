import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './config';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';

describe('i18n configuration and switching', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW');
  });

  it('translates correctly in default language (zh-TW)', () => {
    expect(i18n.t('common.save')).toBe('儲存');
    expect(i18n.t('nav.search')).toBe('搜尋');
    expect(i18n.t('settings.title')).toBe('設定');
    expect(i18n.t('review.again')).toBe('1 - Again (忘記)');
  });

  it('translates correctly after switching to English (en)', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('nav.search')).toBe('Search');
    expect(i18n.t('settings.title')).toBe('Settings');
    expect(i18n.t('review.again')).toBe('1 - Again');
  });

  it('supports interpolation in templates', async () => {
    expect(i18n.t('search.returnToFolder', { name: 'TOEIC' })).toBe('返回 TOEIC');

    await i18n.changeLanguage('en');
    expect(i18n.t('search.returnToFolder', { name: 'TOEIC' })).toBe('Back to TOEIC');
  });

  it('supports pluralization in English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('library.wordsCount', { count: 1 })).toBe('1 word');
    expect(i18n.t('library.wordsCount', { count: 5 })).toBe('5 words');
  });

  it('falls back to default language if key is missing in active language', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('non.existent.key')).toBe('non.existent.key');
  });

  it('maintains strict key parity between zh-TW and en locales', () => {
    const getDeepKeys = (obj, prefix = '') => {
      let keys = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys = keys.concat(getDeepKeys(value, fullKey));
        } else {
          // ignore _one and _other plural suffixes in parity check because English has special plurals
          if (!fullKey.endsWith('_one') && !fullKey.endsWith('_other')) {
            keys.push(fullKey);
          }
        }
      }
      return keys.sort();
    };

    const zhKeys = getDeepKeys(zhTW);
    const enKeys = getDeepKeys(en);

    const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
    const missingInZh = enKeys.filter(k => !zhKeys.includes(k));

    expect(missingInEn).toEqual([]);
    expect(missingInZh).toEqual([]);
  });
});

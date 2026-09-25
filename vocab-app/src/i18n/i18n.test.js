import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './config';

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
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import QuickScrollNav from './QuickScrollNav';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key
  })
}));

describe('QuickScrollNav Component', () => {
  it('renders all nav buttons when all sections are enabled', () => {
    const html = renderToStaticMarkup(<QuickScrollNav hasMnemonic={true} hasRelations={true} />);

    expect(html).toContain('回到頂部');
    expect(html).toContain('AI 記憶助手');
    expect(html).toContain('單字釋義');
    expect(html).toContain('詞性與關聯');
    expect(html).toContain('search-section-header');
  });

  it('omits mnemonic and relations when disabled', () => {
    const html = renderToStaticMarkup(<QuickScrollNav hasMnemonic={false} hasRelations={false} />);

    expect(html).toContain('回到頂部');
    expect(html).not.toContain('AI 記憶助手');
    expect(html).toContain('單字釋義');
    expect(html).not.toContain('詞性與關聯');
  });

  it('has proper iOS pill container styling and accessibility label', () => {
    const html = renderToStaticMarkup(<QuickScrollNav hasMnemonic={true} hasRelations={true} />);

    expect(html).toContain('aria-label="快速跳轉導航"');
    expect(html).toContain('backdrop-blur');
    expect(html).toContain('rounded-full');
    expect(html).toContain('data-testid="active-indicator"');
  });
});

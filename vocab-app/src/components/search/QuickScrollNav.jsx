import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, BookOpen, Layers, Sparkles } from 'lucide-react';

const QuickScrollNav = ({ hasMnemonic = true, hasRelations = true }) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('top');
  const [hoveredSection, setHoveredSection] = useState(null);
  const isClickScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const navItems = [
    {
      id: 'top',
      targetId: 'search-section-header',
      icon: ArrowUp,
      labelKey: 'card.navTop',
      fallbackLabel: '回到頂部'
    },
    {
      id: 'definitions',
      targetId: 'search-section-definitions',
      icon: BookOpen,
      labelKey: 'card.navDefinitions',
      fallbackLabel: '單字釋義'
    },
    ...(hasMnemonic
      ? [
          {
            id: 'mnemonic',
            targetId: 'search-section-mnemonic',
            icon: Sparkles,
            labelKey: 'card.navMnemonic',
            fallbackLabel: 'AI 記憶助手'
          }
        ]
      : []),
    ...(hasRelations
      ? [
          {
            id: 'relations',
            targetId: 'search-section-relations',
            icon: Layers,
            labelKey: 'card.navRelations',
            fallbackLabel: '詞性與關聯'
          }
        ]
      : [])
  ];

  // 滾動監聽 (Scrollspy)
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrollingRef.current) return;

      const mainEl = document.querySelector('main');
      const scrollY = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0,
        mainEl?.scrollTop || 0
      );

      if (scrollY < 80) {
        setActiveSection('top');
        return;
      }

      // 檢查各區塊頂部距離
      const offsets = navItems.map((item) => {
        if (item.id === 'top') return { id: 'top', top: 0 };
        const el = document.getElementById(item.targetId);
        if (!el) return { id: item.id, top: Infinity };
        const rect = el.getBoundingClientRect();
        return { id: item.id, top: rect.top };
      });

      // 找出最靠近視窗上半部的區塊
      const candidate = offsets
        .filter((o) => o.top <= 260)
        .sort((a, b) => b.top - a.top)[0];

      if (candidate) {
        setActiveSection(candidate.id);
      }
    };

    const mainEl = document.querySelector('main');
    window.addEventListener('scroll', handleScroll, { passive: true });
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [navItems]);

  const scrollToSection = useCallback((item) => {
    setActiveSection(item.id);
    isClickScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    if (item.id === 'top') {
      // 同時滾動 window、document 與 main 容器，確保各種佈局下均能返回最頂端
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (document.documentElement) {
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (document.body) {
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
      }
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
      const topTarget = document.querySelector('header') || document.getElementById('search-section-header');
      if (topTarget) {
        topTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const el = document.getElementById(item.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 800);
  }, []);

  const isTouchActiveRef = useRef(false);
  const touchEndTimeoutRef = useRef(null);

  const handleTouchStart = (itemId) => {
    isTouchActiveRef.current = true;
    if (touchEndTimeoutRef.current) clearTimeout(touchEndTimeoutRef.current);
    setHoveredSection(itemId);
  };

  const handleTouchEnd = () => {
    setHoveredSection(null);
    if (touchEndTimeoutRef.current) clearTimeout(touchEndTimeoutRef.current);
    // 延遲重設以阻擋觸控後瀏覽器模擬的 mouseEnter 事件
    touchEndTimeoutRef.current = setTimeout(() => {
      isTouchActiveRef.current = false;
    }, 500);
  };

  const handleMouseEnter = (itemId) => {
    if (isTouchActiveRef.current) return;
    setHoveredSection(itemId);
  };

  const handleMouseLeave = () => {
    if (isTouchActiveRef.current) return;
    setHoveredSection(null);
  };

  return (
    <aside
      aria-label={t('card.jumpTo', '快速跳轉導航')}
      className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 select-none animate-in fade-in duration-300"
    >
      {/* iOS 18 控制中心風格極簡毛玻璃滑動切換列 */}
      <div className="bg-slate-900/10 dark:bg-black/30 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.12)] rounded-full px-1.5 py-3 flex flex-col items-center gap-3 transition-all">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const isHovered = hoveredSection === item.id;
          const Icon = item.icon;
          const label = t(item.labelKey, item.fallbackLabel);

          return (
            <div key={item.id} className="relative flex items-center">
              {/* iOS 浮出標籤預覽 Tooltip (左側彈出) */}
              {isHovered && (
                <div className="absolute right-full mr-2.5 px-2.5 py-1 bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 text-[11px] font-medium rounded-lg shadow-lg backdrop-blur-md whitespace-nowrap pointer-events-none transition-all animate-in fade-in slide-in-from-right-1 duration-150 flex items-center">
                  <span>{label}</span>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/90 dark:border-l-white/95" />
                </div>
              )}

              {/* 切換按鈕：Active 為實心白圓點 (iOS 18 風格)，Inactive 為半透明 Icon */}
              <button
                type="button"
                data-target={item.targetId}
                onClick={() => scrollToSection(item)}
                onTouchStart={() => handleTouchStart(item.id)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
                title={label}
                aria-label={label}
                className="relative w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer group"
              >
                {isActive ? (
                  <span
                    data-testid="active-indicator"
                    className="w-3.5 h-3.5 rounded-full bg-slate-900 dark:bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] dark:shadow-[0_0_12px_rgba(255,255,255,0.85)] transition-all transform scale-105"
                  />
                ) : (
                  <Icon className="w-4 h-4 text-slate-400 dark:text-white/45 group-hover:text-slate-800 dark:group-hover:text-white group-hover:scale-110 transition-all" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default QuickScrollNav;

import React from 'react';
import { Search, Book, RefreshCw, Settings } from 'lucide-react';
import LogoIcon from '../common/LogoIcon';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { useLibraryContext } from '../../contexts/LibraryContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

const Navigation = ({ isCollapsed = false }) => {
  const { t } = useTranslation();
  const navigation = useNavigationContext();
  const library = useLibraryContext();
  const settings = useSettingsContext();
  const { activeTab } = navigation.state;
  const { setActiveTab } = navigation.actions;
  const { setViewingFolderId } = library.actions;
  const { setSettingsView } = settings.actions;
  const items = [
    { id: 'search', icon: Search, label: t('nav.search') },
    { id: 'library', icon: Book, label: t('nav.library') },
    { id: 'review', icon: RefreshCw, label: t('nav.review') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ];

  const handleNavigate = (id) => {
    setActiveTab(id);
    setViewingFolderId(null);
    if (id === 'settings') setSettingsView('main');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 rounded-t-2xl flex justify-around p-2.5 z-50 shadow-lg md:relative md:m-4 md:w-60 md:h-[calc(100vh-2rem)] md:rounded-3xl md:bg-white/90 md:border md:border-slate-200/80 md:shadow-sm md:flex-col md:justify-start md:gap-2 md:p-5 md:shrink-0 md:border-t-0">
      <div className={`hidden md:flex items-center mb-5 px-1 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
        <button
          type="button"
          onClick={() => handleNavigate('search')}
          className="group block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl p-1 -m-1 transition-opacity hover:opacity-90 cursor-pointer"
          aria-label="Spaced"
        >
          <LogoIcon isCollapsed={isCollapsed} className={isCollapsed ? 'w-8 h-8' : 'h-8 w-auto max-w-[170px]'} />
        </button>
      </div>
      {items.map(item => {
        const isActive = activeTab === item.id || (item.id === 'review' && activeTab === 'review_session');
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`flex flex-col md:flex-row items-center gap-2.5 p-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl transition-all duration-200 cursor-pointer ${
              isActive
                ? 'text-white bg-blue-600 shadow-sm shadow-blue-500/25 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="text-xs md:text-sm">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;

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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50 shadow-lg md:relative md:border-t-0 md:flex-col md:w-64 md:h-screen md:border-r md:justify-start md:gap-4 md:p-6">
      <div className={`hidden md:flex items-center mb-6 px-1 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
        <button
          type="button"
          onClick={() => handleNavigate('search')}
          className="group block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 -m-1 transition-opacity hover:opacity-90 cursor-pointer"
          aria-label="Spaced"
        >
          <LogoIcon isCollapsed={isCollapsed} className={isCollapsed ? 'w-8 h-8' : 'h-8 w-auto max-w-[170px]'} />
        </button>
      </div>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => handleNavigate(item.id)}
          className={`flex flex-col md:flex-row items-center gap-2 p-2 rounded-lg transition ${activeTab === item.id || (item.id === 'review' && activeTab === 'review_session') ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <item.icon className="w-6 h-6" />
          <span className="text-xs md:text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;

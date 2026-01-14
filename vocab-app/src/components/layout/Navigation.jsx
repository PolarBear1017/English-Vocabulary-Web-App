import React from 'react';
import { Search, Book, RefreshCw, Settings } from 'lucide-react';
import LogoIcon from '../common/LogoIcon';

const Navigation = ({ activeTab, setActiveTab, setViewingFolderId, setSettingsView }) => {
  const items = [
    { id: 'search', icon: Search, label: '查詢' },
    { id: 'library', icon: Book, label: '單字庫' },
    { id: 'review', icon: RefreshCw, label: '複習' },
    { id: 'settings', icon: Settings, label: '設定' },
  ];

  const handleNavigate = (id) => {
    setActiveTab(id);
    setViewingFolderId(null);
    if (id === 'settings') setSettingsView('main');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 z-50 shadow-lg md:relative md:border-t-0 md:flex-col md:w-64 md:h-screen md:border-r md:justify-start md:gap-4 md:p-6">
      <div className="hidden md:block text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
        <LogoIcon className="w-8 h-8" />
        Spaced
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

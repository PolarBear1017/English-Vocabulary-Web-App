import { createContext, useContext } from 'react';

const SettingsContext = createContext(null);

const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within SettingsContext.Provider');
  }
  return context;
};

export { SettingsContext, useSettingsContext };

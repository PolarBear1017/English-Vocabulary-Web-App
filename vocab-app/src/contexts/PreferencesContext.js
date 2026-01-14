import { createContext, useContext } from 'react';

const PreferencesContext = createContext(null);

const usePreferencesContext = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferencesContext must be used within PreferencesContext.Provider');
  }
  return context;
};

export { PreferencesContext, usePreferencesContext };

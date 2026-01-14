import { createContext, useContext } from 'react';

const NavigationContext = createContext(null);

const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationContext.Provider');
  }
  return context;
};

export { NavigationContext, useNavigationContext };

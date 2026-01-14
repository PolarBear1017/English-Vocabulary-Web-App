import { createContext, useContext } from 'react';

const SearchContext = createContext(null);

const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within SearchContext.Provider');
  }
  return context;
};

export { SearchContext, useSearchContext };

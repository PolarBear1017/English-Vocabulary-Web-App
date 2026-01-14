import { createContext, useContext } from 'react';

const LibraryContext = createContext(null);

const useLibraryContext = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibraryContext must be used within LibraryContext.Provider');
  }
  return context;
};

export { LibraryContext, useLibraryContext };

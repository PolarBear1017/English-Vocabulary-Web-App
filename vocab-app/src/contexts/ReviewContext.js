import { createContext, useContext } from 'react';

const ReviewContext = createContext(null);

const useReviewContext = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReviewContext must be used within ReviewContext.Provider');
  }
  return context;
};

export { ReviewContext, useReviewContext };

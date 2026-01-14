import { useState } from 'react';

const useNavigation = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [returnFolderId, setReturnFolderId] = useState(null);

  return {
    state: { activeTab, returnFolderId },
    actions: { setActiveTab, setReturnFolderId }
  };
};

export default useNavigation;

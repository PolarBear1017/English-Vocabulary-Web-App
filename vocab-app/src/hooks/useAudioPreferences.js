import { useState } from 'react';

const useAudioPreferences = () => {
  const [preferredAccent, setPreferredAccent] = useState('us');

  return {
    state: { preferredAccent },
    actions: { setPreferredAccent }
  };
};

export default useAudioPreferences;

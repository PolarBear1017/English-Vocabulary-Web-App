import { useCallback, useEffect, useState } from 'react';
import {
  ensureStorageVersion,
  loadGroqKey,
  loadRequestRetention,
  loadDictionaryPriority,
  saveGroqKey,
  saveRequestRetention,
  saveDictionaryPriority
} from '../../services/storageService';
import {
  getSession,
  onAuthStateChange,
  signInAnonymously,
  signInWithGoogle,
  signInWithPassword,
  signUpWithEmail,
  signOut
} from '../../services/authService';

const useSettings = () => {
  const [settingsView, setSettingsView] = useState('main');
  const [groqApiKey, setGroqApiKey] = useState(() => loadGroqKey());
  const [requestRetention, setRequestRetention] = useState(() => loadRequestRetention());
  const [dictionaryPriority, setDictionaryPriority] = useState(() => loadDictionaryPriority());

  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    ensureStorageVersion();
  }, []);

  useEffect(() => {
    saveGroqKey(groqApiKey);
  }, [groqApiKey]);

  useEffect(() => {
    saveRequestRetention(requestRetention);
  }, [requestRetention]);

  useEffect(() => {
    saveDictionaryPriority(dictionaryPriority);
  }, [dictionaryPriority]);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        signInAnonymously().catch(console.error);
      }
    });

    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = useCallback(async () => {
    const { error } = await signInWithGoogle();
    if (error) alert("登入失敗: " + error.message);
  }, []);

  const handleLogout = useCallback(async () => {
    const { error } = await signOut();
    if (error) alert("登出失敗: " + error.message);
  }, []);

  const handleEmailSignUp = useCallback(async () => {
    if (!email || !password) return alert("請輸入 Email 和密碼");
    setAuthLoading(true);
    const { error } = await signUpWithEmail({ email, password });
    setAuthLoading(false);
    if (error) {
      alert('註冊失敗: ' + error.message);
    } else {
      alert('註冊成功！請檢查您的信箱以驗證帳號 (若 Supabase 未關閉驗證信功能)。');
    }
  }, [email, password]);

  const handleEmailSignIn = useCallback(async () => {
    if (!email || !password) return alert("請輸入 Email 和密碼");
    setAuthLoading(true);
    const { error } = await signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      alert('登入失敗: ' + error.message);
    } else {
      setEmail('');
      setPassword('');
    }
  }, [email, password]);

  return {
    state: {
      settingsView,
      groqApiKey,
      requestRetention,
      dictionaryPriority,
      session,
      email,
      password,
      authLoading
    },
    actions: {
      setSettingsView,
      setGroqApiKey,
      setRequestRetention,
      setDictionaryPriority,
      setEmail,
      setPassword,
      handleLogin,
      handleLogout,
      handleEmailSignUp,
      handleEmailSignIn
    }
  };
};

export default useSettings;

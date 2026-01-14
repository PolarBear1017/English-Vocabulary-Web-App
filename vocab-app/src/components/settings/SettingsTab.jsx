import React from 'react';
import { ArrowLeft } from 'lucide-react';
import SettingsMain from './SettingsMain';
import SettingsAccount from './SettingsAccount';
import SettingsApi from './SettingsApi';
import SettingsReview from './SettingsReview';

const SettingsTab = ({ app }) => {
  const { state, actions } = app;
  const {
    settingsView,
    session,
    apiKey,
    groqApiKey,
    email,
    password,
    authLoading,
    requestRetention
  } = state;
  const {
    setSettingsView,
    setApiKey,
    setGroqApiKey,
    setEmail,
    setPassword,
    setRequestRetention,
    handleLogin,
    handleLogout,
    handleEmailSignIn,
    handleEmailSignUp
  } = actions;

  return (
    <div className="max-w-xl mx-auto">
      {settingsView === 'main' ? (
        <SettingsMain
          session={session}
          apiKey={apiKey}
          groqApiKey={groqApiKey}
          onSelectView={setSettingsView}
        />
      ) : (
        <div className="animate-in slide-in-from-right duration-300">
          <button
            onClick={() => setSettingsView('main')}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" /> 返回設定
          </button>

          {settingsView === 'account' && (
            <SettingsAccount
              session={session}
              email={email}
              password={password}
              authLoading={authLoading}
              setEmail={setEmail}
              setPassword={setPassword}
              handleLogin={handleLogin}
              handleLogout={handleLogout}
              handleEmailSignIn={handleEmailSignIn}
              handleEmailSignUp={handleEmailSignUp}
            />
          )}

          {settingsView === 'api' && (
            <SettingsApi
              apiKey={apiKey}
              groqApiKey={groqApiKey}
              setApiKey={setApiKey}
              setGroqApiKey={setGroqApiKey}
            />
          )}

          {settingsView === 'review' && (
            <SettingsReview
              requestRetention={requestRetention}
              setRequestRetention={setRequestRetention}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsTab;

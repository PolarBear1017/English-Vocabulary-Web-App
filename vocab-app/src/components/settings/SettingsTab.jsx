import React from 'react';
import { ArrowLeft } from 'lucide-react';
import SettingsMain from './SettingsMain';
import SettingsAccount from './SettingsAccount';
import SettingsApi from './SettingsApi';
import SettingsReview from './SettingsReview';
import SettingsDictionary from './SettingsDictionary';
import { useSettingsContext } from '../../contexts/SettingsContext';

const SettingsTab = () => {
  const settings = useSettingsContext();
  const {
    settingsView,
    session,
    groqApiKey,
    email,
    password,
    authLoading,
    requestRetention
  } = settings.state;

  return (
    <div className="max-w-xl mx-auto">
      {settingsView === 'main' ? (
        <SettingsMain
          session={session}
          groqApiKey={groqApiKey}
          onSelectView={settings.actions.setSettingsView}
        />
      ) : (
        <div className="animate-in slide-in-from-right duration-300">
          <button
            onClick={() => settings.actions.setSettingsView('main')}
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
              setEmail={settings.actions.setEmail}
              setPassword={settings.actions.setPassword}
              handleLogin={settings.actions.handleLogin}
              handleLogout={settings.actions.handleLogout}
              handleEmailSignIn={settings.actions.handleEmailSignIn}
              handleEmailSignUp={settings.actions.handleEmailSignUp}
            />
          )}

          {settingsView === 'api' && (
            <SettingsApi
              groqApiKey={groqApiKey}
              setGroqApiKey={settings.actions.setGroqApiKey}
            />
          )}

          {settingsView === 'review' && (
            <SettingsReview
              requestRetention={requestRetention}
              setRequestRetention={settings.actions.setRequestRetention}
            />
          )}

          {settingsView === 'dictionary' && (
            <SettingsDictionary />
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsTab;

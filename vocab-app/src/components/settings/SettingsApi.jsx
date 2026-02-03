import React from 'react';
import { Key, Check } from 'lucide-react';

const SettingsApi = ({ groqApiKey, setGroqApiKey }) => (
  <>
    <h1 className="text-2xl font-bold mb-6">API 金鑰設定</h1>
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Key className="w-5 h-5 text-gray-500" /> API 金鑰設定
      </h2>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Groq API Key</label>
          <input
            type="password"
            value={groqApiKey}
            onChange={(e) => setGroqApiKey(e.target.value)}
            placeholder="貼上您的 Groq API Key..."
            className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-mono"
          />
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
            👉 按此免費取得 Groq API Key
          </a>
        </div>

        {groqApiKey && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
            <Check className="w-5 h-5" /> API 金鑰已儲存，AI 功能已啟用！
          </div>
        )}
      </div>
    </div>
  </>
);

export default SettingsApi;

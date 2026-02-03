import React from 'react';
import { ArrowRight, User, Key, Brain } from 'lucide-react';

const SettingsMain = ({ session, groqApiKey, onSelectView }) => (
  <>
    <h1 className="text-2xl font-bold mb-6">設定</h1>
    <div className="space-y-4">
      <button
        onClick={() => onSelectView('account')}
        className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <User className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-800">帳戶管理</div>
            <div className="text-sm text-gray-500">
              {session?.user && !session.user.is_anonymous
                ? session.user.email
                : '尚未登入 / 訪客模式'}
            </div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300" />
      </button>

      <button
        onClick={() => onSelectView('api')}
        className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
            <Key className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-800">API 金鑰設定</div>
            <div className="text-sm text-gray-500">
              {groqApiKey ? '已設定' : '未設定'}
            </div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300" />
      </button>

      <button
        onClick={() => onSelectView('review')}
        className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
            <Brain className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-800">複習設定</div>
            <div className="text-sm text-gray-500">調整記憶保留率</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300" />
      </button>
    </div>

    <div className="mt-8 text-center text-gray-400 text-sm">
      <p>Made by Spaced</p>
    </div>
  </>
);

export default SettingsMain;

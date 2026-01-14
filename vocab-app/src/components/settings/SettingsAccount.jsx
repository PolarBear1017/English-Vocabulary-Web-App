import React from 'react';
import { User, LogOut, LogIn } from 'lucide-react';

const SettingsAccount = ({
  session,
  email,
  password,
  authLoading,
  setEmail,
  setPassword,
  handleLogin,
  handleLogout,
  handleEmailSignIn,
  handleEmailSignUp
}) => (
  <>
    <h1 className="text-2xl font-bold mb-6">帳戶管理</h1>
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-gray-500" /> 帳戶設定
      </h2>
      {session?.user && !session.user.is_anonymous ? (
        <div>
          <div className="flex items-center gap-4 mb-6">
            {session.user.user_metadata?.avatar_url ? (
              <img src={session.user.user_metadata.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full border border-gray-200" />
            ) : (
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                {session.user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <p className="font-bold text-lg text-gray-800">{session.user.email}</p>
              <p className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">● 已登入</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
            <LogOut className="w-4 h-4" /> 登出
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            {session?.user?.is_anonymous ? '目前為訪客身分 (資料僅存於本機)。' : '尚未登入。'}
            <br />登入後可跨裝置同步您的單字庫。
          </p>
          <button onClick={handleLogin} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
            <LogIn className="w-4 h-4" /> 使用 Google 登入
          </button>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">或使用 Email 登入/註冊</p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email 信箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <input
                type="password"
                placeholder="密碼 (至少 6 碼)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <div className="flex gap-3">
                <button onClick={handleEmailSignIn} disabled={authLoading} className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm hover:bg-gray-900 transition disabled:opacity-50">登入</button>
                <button onClick={handleEmailSignUp} disabled={authLoading} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50">註冊</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
);

export default SettingsAccount;

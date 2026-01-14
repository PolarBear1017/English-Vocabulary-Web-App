import React from 'react';
import { Brain } from 'lucide-react';

const SettingsReview = ({ requestRetention, setRequestRetention }) => (
  <>
    <h1 className="text-2xl font-bold mb-6">複習設定</h1>
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-amber-600" /> 複習難度
      </h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-bold text-gray-800">記憶保留率</div>
          <div className="text-sm text-gray-500">數值越高，複習越頻繁</div>
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          value={requestRetention}
          onChange={(e) => setRequestRetention(Number(e.target.value))}
        >
          <option value={0.8}>0.8 (Light)</option>
          <option value={0.9}>0.9 (Standard)</option>
          <option value={0.95}>0.95 (Intense)</option>
        </select>
      </div>
    </div>
  </>
);

export default SettingsReview;

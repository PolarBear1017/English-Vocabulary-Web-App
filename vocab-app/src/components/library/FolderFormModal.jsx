import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const FolderFormModal = ({
  title,
  initialValues,
  onSubmit,
  onClose,
  isSaving
}) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialValues?.name || '');
    setDescription(initialValues?.description || '');
    setError('');
  }, [initialValues]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('資料夾名稱不能為空');
      return;
    }
    onSubmit({
      name: trimmedName,
      description: description.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          disabled={isSaving}
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-blue-700 mb-4">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-gray-600">
            資料夾名稱
            <input
              type="text"
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="請輸入資料夾名稱"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              required
            />
          </label>

          <label className="block text-sm text-gray-600">
            資料夾描述（可留空）
            <textarea
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[96px] focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="可簡單描述這個資料夾的用途"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
            />
          </label>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              disabled={isSaving}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
              disabled={isSaving}
            >
              {isSaving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FolderFormModal;

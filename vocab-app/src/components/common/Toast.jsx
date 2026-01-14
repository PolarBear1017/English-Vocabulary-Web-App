import React from 'react';

const Toast = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="fixed right-4 bottom-24 md:bottom-6 z-[70]">
      <div className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
        toast.type === 'error'
          ? 'bg-red-600'
          : toast.type === 'info'
          ? 'bg-gray-700'
          : 'bg-green-600'
      }`}>
        {toast.message}
      </div>
    </div>
  );
};

export default Toast;

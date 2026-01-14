import React from 'react';
import { Trash2, CheckSquare, FolderInput } from 'lucide-react';

const SelectionActionBar = ({
  count,
  actions = [],
  onSelectAll,
  selectAllLabel = '全選',
  onClear
}) => (
  <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4">
    <div className="mx-auto max-w-4xl bg-white shadow-2xl border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-gray-600">{count} 個已選</span>
      <div className="flex items-center gap-2">
        {onSelectAll && (
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition flex items-center gap-1"
          >
            <CheckSquare className="w-4 h-4" /> {selectAllLabel}
          </button>
        )}
        {onClear && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            取消選取
          </button>
        )}
        {actions.map(action => {
          const baseClass = 'px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1';
          const activeClass = action.variant === 'danger'
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-blue-600 text-white hover:bg-blue-700';
          const disabledClass = 'opacity-50 cursor-not-allowed';
          return (
            <button
              key={action.key}
              onClick={action.onClick}
              className={`${baseClass} ${activeClass} ${action.disabled ? disabledClass : ''}`}
              disabled={action.disabled}
            >
              {action.icon === 'move' ? <FolderInput className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default SelectionActionBar;

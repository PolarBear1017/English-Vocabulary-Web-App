import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Info, GripVertical } from 'lucide-react';
import { useSettingsContext } from '../../contexts/SettingsContext';

const DICTIONARY_NAMES = {
    'Cambridge': 'Cambridge Dictionary',
    'Yahoo': 'Yahoo Dictionary',
    'Google Translate': 'Google Translate',
    'Groq AI': 'Groq AI'
};

const SettingsDictionary = () => {
    const { state, actions } = useSettingsContext();
    const [priority, setPriority] = useState(state.dictionaryPriority || []);
    const [hasChanges, setHasChanges] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    useEffect(() => {
        setPriority(state.dictionaryPriority || []);
    }, [state.dictionaryPriority]);

    const moveUp = (index) => {
        if (index === 0) return;
        const newPriority = [...priority];
        [newPriority[index - 1], newPriority[index]] = [newPriority[index], newPriority[index - 1]];
        setPriority(newPriority);
        setHasChanges(true);
    };

    const moveDown = (index) => {
        if (index === priority.length - 1) return;
        const newPriority = [...priority];
        [newPriority[index + 1], newPriority[index]] = [newPriority[index], newPriority[index + 1]];
        setPriority(newPriority);
        setHasChanges(true);
    };

    const handleDragStart = (e, index) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggedItemIndex === null || draggedItemIndex === index) return;

        const newPriority = [...priority];
        const draggedItem = newPriority[draggedItemIndex];
        newPriority.splice(draggedItemIndex, 1);
        newPriority.splice(index, 0, draggedItem);

        setPriority(newPriority);
        setDraggedItemIndex(index);
        setHasChanges(true);
    };

    const handleDragEnd = () => {
        setDraggedItemIndex(null);
    };

    const handleSave = () => {
        actions.setDictionaryPriority(priority);
        setHasChanges(false);
        alert('設定已儲存');
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">字典優先順序</p>
                    <p>
                        當搜尋單字時，系統會依照此順序自動查詢。
                        <span className="font-bold">您可以拖曳項目</span> 或使用箭頭來調整順序。
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {priority.map((source, index) => (
                    <div
                        key={source}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-0 cursor-move hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-blue-50/30' : ''
                            } ${draggedItemIndex === index ? 'opacity-50 bg-gray-100' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {index + 1}
                            </span>
                            <span className="font-medium text-gray-700">
                                {DICTIONARY_NAMES[source] || source}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => moveUp(index)}
                                disabled={index === 0}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="上移"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => moveDown(index)}
                                disabled={index === priority.length - 1}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="下移"
                            >
                                <ArrowDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
                <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    儲存變更
                </button>
            </div>
        </div>
    );
};

export default SettingsDictionary;

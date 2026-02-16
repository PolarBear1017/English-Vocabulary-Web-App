import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Info, GripVertical, Volume2, RotateCcw } from 'lucide-react';
import { useSettingsContext } from '../../contexts/SettingsContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const AUDIO_SOURCE_NAMES = {
    'us': '美式發音 (US)',
    'uk': '英式發音 (UK)',
    'google': 'Google Translate',
    'yahoo': 'Yahoo Dictionary',
    'general': '一般/其他 (General)'
};

const SortableItem = ({ id, index, source, moveUp, moveDown, totalCount }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-amber-50/30' : ''
                } ${isDragging ? 'opacity-50 bg-gray-100 shadow-lg' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 hover:bg-gray-100 rounded"
                >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {index + 1}
                </span>
                <span className="font-medium text-gray-700">
                    {AUDIO_SOURCE_NAMES[source] || source}
                </span>
            </div>
            <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="上移"
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
                <button
                    onClick={() => moveDown(index)}
                    disabled={index === totalCount - 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="下移"
                >
                    <ArrowDown className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

const SettingsAudio = () => {
    const context = useSettingsContext();
    const state = context?.state || {};
    const actions = context?.actions || {};

    // Safety check: logging to debug blank screen issues if any
    useEffect(() => {
        console.log('SettingsAudio mounted. State:', state);
    }, []);

    const [priority, setPriority] = useState(state.audioSourcePriority || []);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setPriority(state.audioSourcePriority || []);
    }, [state.audioSourcePriority]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor),
        useSensor(MouseSensor)
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setPriority((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
            setHasChanges(true);
        }
    };

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

    const handleSave = () => {
        if (actions.setAudioSourcePriority) {
            actions.setAudioSourcePriority(priority);
            setHasChanges(false);
            alert('設定已儲存');
        } else {
            console.error("setAudioSourcePriority action missing");
        }
    };

    const handleReset = () => {
        const defaultSources = Object.keys(AUDIO_SOURCE_NAMES);
        setPriority(defaultSources);
        setHasChanges(true);
    };

    return (
        <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <Volume2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                    <p className="font-medium mb-1">發音來源優先順序</p>
                    <p>
                        當播放單字時，系統會依照此順序尋找可用的發音來源。
                        <span className="font-bold">您可以按住拖曳把手</span> 或使用箭頭來調整順序。
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={priority}
                        strategy={verticalListSortingStrategy}
                    >
                        {priority.map((source, index) => (
                            <SortableItem
                                key={source}
                                id={source}
                                index={index}
                                source={source}
                                moveUp={moveUp}
                                moveDown={moveDown}
                                totalCount={priority.length}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <div className="flex justify-between pt-2">
                <button
                    onClick={handleReset}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition flex items-center gap-2"
                    title="重置為預設建議順序"
                >
                    <RotateCcw className="w-4 h-4" />
                    重置預設
                </button>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="px-6 py-2 bg-amber-500 text-white rounded-xl font-medium shadow-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    儲存變更
                </button>
            </div>
        </div>
    );
};

export default SettingsAudio;

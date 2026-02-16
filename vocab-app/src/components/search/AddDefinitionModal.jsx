import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

const POS_OPTIONS = [
    { value: 'noun', label: '名詞 (n.)' },
    { value: 'verb', label: '動詞 (v.)' },
    { value: 'adjective', label: '形容詞 (adj.)' },
    { value: 'adverb', label: '副詞 (adv.)' },
    { value: 'preposition', label: '介系詞 (prep.)' },
    { value: 'conjunction', label: '連接詞 (conj.)' },
    { value: 'pronoun', label: '代名詞 (pron.)' },
    { value: 'interjection', label: '感嘆詞 (int.)' },
    { value: 'phrase', label: '片語 (phrase)' },
    { value: 'other', label: '其他 (other)' }
];

const AddDefinitionModal = ({ isOpen, onClose, onConfirm }) => {
    const [definition, setDefinition] = useState('');
    const [translation, setTranslation] = useState('');
    const [pos, setPos] = useState('noun');
    const [example, setExample] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!definition.trim()) {
            setError('請輸入英文解釋');
            return;
        }

        onConfirm({
            definition: definition.trim(),
            translation: translation.trim(),
            pos,
            example: example.trim()
        });

        // Reset form
        setDefinition('');
        setTranslation('');
        setPos('noun');
        setExample('');
        setError('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">新增自訂解釋</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            詞性 (Part of Speech)
                        </label>
                        <select
                            value={pos}
                            onChange={(e) => setPos(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5"
                        >
                            {POS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            英文解釋 (Definition) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={definition}
                            onChange={(e) => {
                                setDefinition(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ex: A fruit that is red or green..."
                            className={`w-full rounded-lg shadow-sm focus:ring-blue-500 py-2.5 ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                }`}
                        />
                        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            中文翻譯 (Translation)
                        </label>
                        <input
                            type="text"
                            value={translation}
                            onChange={(e) => setTranslation(e.target.value)}
                            placeholder="Ex: 蘋果"
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            例句 (Example Sentence)
                        </label>
                        <textarea
                            rows={3}
                            value={example}
                            onChange={(e) => setExample(e.target.value)}
                            placeholder="Ex: I eat an apple every day."
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-medium shadow-sm transition flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            新增
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDefinitionModal;

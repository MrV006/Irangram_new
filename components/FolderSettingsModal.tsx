
import React, { useState, useEffect } from 'react';
import { X, Folder, Plus, Trash2, CheckCircle, Circle, User, Users, Megaphone, Bot, Archive, BellOff, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatFolder } from '../types';

interface FolderSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    folders: ChatFolder[];
    onSaveFolders: (folders: ChatFolder[]) => void;
}

const ICONS = [
    { id: 'folder', icon: Folder },
    { id: 'user', icon: User },
    { id: 'users', icon: Users },
    { id: 'megaphone', icon: Megaphone },
    { id: 'bot', icon: Bot },
    { id: 'archive', icon: Archive },
    { id: 'bell-off', icon: BellOff },
    { id: 'message-square', icon: MessageSquare }
];

const FolderSettingsModal: React.FC<FolderSettingsModalProps> = ({ isOpen, onClose, folders, onSaveFolders }) => {
    const [localFolders, setLocalFolders] = useState<ChatFolder[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFolder, setCurrentFolder] = useState<ChatFolder | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalFolders([...folders]);
            setIsEditing(false);
            setCurrentFolder(null);
        }
    }, [isOpen, folders]);

    const handleCreateFolder = () => {
        setCurrentFolder({
            id: `folder_${Date.now()}`,
            name: '',
            icon: 'folder',
            filters: {
                includeTypes: [],
                excludeArchived: true,
                excludeRead: false,
                excludeMuted: false
            }
        });
        setIsEditing(true);
    };

    const handleEditFolder = (folder: ChatFolder) => {
        setCurrentFolder({ ...folder });
        setIsEditing(true);
    };

    const handleDeleteFolder = (id: string) => {
        if (confirm("آیا از حذف این پوشه مطمئن هستید؟")) {
            const updated = localFolders.filter(f => f.id !== id);
            setLocalFolders(updated);
            onSaveFolders(updated);
        }
    };

    const handleSaveCurrent = () => {
        if (!currentFolder || !currentFolder.name.trim()) return;
        
        let updated;
        const exists = localFolders.find(f => f.id === currentFolder.id);
        
        if (exists) {
            updated = localFolders.map(f => f.id === currentFolder.id ? currentFolder : f);
        } else {
            updated = [...localFolders, currentFolder];
        }
        
        setLocalFolders(updated);
        onSaveFolders(updated);
        setIsEditing(false);
        setCurrentFolder(null);
    };

    const toggleIncludeType = (type: 'user' | 'group' | 'channel' | 'bot') => {
        if (!currentFolder) return;
        const types = currentFolder.filters.includeTypes.includes(type)
            ? currentFolder.filters.includeTypes.filter(t => t !== type)
            : [...currentFolder.filters.includeTypes, type];
        setCurrentFolder({ ...currentFolder, filters: { ...currentFolder.filters, includeTypes: types } });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                            {isEditing ? (currentFolder?.name || 'پوشه جدید') : 'پوشه‌های گفتگو'}
                        </h3>
                        <button onClick={() => { if(isEditing) setIsEditing(false); else onClose(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {!isEditing ? (
                            <>
                                <p className="text-sm text-gray-500 mb-4">
                                    پوشه‌ها را برای سازماندهی چت‌های خود بسازید. (مثلاً: کانال‌ها، گروه‌ها، خوانده‌نشده‌ها)
                                </p>
                                <div className="space-y-2">
                                    {localFolders.map(folder => {
                                        const IconComp = ICONS.find(i => i.id === folder.icon)?.icon || Folder;
                                        return (
                                            <div key={folder.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white dark:bg-black/20 rounded-full text-telegram-primary">
                                                        <IconComp size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-900 dark:text-white">{folder.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {folder.filters.includeTypes.length > 0 ? folder.filters.includeTypes.join(', ') : 'همه'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditFolder(folder)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-white/10 rounded-lg text-xs font-bold">ویرایش</button>
                                                    <button onClick={() => handleDeleteFolder(folder.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-white/10 rounded-lg"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={handleCreateFolder} className="w-full mt-4 py-3 border-2 border-dashed border-telegram-primary/30 text-telegram-primary rounded-xl flex items-center justify-center gap-2 hover:bg-telegram-primary/5 transition-colors font-bold text-sm">
                                    <Plus size={18} /> ایجاد پوشه جدید
                                </button>
                            </>
                        ) : (
                            currentFolder && (
                                <div className="space-y-6">
                                    {/* Name Input */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">نام پوشه</label>
                                        <input 
                                            value={currentFolder.name}
                                            onChange={(e) => setCurrentFolder({...currentFolder, name: e.target.value})}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 focus:border-telegram-primary outline-none text-sm"
                                            placeholder="نام پوشه (مثلاً اخبار)"
                                        />
                                    </div>

                                    {/* Icon Selector */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">آیکون</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                            {ICONS.map(item => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => setCurrentFolder({...currentFolder, icon: item.id})}
                                                    className={`p-3 rounded-xl transition-all ${currentFolder.icon === item.id ? 'bg-telegram-primary text-white shadow-lg scale-105' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
                                                >
                                                    <item.icon size={20} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Filters - Included Chats */}
                                    <div>
                                        <label className="text-xs font-bold text-telegram-primary mb-2 block">شامل گفتگوهای:</label>
                                        <div className="space-y-1">
                                            {[
                                                { id: 'user', label: 'مخاطبین (Contact)', icon: User },
                                                { id: 'group', label: 'گروه‌ها', icon: Users },
                                                { id: 'channel', label: 'کانال‌ها', icon: Megaphone },
                                                { id: 'bot', label: 'بات‌ها', icon: Bot },
                                            ].map(type => (
                                                <div 
                                                    key={type.id} 
                                                    onClick={() => toggleIncludeType(type.id as any)}
                                                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                                                >
                                                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                                                        <type.icon size={18} className="opacity-70" />
                                                        {type.label}
                                                    </div>
                                                    {currentFolder.filters.includeTypes.includes(type.id as any) 
                                                        ? <CheckCircle size={20} className="text-telegram-primary" />
                                                        : <Circle size={20} className="text-gray-300" />
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Filters - Excluded */}
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <label className="text-xs font-bold text-red-500 mb-2 block">استثناها (حذف):</label>
                                        <div className="space-y-1">
                                            <div onClick={() => setCurrentFolder({...currentFolder, filters: {...currentFolder.filters, excludeRead: !currentFolder.filters.excludeRead}})} className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                                                <span className="text-sm">خوانده شده‌ها (فقط خوانده نشده)</span>
                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${currentFolder.filters.excludeRead ? 'bg-red-500' : 'bg-gray-300'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentFolder.filters.excludeRead ? 'left-1' : 'left-6'}`}></div>
                                                </div>
                                            </div>
                                            <div onClick={() => setCurrentFolder({...currentFolder, filters: {...currentFolder.filters, excludeArchived: !currentFolder.filters.excludeArchived}})} className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                                                <span className="text-sm">آرشیو شده‌ها</span>
                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${currentFolder.filters.excludeArchived ? 'bg-red-500' : 'bg-gray-300'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentFolder.filters.excludeArchived ? 'left-1' : 'left-6'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleSaveCurrent}
                                        disabled={!currentFolder.name.trim()}
                                        className="w-full py-3 bg-telegram-primary disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-telegram-primary/30"
                                    >
                                        ذخیره پوشه
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FolderSettingsModal;

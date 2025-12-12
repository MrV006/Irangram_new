
import React, { useState } from 'react';
import { X, Send, Search, Bookmark } from 'lucide-react';
import { Contact } from '../types';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onForward: (targetId: string) => void;
}

const ForwardModal: React.FC<ForwardModalProps> = ({ isOpen, onClose, contacts, onForward }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredContacts = contacts.filter(c => 
    c.id !== 'global_chat' && 
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[80vh] border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white">فوروارد پیام به...</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-3">
            <div className="relative">
                <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="جستجو..."
                    className="w-full bg-gray-100 dark:bg-black/20 rounded-xl py-2 px-4 pr-10 outline-none text-sm dark:text-white"
                />
                <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
            <div 
                onClick={() => onForward('saved')}
                className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
            >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                    <Bookmark size={24} />
                </div>
                <div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">پیام‌های ذخیره شده</div>
                </div>
            </div>

            {filteredContacts.filter(c => c.id !== 'saved').map(contact => (
                <div 
                    key={contact.id} 
                    onClick={() => onForward(contact.id)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                >
                    <img src={contact.avatar} className="w-12 h-12 rounded-full bg-gray-200 object-cover shrink-0" />
                    <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white text-sm truncate">{contact.name}</div>
                        <div className="text-xs text-gray-500 truncate">{contact.type === 'user' ? 'شخصی' : (contact.type === 'channel' ? 'کانال' : 'گروه')}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;

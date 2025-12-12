
import React, { useRef, useState, useMemo } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { Message, UserRole } from '../types';
import { Check, CheckCheck, Play, Pause, FileText, Download, CornerUpRight, Reply, Share, Copy, Trash2, Pin, BarChart2, Shield, Crown, Code } from 'lucide-react';
import { castPollVote } from '../services/firebaseService'; // Import the voting service

interface MessageBubbleProps {
    message: Message;
    isMe: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    isMiddleInGroup: boolean;
    showAvatar: boolean;
    showSenderName: boolean;
    onReply: (message: Message) => void;
    onContextMenu: (e: React.MouseEvent, message: Message, isMe: boolean) => void;
    onMediaClick: (url: string, id: string) => void;
    onPlayAudio: (id: string, url: string) => void;
    isPlayingAudio: boolean;
    audioProgress: number; // 0 to 100
    repliedMessage?: Message | null;
}

const Waveform: React.FC<{ progress: number; isPlaying: boolean; id: string }> = ({ progress, isPlaying, id }) => {
    // Generate deterministic fake waveform bars based on message ID
    const bars = useMemo(() => {
        const seed = id.charCodeAt(id.length - 1) + id.charCodeAt(0);
        return Array.from({ length: 30 }).map((_, i) => {
            const h = Math.max(20, Math.abs(Math.sin(i * seed) * 100)); // Random height between 20% and 100%
            return h;
        });
    }, [id]);

    return (
        <div className="flex items-center gap-0.5 h-6 w-full opacity-80">
            {bars.map((height, i) => {
                const barProgress = (i / bars.length) * 100;
                const isPlayed = barProgress < progress;
                return (
                    <div 
                        key={i} 
                        className={`w-1 rounded-full transition-colors duration-200 ${isPlayed ? 'bg-telegram-primaryDark dark:bg-blue-400' : 'bg-gray-400 dark:bg-gray-600'}`}
                        style={{ height: `${height}%` }}
                    />
                );
            })}
        </div>
    );
};

const PollBubble: React.FC<{ message: Message; isMe: boolean }> = ({ message, isMe }) => {
    const poll = message.poll;
    if (!poll) return null;

    const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.voterIds?.length || 0), 0);
    
    // Actually, let's extract currentUserId from localStorage if possible or just rely on the vote action.
    const storedAccounts = localStorage.getItem('irangram_accounts');
    
    return (
        <div className="min-w-[250px]">
            <div className="font-bold text-sm mb-3 flex items-center gap-2 opacity-90">
                <BarChart2 size={16} />
                {poll.question}
            </div>
            <div className="space-y-2">
                {poll.options.map(opt => {
                    const votes = opt.voterIds?.length || 0;
                    const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                    
                    return (
                        <div 
                            key={opt.id} 
                            className="relative rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => {
                                const event = new CustomEvent('poll-vote', { detail: { messageId: message.id, optionId: opt.id } });
                                window.dispatchEvent(event);
                            }}
                        >
                            <div className={`absolute inset-0 bg-black/5 dark:bg-white/10 transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                            <div className="relative p-2 flex justify-between items-center z-10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <span className="text-sm font-medium">{opt.text}</span>
                                <span className="text-xs font-bold opacity-70">{percent}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 text-[10px] opacity-60 font-mono text-right">
                {totalVotes} رای • {poll.allowMultiple ? 'چند انتخابی' : 'تک انتخابی'}
            </div>
        </div>
    );
};

const getRoleStyles = (role?: UserRole) => {
    switch (role) {
        case 'owner':
            return {
                bg: 'bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30',
                border: 'border-yellow-400/50 dark:border-yellow-600/50',
                badge: { icon: Crown, text: 'مالک', color: 'text-yellow-600 dark:text-yellow-400' }
            };
        case 'developer':
            return {
                bg: 'bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30',
                border: 'border-indigo-400/50 dark:border-indigo-600/50',
                badge: { icon: Code, text: 'برنامه‌نویس', color: 'text-indigo-600 dark:text-indigo-400' }
            };
        case 'admin':
            return {
                bg: 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30',
                border: 'border-red-400/50 dark:border-red-600/50',
                badge: { icon: Shield, text: 'ادمین', color: 'text-red-600 dark:text-red-400' }
            };
        default:
            return null;
    }
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
    message, isMe, isFirstInGroup, isLastInGroup, isMiddleInGroup, showAvatar, showSenderName,
    onReply, onContextMenu, onMediaClick, onPlayAudio, isPlayingAudio, audioProgress, repliedMessage
}) => {
    const controls = useAnimation();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        if (info.offset.x < -50) { // Swipe left threshold
            onReply(message);
        }
        await controls.start({ x: 0 });
    };

    // --- Styles Calculation ---
    
    let borderRadiusClass = 'rounded-2xl';
    
    if (isMe) {
        // Me (Left)
        if (isFirstInGroup && isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-bl-sm';
        else if (isFirstInGroup) borderRadiusClass = 'rounded-2xl rounded-bl-xl';
        else if (isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-tl-xl rounded-bl-sm';
        else borderRadiusClass = 'rounded-2xl rounded-tl-xl rounded-bl-xl';
    } else {
        // Others (Right)
        if (isFirstInGroup && isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-br-sm';
        else if (isFirstInGroup) borderRadiusClass = 'rounded-2xl rounded-br-xl';
        else if (isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-tr-xl rounded-br-sm';
        else borderRadiusClass = 'rounded-2xl rounded-tr-xl rounded-br-xl';
    }

    // Role-based Styling
    const roleStyles = getRoleStyles(message.senderRole);

    // Stickers and Video Notes have no background bubble
    const isTransparent = message.type === 'sticker' || message.type === 'video_note';
    
    let bubbleBg = '';
    if (!isTransparent) {
        if (roleStyles) {
            bubbleBg = `${roleStyles.bg} ${roleStyles.border}`;
        } else {
            bubbleBg = isMe 
                ? 'bg-telegram-chatOut dark:bg-telegram-chatOutDark border-telegram-chatOut dark:border-telegram-chatOutDark' 
                : 'bg-white dark:bg-telegram-chatInDark border-white dark:border-telegram-chatInDark';
        }
    }

    const shadowClass = isTransparent ? '' : 'shadow-sm border';
    const paddingClass = isTransparent ? 'p-0' : 'px-3 py-2';

    return (
        <div 
            id={`msg-${message.id}`} 
            className={`flex w-full mb-0.5 relative group/msg ${isMe ? 'justify-end' : 'justify-start'}`}
        >
             {/* Reply Icon Indicator */}
             <div className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm z-0 transition-opacity ${isMe ? 'right-4' : 'left-4'}`}>
                 <Reply size={16} className="text-gray-500 dark:text-gray-300" />
             </div>

             <motion.div
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                animate={controls}
                className={`relative z-10 flex max-w-[85%] sm:max-w-[75%] flex-row items-end gap-2`}
                onContextMenu={(e) => onContextMenu(e, message, isMe)}
             >
                {/* Avatar Area - Only for Others (Right Side) */}
                {!isMe && (
                    <div className="w-8 shrink-0 flex flex-col justify-end">
                        {showAvatar ? (
                            <img src={message.senderAvatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                        ) : (
                            <div className="w-8" />
                        )}
                    </div>
                )}

                {/* Message Bubble */}
                <div className={`
                    ${paddingClass} ${shadowClass} text-base break-words min-w-[4rem] relative transition-all overflow-hidden
                    ${!isTransparent && borderRadiusClass} ${bubbleBg}
                `}>
                    {/* Sender Name & Role Badge */}
                    {(!isTransparent) && (showSenderName || roleStyles) && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {(showSenderName || (isMe && roleStyles)) && (
                                <div className={`text-xs font-bold ${roleStyles ? roleStyles.badge.color : 'text-telegram-primary'} cursor-pointer hover:underline`}>
                                    {isMe ? 'شما' : message.senderName}
                                </div>
                            )}
                            {roleStyles && (
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/50 dark:bg-black/20 ${roleStyles.badge.color} border border-current/20`}>
                                    <roleStyles.badge.icon size={10} />
                                    <span>{roleStyles.badge.text}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reply Context */}
                    {message.replyToId && (
                        <div className={`mb-1 pl-2 border-l-2 border-telegram-primary/50 text-xs cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-r p-1 transition-colors relative ${isTransparent ? 'bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-lg mb-2' : ''}`}>
                             <div className="absolute inset-0 bg-telegram-primary/5 opacity-0 hover:opacity-100 transition-opacity"></div>
                             <span className="text-telegram-primary font-bold block">{repliedMessage?.senderName || 'پیام'}</span>
                             <span className="opacity-70 truncate block">{repliedMessage?.text || (repliedMessage?.type === 'video_note' ? 'پیام ویدیویی' : 'رسانه')}</span>
                        </div>
                    )}

                    {/* Forward Context */}
                    {message.forwardedFrom && !isTransparent && (
                        <div className="mb-1 text-xs text-telegram-primary font-bold flex items-center gap-1">
                            <CornerUpRight size={10} />
                            فوروارد شده از {message.forwardedFrom.name}
                        </div>
                    )}

                    {/* --- CONTENT TYPES --- */}

                    {/* Poll */}
                    {message.type === 'poll' && (
                        <PollBubble message={message} isMe={isMe} />
                    )}

                    {/* Sticker */}
                    {message.type === 'sticker' && (
                        <div className="relative cursor-pointer transition-transform active:scale-95">
                            <img src={message.imageUrl} className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-sm" loading="lazy" />
                            <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-[9px] text-white flex items-center gap-1`}>
                                <span>{new Date(message.timestamp).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}</span>
                                {isMe && (message.status === 'read' ? <CheckCheck size={10} /> : <Check size={10} />)}
                            </div>
                        </div>
                    )}

                    {/* Video Note (Circular) */}
                    {message.type === 'video_note' && (
                        <div className="relative group cursor-pointer">
                            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-md relative">
                                <video 
                                    src={message.fileUrl} 
                                    className="w-full h-full object-cover" 
                                    controls={false}
                                    autoPlay={false} // Autoplay policy might block unmuted
                                    loop
                                    playsInline
                                    onClick={(e) => {
                                        const v = e.currentTarget;
                                        if(v.paused) v.play(); else v.pause();
                                    }}
                                />
                            </div>
                            <div className={`absolute bottom-2 right-1/2 translate-x-1/2 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-[9px] text-white flex items-center gap-1`}>
                                <span>{new Date(message.timestamp).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}</span>
                                {isMe && (message.status === 'read' ? <CheckCheck size={10} /> : <Check size={10} />)}
                            </div>
                        </div>
                    )}

                    {/* Image Content */}
                    {message.type === 'image' && (
                        <div className="mb-1 rounded-lg overflow-hidden relative cursor-pointer active:scale-95 transition-transform" onClick={() => onMediaClick(message.imageUrl || '', message.id)}>
                            <img src={message.imageUrl} className="w-full max-h-80 object-cover" loading="lazy" />
                        </div>
                    )}

                    {/* Audio Content (Waveform) */}
                    {message.type === 'audio' && (
                        <div className="flex items-center gap-2 min-w-[240px] py-1 pr-1">
                            <button 
                                className={`p-2.5 rounded-full transition-colors flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20 hover:bg-white/30 text-telegram-primaryDark dark:text-white' : 'bg-telegram-primary/10 hover:bg-telegram-primary/20 text-telegram-primary'}`} 
                                onClick={() => onPlayAudio(message.id, message.fileUrl || '')}
                            >
                                {isPlayingAudio ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                            </button>
                            <div className="flex-1 flex flex-col justify-center gap-1">
                                {/* Waveform Visualization */}
                                <Waveform progress={audioProgress} isPlaying={isPlayingAudio} id={message.id} />
                                <div className="flex justify-between text-[10px] opacity-70 font-mono mt-1">
                                     <span>{isPlayingAudio ? 'Playing...' : message.audioDuration || '0:00'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Content */}
                    {message.type === 'file' && (
                        <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2 rounded-lg mb-1 group/file cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                            <div className="p-2.5 bg-telegram-primary text-white rounded-full"><FileText size={20} /></div>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-bold truncate">{message.fileName}</div>
                                <div className="text-xs opacity-60">{message.fileSize}</div>
                            </div>
                            <a href={message.fileUrl} download target="_blank" className="p-2 text-telegram-primary hover:bg-black/5 rounded-full"><Download size={18} /></a>
                        </div>
                    )}

                    {/* Text Content */}
                    {!message.isSticker && message.type === 'text' && (
                        <p className="dir-auto leading-relaxed text-[15px] whitespace-pre-wrap text-start" dir="auto">{message.text}</p>
                    )}

                    {/* Metadata & Status (Normal) */}
                    {!isTransparent && (
                        <div className={`flex items-center justify-end gap-1 mt-0.5 select-none ${message.type === 'text' ? 'float-right ml-2' : ''}`}>
                             {message.edited && <span className="text-[9px] opacity-60">edited</span>}
                             <span className={`text-[10px] ${isMe ? 'text-blue-100/80 dark:text-white/60' : 'text-gray-400'} ${roleStyles ? 'text-current opacity-70' : ''}`}>
                                 {new Date(message.timestamp).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}
                             </span>
                             {isMe && (
                                 <span className={isMe ? (roleStyles ? 'text-current' : 'text-white') : 'text-telegram-primary'}>
                                     {message.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />}
                                 </span>
                             )}
                        </div>
                    )}
                </div>
             </motion.div>
        </div>
    );
};

export default MessageBubble;

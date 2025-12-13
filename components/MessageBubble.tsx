
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { Message, UserRole } from '../types';
import { Check, CheckCheck, Play, Pause, FileText, Download, CornerUpRight, Reply, Share, Copy, Trash2, Pin, BarChart2, Shield, Crown, Code, X, Circle, CheckCircle, Zap } from 'lucide-react';
import { castPollVote } from '../services/firebaseService';
import VideoPlayer from './VideoPlayer';
// @ts-ignore
import Lottie from 'lottie-react';

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
    onSeekAudio?: (id: string, percentage: number) => void;
    isPlayingAudio: boolean;
    audioProgress: number; 
    repliedMessage?: Message | null;
    // New Props for Selection & Jump
    isSelectionMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onJumpToMessage: (id: string) => void;
}

const Waveform: React.FC<{ progress: number; isPlaying: boolean; id: string; isMe: boolean; onSeek?: (percent: number) => void }> = ({ progress, isPlaying, id, isMe, onSeek }) => {
    const waveformRef = useRef<HTMLDivElement>(null);

    const bars = useMemo(() => {
        const seed = id.charCodeAt(id.length - 1) + id.charCodeAt(0);
        return Array.from({ length: 35 }).map((_, i) => {
            const h = Math.max(25, Math.abs(Math.sin(i * seed * 0.5) * 100));
            return h;
        });
    }, [id]);

    const handleClick = (e: React.MouseEvent) => {
        if (!waveformRef.current || !onSeek) return;
        e.stopPropagation();
        const rect = waveformRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
        onSeek(percent);
    };

    return (
        <div 
            ref={waveformRef}
            className="flex items-center gap-[2px] h-8 w-full opacity-90 cursor-pointer group"
            onClick={handleClick}
        >
            {bars.map((height, i) => {
                const barProgress = (i / bars.length) * 100;
                const isPlayed = barProgress < progress;
                return (
                    <div 
                        key={i} 
                        className={`w-1 rounded-full transition-all duration-200 group-hover:scale-y-110 ${isPlayed ? (isMe ? 'bg-green-700 dark:bg-white' : 'bg-telegram-primary') : (isMe ? 'bg-green-300 dark:bg-white/30' : 'bg-gray-300 dark:bg-white/20')}`}
                        style={{ height: `${height}%` }}
                    />
                );
            })}
        </div>
    );
};

// --- Role Styles Helper ---
const getRoleStyles = (role?: UserRole) => {
    switch (role) {
        case 'owner':
            return {
                badge: 'bg-gradient-to-r from-amber-400 to-orange-600 text-white shadow-md shadow-orange-500/30 border border-amber-300/20',
                name: 'text-amber-600 dark:text-amber-400',
                label: 'مدیر کل',
                icon: <Crown size={11} fill="currentColor" />
            };
        case 'developer':
            return {
                badge: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-blue-500/30 border border-cyan-300/20',
                name: 'text-cyan-600 dark:text-cyan-400',
                label: 'برنامه‌نویس',
                icon: <Code size={11} />
            };
        case 'admin':
            return {
                badge: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30 border border-rose-300/20',
                name: 'text-rose-600 dark:text-rose-400',
                label: 'ادمین',
                icon: <Shield size={11} />
            };
        default:
            return {
                badge: '',
                name: 'text-telegram-primary',
                label: '',
                icon: null
            };
    }
};

const RoleBadge: React.FC<{ role?: UserRole }> = ({ role }) => {
    if (!role || role === 'user' || role === 'guest') return null;

    const styles = getRoleStyles(role);

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 select-none ${styles.badge}`}>
            {styles.icon} {styles.label}
        </span>
    );
};

const PollBubble: React.FC<{ message: Message; isMe: boolean }> = ({ message, isMe }) => {
    const poll = message.poll;
    if (!poll) return null;

    const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.voterIds?.length || 0), 0);
    
    return (
        <div className="min-w-[280px] w-full">
            <div className="font-bold text-sm mb-4 flex items-start gap-2 opacity-90 px-1">
                <BarChart2 size={18} className="mt-0.5 shrink-0 text-telegram-primary" />
                <span className="leading-tight">{poll.question}</span>
            </div>
            <div className="space-y-2">
                {poll.options.map(opt => {
                    const votes = opt.voterIds?.length || 0;
                    const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                    const isSelected = opt.voterIds?.some(id => id === 'me'); // Simplified check, logic handled in parent
                    
                    return (
                        <div 
                            key={opt.id} 
                            className="relative rounded-xl overflow-hidden cursor-pointer group isolate border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5"
                            onClick={() => {
                                const event = new CustomEvent('poll-vote', { detail: { messageId: message.id, optionId: opt.id } });
                                window.dispatchEvent(event);
                            }}
                        >
                            {/* Progress Bar Background */}
                            <div 
                                className={`absolute inset-y-0 right-0 transition-all duration-700 ease-out z-0 ${isMe ? 'bg-green-200/50 dark:bg-green-500/20' : 'bg-blue-200/50 dark:bg-blue-500/20'}`} 
                                style={{ width: `${percent}%` }}
                            ></div>
                            
                            {/* Content */}
                            <div className="relative p-3 flex justify-between items-center z-10 w-full">
                                <span className="text-sm font-medium z-10 truncate ml-2">{opt.text}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-bold opacity-70">{percent}%</span>
                                    {/* Optional: Add checkmark if voted */}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 pt-2 border-t border-black/10 dark:border-white/10 flex justify-between items-center text-[11px] opacity-60 font-medium px-1">
                <span>{totalVotes.toLocaleString('fa-IR')} رای</span>
                <span>{poll.allowMultiple ? 'چند انتخابی' : 'تک انتخابی'}</span>
            </div>
        </div>
    );
};

const StickerPlayer: React.FC<{ url: string }> = ({ url }) => {
    const [animationData, setAnimationData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (isMounted) setAnimationData(data);
            })
            .catch(err => {
                console.error("Failed to load sticker:", err);
                if (isMounted) setError(true);
            });
        
        return () => { isMounted = false; };
    }, [url]);

    if (error) return <div className="w-32 h-32 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-xs text-red-500">خطا</div>;
    if (!animationData) return <div className="w-32 h-32 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />;

    return <Lottie animationData={animationData} loop={true} className="w-40 h-40" />;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
    message, isMe, isFirstInGroup, isLastInGroup, isMiddleInGroup, showAvatar, showSenderName,
    onReply, onContextMenu, onMediaClick, onPlayAudio, onSeekAudio, isPlayingAudio, audioProgress, repliedMessage,
    isSelectionMode, isSelected, onToggleSelect, onJumpToMessage
}) => {
    const controls = useAnimation();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        if (isSelectionMode) return;
        if (info.offset.x < -50) {
            onReply(message);
        }
        await controls.start({ x: 0 });
    };

    const handleBubbleClick = (e: React.MouseEvent) => {
        if (isSelectionMode) {
            e.stopPropagation();
            e.preventDefault();
            onToggleSelect(message.id);
        }
    };

    // --- Correct RTL Logic ---
    let borderRadiusClass = '';
    
    if (isMe) {
        if (isFirstInGroup && isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-tr-md rounded-br-md'; 
        else if (isFirstInGroup) borderRadiusClass = 'rounded-2xl rounded-tr-2xl rounded-br-sm'; 
        else if (isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-tr-sm rounded-br-2xl'; 
        else borderRadiusClass = 'rounded-2xl rounded-tr-sm rounded-br-sm'; 
    } else {
        if (isFirstInGroup && isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-tl-md rounded-bl-md';
        else if (isFirstInGroup) borderRadiusClass = 'rounded-2xl rounded-tl-2xl rounded-bl-sm';
        else if (isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-tl-sm rounded-bl-2xl';
        else borderRadiusClass = 'rounded-2xl rounded-tl-sm rounded-bl-sm';
    }

    const isTransparent = message.type === 'sticker' || message.type === 'video_note';
    
    let bubbleBg = '';
    if (!isTransparent) {
        bubbleBg = isMe 
            ? 'bg-telegram-chatOut dark:bg-telegram-chatOutDark shadow-sm' 
            : 'bg-white dark:bg-telegram-chatInDark shadow-sm';
    }

    const paddingClass = isTransparent ? 'p-0' : 'px-3 py-2';
    const timeString = new Date(message.timestamp).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'});

    const alignmentClass = isMe ? 'justify-start' : 'justify-end';

    const styles = getRoleStyles(message.senderRole);

    return (
        <div 
            id={`msg-${message.id}`} 
            onClick={handleBubbleClick}
            className={`flex w-full mb-1 relative group/msg transition-colors ${isSelectionMode ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 py-1 -my-1' : ''} ${alignmentClass}`}
        >
             {isSelected && <div className="absolute inset-0 bg-telegram-primary/10 dark:bg-telegram-primary/20 z-0 rounded"></div>}

             {isSelectionMode && (
                 <div className="flex items-center justify-center pl-2 pr-2 z-20 shrink-0 cursor-pointer" onClick={() => onToggleSelect(message.id)}>
                     {isSelected ? (
                         <div className="w-5 h-5 rounded-full bg-telegram-primary text-white flex items-center justify-center animate-pop">
                             <Check size={14} strokeWidth={3} />
                         </div>
                     ) : (
                         <div className="w-5 h-5 rounded-full border-2 border-gray-400 dark:border-gray-500"></div>
                     )}
                 </div>
             )}

             <motion.div
                drag={isSelectionMode ? false : "x"}
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                animate={controls}
                className={`relative z-10 flex max-w-[85%] sm:max-w-[75%] flex-row items-end gap-2 animate-pop ${isSelected ? 'translate-x-0' : ''}`}
                onContextMenu={(e) => { if (!isSelectionMode) onContextMenu(e, message, isMe); }}
             >
                {!isMe && !isSelectionMode && (
                    <div className="w-8 shrink-0 flex flex-col justify-end pb-1 order-last">
                        {showAvatar ? (
                            <img src={message.senderAvatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover cursor-pointer hover:opacity-90" />
                        ) : (
                            <div className="w-8" />
                        )}
                    </div>
                )}

                <div className={`
                    ${paddingClass} text-[15px] leading-relaxed break-words min-w-[4.5rem] relative transition-all overflow-hidden
                    ${!isTransparent && borderRadiusClass} ${bubbleBg}
                `}>
                    {/* Sender Name & Role - UPDATED Layout */}
                    {(!isTransparent) && showSenderName && !isMe && (
                        <div className="flex flex-wrap items-center gap-2 mb-1 cursor-pointer hover:underline max-w-full">
                            <span className={`text-xs font-bold truncate max-w-[160px] ${styles.name}`}>
                                {message.senderName}
                            </span>
                            <RoleBadge role={message.senderRole} />
                        </div>
                    )}

                    {/* Reply Context */}
                    {message.replyToId && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(!isSelectionMode && message.replyToId) onJumpToMessage(message.replyToId);
                            }}
                            className={`mb-1 pl-2 border-r-[3px] ${isMe ? 'border-green-600/50 dark:border-white/50' : 'border-telegram-primary/50'} text-xs cursor-pointer rounded-l py-0.5 relative overflow-hidden hover:bg-black/5 dark:hover:bg-white/5 transition-colors pr-2`}
                        >
                             <span className={`font-bold block truncate ${isMe ? 'text-green-800 dark:text-white' : 'text-telegram-primary'}`}>{repliedMessage?.senderName || 'پیام'}</span>
                             <span className="opacity-70 truncate block max-w-[200px]">{repliedMessage?.text || (repliedMessage?.type === 'video_note' ? 'پیام ویدیویی' : (repliedMessage ? 'رسانه' : 'پیام حذف شده'))}</span>
                        </div>
                    )}

                    {/* Forward Context */}
                    {message.forwardedFrom && !isTransparent && (
                        <div className="mb-1 text-xs text-telegram-primary font-bold flex items-center gap-1">
                            <CornerUpRight size={10} />
                            فوروارد شده از {message.forwardedFrom.name}
                        </div>
                    )}

                    {/* Content */}
                    <div className="relative">
                        {message.type === 'poll' && <PollBubble message={message} isMe={isMe} />}

                        {message.type === 'sticker' && message.fileUrl && (
                            <div className="relative cursor-pointer transition-transform active:scale-95">
                                <StickerPlayer url={message.fileUrl} />
                            </div>
                        )}

                        {message.type === 'video_note' && (
                            <div className="relative group cursor-pointer">
                                <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-md relative bg-black">
                                    <video 
                                        src={message.fileUrl} 
                                        className="w-full h-full object-cover" 
                                        autoPlay={false} loop playsInline
                                        onClick={(e) => { 
                                            if(isSelectionMode) return;
                                            const v = e.currentTarget; if(v.paused) v.play(); else v.pause(); 
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {message.type === 'image' && (
                            <div className="mb-1 rounded-lg overflow-hidden relative cursor-pointer active:scale-95 transition-transform" onClick={() => !isSelectionMode && onMediaClick(message.imageUrl || '', message.id)}>
                                <img src={message.imageUrl} className="w-full max-h-80 object-cover bg-gray-100 dark:bg-white/5" loading="lazy" />
                            </div>
                        )}

                        {/* Video Message */}
                        {message.type === 'file' && message.fileUrl && (message.fileName?.endsWith('.mp4') || message.fileName?.endsWith('.webm')) && (
                             <div className="mb-1 rounded-lg overflow-hidden relative max-w-sm">
                                <VideoPlayer 
                                    src={message.fileUrl} 
                                    className="w-full max-h-80"
                                />
                             </div>
                        )}

                        {message.type === 'audio' && (
                            <div className="flex items-center gap-3 pr-1 py-1 w-full sm:min-w-[280px]">
                                <button 
                                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${isMe ? 'bg-green-600 text-white dark:bg-white dark:text-telegram-chatOutDark' : 'bg-telegram-primary text-white'}`} 
                                    onClick={(e) => { 
                                        if(isSelectionMode) return;
                                        e.stopPropagation(); onPlayAudio(message.id, message.fileUrl || ''); 
                                    }}
                                >
                                    {isPlayingAudio ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                </button>
                                <div className="flex flex-col justify-center flex-1 min-w-0 pr-1">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <div className="font-bold text-xs opacity-80 truncate">{message.fileName || 'Voice Message'}</div>
                                        <div className="text-[10px] opacity-70 font-mono">{message.audioDuration || '0:00'}</div>
                                    </div>
                                    <Waveform 
                                        progress={audioProgress} 
                                        isPlaying={isPlayingAudio} 
                                        id={message.id} 
                                        isMe={isMe} 
                                        onSeek={(percent) => !isSelectionMode && onSeekAudio && onSeekAudio(message.id, percent)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Generic File */}
                        {message.type === 'file' && (!message.fileName?.endsWith('.mp4') && !message.fileName?.endsWith('.webm')) && (
                            <div className="flex items-center gap-3 py-1 cursor-pointer group/file">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-green-600 text-white dark:bg-white dark:text-telegram-chatOutDark' : 'bg-telegram-primary text-white'}`}>
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-bold truncate">{message.fileName}</div>
                                    <div className="text-xs opacity-60 flex gap-1">
                                        <span>{message.fileSize}</span>
                                    </div>
                                </div>
                                <a href={isSelectionMode ? undefined : message.fileUrl} download={!isSelectionMode} target="_blank" className={`p-2 rounded-full opacity-0 group-hover/file:opacity-100 transition-opacity ${isMe ? 'hover:bg-black/10' : 'hover:bg-black/5'}`}>
                                    <Download size={18} />
                                </a>
                            </div>
                        )}

                        {!message.isSticker && message.type === 'text' && (
                            <p className="whitespace-pre-wrap text-right leading-snug break-words font-sans" dir="auto" style={{ wordBreak: 'break-word', textAlign: 'right' }}>
                                {message.text}
                            </p>
                        )}
                        
                        {/* Timestamp & Status */}
                        {!isTransparent && (
                            <div className={`flex items-center justify-end gap-1 select-none text-[10px] mt-1 ${isMe ? 'text-green-900/60 dark:text-white/60' : 'text-gray-500/80 dark:text-gray-400'}`}>
                                {message.edited && <span className="mr-1">ویرایش</span>}
                                <span className="font-sans">{timeString}</span>
                                {isMe && (
                                    <span className={`${message.status === 'read' ? 'text-green-800 dark:text-blue-200' : ''}`}>
                                        {message.status === 'read' ? <CheckCheck size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2} />}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
             </motion.div>
        </div>
    );
};

export default MessageBubble;

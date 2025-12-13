
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ArrowRight, MoreVertical, Phone, Search, Paperclip, Mic, Send, Smile, Check, CheckCheck, X, Reply, Copy, Trash2, Edit2, ChevronDown, Image as ImageIcon, FileText, Play, Pause, Sticker, Shield, Crown, Download, ChevronUp, Signal, Flag, Pin, PinOff, Ban, Eraser, Unlock, Video, Megaphone, Trash, Globe, CornerUpRight, Forward, Loader2, ArrowDown, Camera, BarChart2, CheckCircle2, ChevronRight, ChevronLeft, Bookmark } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Contact, Message, UserRole, PollData } from '../types';
import ImageModal from './ImageModal';
import MessageBubble from './MessageBubble';
import { clearGlobalChat, sendReport, blockUser, checkBlockedStatus, unblockUser, isGroupAdmin, uploadMediaWithProgress, castPollVote, getChatId, sendPrivateMessage, sendGlobalMessage, deleteMessageGlobal, deletePrivateMessage, editMessageGlobal, editPrivateMessage, setChatPin, removeChatPin, toggleMessageReaction, updateUserChatPreference } from '../services/firebaseService';
import ForwardModal from './ForwardModal';
import { CONFIG } from '../config';
import AdBanner from './AdBanner';

interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  myId: string;
  myRole: UserRole;
  pinnedMessages?: { id: string; text: string; sender: string; type: string }[];
  onSendMessage: (content: any, replyToId?: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onPinMessage: (message: Message) => void;
  onUnpinMessage: (messageId?: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onBack: () => void;
  isMobile: boolean;
  onProfileClick: () => void;
  onAvatarClick?: (senderProfile: Partial<Contact>) => void;
  wallpaper: string;
  onCall: (isVideo: boolean) => void;
  onClearHistory?: () => void;
  onDeleteChat?: () => void;
  onBlockUser?: () => void;
  onTyping?: (isTyping: boolean) => void;
  onForwardMessage?: (message: Message) => void;
  initialScrollToMessageId?: string; // New Prop for jumping
}

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "😭", "👍", "👎", "❤️", "🔥", "👀", "✅", "💯", "🌹"];

// Public Lottie JSON URLs
const STICKERS = [
    { id: 'cat', url: 'https://raw.githubusercontent.com/airbnb/lottie-web/master/demo/gatin/data.json' },
    { id: 'react', url: 'https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json' }, // Checkmark
    { id: 'heart', url: 'https://assets2.lottiefiles.com/packages/lf20_w51pcehl.json' }, // Heart
    { id: 'duck', url: 'https://assets9.lottiefiles.com/packages/lf20_5njp3vgg.json' }, // Duck (if valid, else fallback handles)
    { id: 'loading', url: 'https://assets9.lottiefiles.com/packages/lf20_b88nh30c.json' }
];

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  contact, messages, myId, myRole, pinnedMessages = [], onSendMessage, onEditMessage, onDeleteMessage, onPinMessage, onUnpinMessage, onReaction, onBack, isMobile, onProfileClick, onAvatarClick, wallpaper, onCall, onClearHistory, onDeleteChat, onBlockUser, onTyping, onForwardMessage, initialScrollToMessageId
}) => {
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message, isMe: boolean } | null>(null);
  const [showAd, setShowAd] = useState(true);
  
  // Pinned Message State
  const [activePinIndex, setActivePinIndex] = useState(0);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Forward Modal (Batch)
  const [showBatchForwardModal, setShowBatchForwardModal] = useState(false);

  // Emoji/Sticker Panel
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('emoji');

  // Poll Creator
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Gallery
  const [viewingImageId, setViewingImageId] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [amIBlocked, setAmIBlocked] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [canWrite, setCanWrite] = useState(true);
  const [canPin, setCanPin] = useState(false);
  const [myPermissions, setMyPermissions] = useState<any>(null); // For granular permissions
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll Button State
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Slow Mode
  const [slowModeCooldown, setSlowModeCooldown] = useState(0);

  // Media Upload State
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; type: 'image' | 'file'; previewUrl?: string } | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Recording State (Audio & Video)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'audio' | 'video'>('audio'); // Toggle
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null); // For Video Note preview while recording

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [audioProgress, setAudioProgress] = useState(0); // For progress bar animation

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const isGroup = contact.type === 'group';
  const isChannel = contact.type === 'channel';
  const isGlobalChat = contact.id === 'global_chat';
  const draftKey = `draft_${myId}_${contact.id}`;
  const isSystemAdmin = myRole === 'owner' || myRole === 'developer';
  const isGuest = myRole === 'guest';

  // --- Derived State for Gallery ---
  const chatImages = useMemo(() => {
      return messages
          .filter(m => m.type === 'image' && m.imageUrl)
          .map(m => ({ url: m.imageUrl!, id: m.id }))
          .reverse(); // Ensure chronological order if messages are reverse
  }, [messages]);

  // --- Jump to Message ---
  const handleJumpToMessage = (messageId: string) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const bubble = el.querySelector('div[class*="rounded"]');
          if (bubble) {
              bubble.classList.add('bg-blue-200', 'dark:bg-blue-900', 'transition-colors', 'duration-1000');
              setTimeout(() => {
                  bubble.classList.remove('bg-blue-200', 'dark:bg-blue-900', 'transition-colors', 'duration-1000');
              }, 1500);
          }
      } else {
          // If message isn't rendered yet (e.g. deeply paged), we show a warning. 
          // In this architecture, all session messages are loaded in App.tsx, so if it's there it should render unless filtered.
          // If filtered (search), we might need to clear search first.
          if (isSearching) {
              setIsSearching(false);
              setSearchQuery('');
              // Wait for render then try again
              setTimeout(() => handleJumpToMessage(messageId), 100);
          } else {
              alert("پیام در تاریخچه بارگذاری شده موجود نیست.");
          }
      }
  };

  // Initial Jump Effect
  useEffect(() => {
      if (initialScrollToMessageId && messages.length > 0) {
          // Allow DOM to settle
          setTimeout(() => {
              handleJumpToMessage(initialScrollToMessageId);
          }, 300);
      }
  }, [initialScrollToMessageId, messages.length]);

  // Permissions & Blocks
  useEffect(() => {
      const checkPermissions = async () => {
          if (isSystemAdmin) {
              setCanWrite(true);
              setCanPin(true);
              setMyPermissions({ canDeleteMessages: true, canBanUsers: true, canPinMessages: true, canChangeInfo: true, canAddAdmins: true });
              return;
          }

          if (isGuest && isGlobalChat) {
              setCanWrite(false);
              setCanPin(false);
              return;
          }

          if ((isChannel || isGroup) && !isGlobalChat) {
              // Check if user is creator
              const isCreator = contact.creatorId === myId;
              if (isCreator) {
                  setCanWrite(true);
                  setCanPin(true);
                  setMyPermissions({ canDeleteMessages: true, canBanUsers: true, canPinMessages: true, canChangeInfo: true, canAddAdmins: true });
                  return;
              }

              // Check granular permissions
              const perms = contact.adminPermissions?.[myId];
              if (perms) {
                  setMyPermissions(perms);
                  setCanPin(perms.canPinMessages);
                  setCanWrite(true); // Admins can generally write
              } else {
                  // Regular member
                  setMyPermissions(null);
                  setCanPin(false);
                  if (isChannel) {
                      setCanWrite(false);
                  } else {
                      setCanWrite(true);
                  }
              }
          } else {
              // Private Chat or Global
              setCanWrite(true);
              setCanPin(true); 
              setMyPermissions(null);
          }
      };
      checkPermissions();
  }, [contact, myId, myRole, isChannel, isGroup, isSystemAdmin, isGuest, isGlobalChat]);

  // Adjust active pin index when pins change
  useEffect(() => {
      if (pinnedMessages.length === 0) setActivePinIndex(0);
      else if (activePinIndex >= pinnedMessages.length) setActivePinIndex(pinnedMessages.length - 1);
  }, [pinnedMessages.length]);

  useEffect(() => {
     const checkBlock = async () => {
         if (contact.id !== 'global_chat' && contact.id !== 'saved' && contact.type === 'user') {
             const blockedByMe = await checkBlockedStatus(myId, contact.id);
             setIsBlockedByMe(blockedByMe);
             const blockedMe = await checkBlockedStatus(contact.id, myId);
             setAmIBlocked(blockedMe);
         } else {
             setIsBlockedByMe(false);
             setAmIBlocked(false);
         }
     };
     checkBlock();
  }, [contact.id, myId]);

  // Reset Selection on chat change
  useEffect(() => {
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
  }, [contact.id]);

  // Slow Mode Logic
  useEffect(() => {
      if (contact.slowMode && contact.slowMode > 0 && !myPermissions && !isSystemAdmin && contact.creatorId !== myId) {
          // Check last message time
          const myMessages = messages.filter(m => m.senderId === myId);
          if (myMessages.length > 0) {
              const lastMsgTime = myMessages[myMessages.length - 1].timestamp;
              const now = Date.now();
              const diff = (now - lastMsgTime) / 1000;
              if (diff < contact.slowMode) {
                  setSlowModeCooldown(contact.slowMode - Math.floor(diff));
                  const timer = setInterval(() => {
                      setSlowModeCooldown(prev => {
                          if (prev <= 1) {
                              clearInterval(timer);
                              return 0;
                          }
                          return prev - 1;
                      });
                  }, 1000);
                  return () => clearInterval(timer);
              }
          }
      }
      setSlowModeCooldown(0);
  }, [messages, contact.slowMode, myId, myPermissions]);

  // Listen for Poll Votes
  useEffect(() => {
      const handlePollVote = (e: CustomEvent) => {
          const { messageId, optionId } = e.detail;
          const isGlobal = contact.id === 'global_chat';
          // Determine Chat ID
          let chatId = isGlobal ? 'global_chat' : getChatId(myId, contact.id);
          // If group, chat id is contact.id
          if (contact.type === 'group' || contact.type === 'channel') chatId = contact.id;
          
          castPollVote(chatId, messageId, optionId, myId, isGlobal);
      };
      window.addEventListener('poll-vote', handlePollVote as EventListener);
      return () => window.removeEventListener('poll-vote', handlePollVote as EventListener);
  }, [contact.id, myId]);

  // Drafts
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) setInputValue(savedDraft);
  }, [draftKey]);

  useEffect(() => {
    if (editingMessage) return;
    if (inputValue) localStorage.setItem(draftKey, inputValue);
    else localStorage.removeItem(draftKey);
  }, [inputValue, draftKey, editingMessage]);
  
  // Scroll to bottom on new message
  useEffect(() => {
    if (!isSearching && !isSelectionMode && !initialScrollToMessageId) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, replyingTo, isRecording, isSearching]);

  // Audio Player Cleanup
  useEffect(() => {
      return () => {
          if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
              audioPlayerRef.current = null;
          }
      };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      if (onTyping) {
          onTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
              onTyping(false);
          }, 2000);
      }
  };

  const handleSend = () => {
    if (!inputValue.trim() || !canWrite) return;
    if (isBlockedByMe || amIBlocked) return; 
    
    if (editingMessage) { 
        onEditMessage(editingMessage.id, inputValue); 
        setEditingMessage(null); 
    } else { 
        onSendMessage({ text: inputValue, type: 'text' }, replyingTo?.id); 
        setReplyingTo(null); 
    }
    setInputValue('');
    if(onTyping) onTyping(false);
  };

  const handleSendSticker = (url: string) => {
      if(!canWrite) return;
      onSendMessage({
          type: 'sticker',
          fileUrl: url,
          isSticker: true
      }, replyingTo?.id);
      setShowEmojiPicker(false);
      setReplyingTo(null);
  };

  const handleSendPoll = () => {
      if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
          alert("لطفاً سوال و حداقل دو گزینه وارد کنید.");
          return;
      }
      
      const options = pollOptions.filter(o => o.trim()).map((text, index) => ({
          id: `opt_${Date.now()}_${index}`,
          text,
          voterIds: []
      }));

      onSendMessage({
          type: 'poll',
          text: 'نظرسنجی', // Fallback text
          poll: {
              question: pollQuestion,
              options: options,
              allowMultiple: pollAllowMultiple,
              isClosed: false
          }
      });
      setShowPollCreator(false);
      setPollQuestion('');
      setPollOptions(['', '']);
  };

  const processFile = (file?: File, type: 'image' | 'file' = 'image') => {
      if (!file || isBlockedByMe || amIBlocked || !canWrite) return;
      
      let previewUrl;
      if (type === 'image') {
          previewUrl = URL.createObjectURL(file);
      }
      
      setPendingAttachment({ file, type, previewUrl });
      setAttachmentCaption('');
  };

  const handleSendAttachment = async () => {
      if (!pendingAttachment || !canWrite) return;
      
      setUploadProgress(0);
      try {
          const folder = pendingAttachment.type === 'image' ? 'images' : 'files';
          const path = `uploads/${myId}/${folder}/${Date.now()}_${pendingAttachment.file.name}`;
          
          const downloadUrl = await uploadMediaWithProgress(
              pendingAttachment.file, 
              path, 
              (progress) => setUploadProgress(progress)
          );

          const fileSize = (pendingAttachment.file.size / 1024 / 1024).toFixed(2) + ' MB';
          
          // Determine if it is a video
          const isVideo = pendingAttachment.file.type.startsWith('video/');
          const fileType = isVideo ? 'file' : pendingAttachment.type; // Upload as file, messageBubble detects extension

          onSendMessage({
              type: fileType,
              imageUrl: pendingAttachment.type === 'image' ? downloadUrl : undefined,
              fileUrl: downloadUrl,
              fileName: pendingAttachment.file.name,
              fileSize: fileSize,
              text: attachmentCaption || (pendingAttachment.type === 'image' ? 'عکس' : pendingAttachment.file.name)
          }, replyingTo?.id);

      } catch (e) {
          console.error("Upload failed", e);
          alert("خطا در آپلود فایل.");
      } finally {
          setUploadProgress(null);
          setPendingAttachment(null);
          setAttachmentCaption('');
          setReplyingTo(null);
      }
  };

  // --- Selection Logic ---
  const handleToggleSelect = (id: string) => {
      setSelectedMessageIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          
          if (newSet.size === 0) setIsSelectionMode(false);
          return newSet;
      });
  };

  const handleBatchDelete = async () => {
      if (selectedMessageIds.size === 0) return;
      if (!confirm(`آیا از حذف ${selectedMessageIds.size} پیام انتخاب شده مطمئن هستید؟`)) return;

      const ids = Array.from(selectedMessageIds);
      for (const id of ids) {
          const msg = messages.find(m => m.id === id);
          if (msg) {
              if (msg.senderId === myId || myPermissions?.canDeleteMessages || isSystemAdmin || (isGroup && contact.creatorId === myId)) {
                  onDeleteMessage(id);
              }
          }
      }
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
  };

  const handleBatchForward = async (targetId: string) => {
      const msgsToForward = messages.filter(m => selectedMessageIds.has(m.id));
      msgsToForward.sort((a, b) => a.timestamp - b.timestamp);
      setShowBatchForwardModal(true);
  };

  const executeBatchForwardToTarget = async (targetId: string) => {
      alert("قابلیت فوروارد چندگانه به زودی فعال می‌شود (نیاز به هماهنگی با سرور).");
      setShowBatchForwardModal(false);
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
  };

  // --- Recording Logic (Audio & Video) ---
  const toggleRecordingMode = () => {
      setRecordingMode(prev => prev === 'audio' ? 'video' : 'audio');
  };

  const startRecording = async () => {
    try {
      const constraints = recordingMode === 'audio' 
          ? { audio: true } 
          : { audio: true, video: { facingMode: "user", width: 400, height: 400 } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // For video preview
      if (recordingMode === 'video' && videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.muted = true; // Avoid feedback
          videoPreviewRef.current.play();
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      if(onTyping) onTyping(true); 
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert(`دسترسی به ${recordingMode === 'audio' ? 'میکروفون' : 'دوربین'} امکان‌پذیر نیست.`);
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    
    mediaRecorderRef.current.onstop = async () => {
        const mimeType = recordingMode === 'audio' ? 'audio/webm' : 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const fileExt = recordingMode === 'audio' ? 'webm' : 'webm';
        const file = new File([blob], `recording.${fileExt}`, { type: mimeType });
        
        const minutes = Math.floor(recordingDuration / 60);
        const seconds = recordingDuration % 60;
        const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        setUploadProgress(0);
        try {
            const folder = recordingMode === 'audio' ? 'audios' : 'videos';
            const path = `uploads/${myId}/${folder}/${Date.now()}_${recordingMode}.${fileExt}`;
            const downloadUrl = await uploadMediaWithProgress(file, path, (p) => setUploadProgress(p));
            
            onSendMessage({
                type: recordingMode === 'audio' ? 'audio' : 'video_note',
                fileUrl: downloadUrl,
                fileName: recordingMode === 'audio' ? 'Voice Message' : 'Video Note',
                audioDuration: durationStr,
                text: recordingMode === 'audio' ? 'پیام صوتی' : 'پیام ویدیویی'
            }, replyingTo?.id);
        } catch(e) {
            console.error("Recording upload failed", e);
        } finally {
            setUploadProgress(null);
        }
        
        if (mediaRecorderRef.current?.stream) {
             mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
    };

    mediaRecorderRef.current.stop();
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    if(onTyping) onTyping(false);
  };

  const cancelRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      if(onTyping) onTyping(false);
  };

  const formatDuration = (seconds: number) => {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // --- Audio Player Logic ---
  const toggleAudio = (messageId: string, url?: string) => {
      if (!url) return;

      if (playingAudioId === messageId) {
          audioPlayerRef.current?.pause();
          setPlayingAudioId(null);
      } else {
          if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
          }
          const audio = new Audio(url);
          audio.ontimeupdate = () => {
              if (audio.duration) {
                  setAudioProgress((audio.currentTime / audio.duration) * 100);
              }
          };
          audio.onended = () => {
              setPlayingAudioId(null);
              setAudioProgress(0);
          };
          audio.play().catch(e => console.error("Play error", e));
          audioPlayerRef.current = audio;
          setPlayingAudioId(messageId);
      }
  };

  const handleSeekAudio = (messageId: string, percentage: number) => {
      if (playingAudioId === messageId && audioPlayerRef.current) {
          const duration = audioPlayerRef.current.duration;
          if (duration) {
              audioPlayerRef.current.currentTime = (percentage / 100) * duration;
              setAudioProgress(percentage);
          }
      }
  };

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
      if (!chatContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShowScrollButton(!isBottom);
  };

  const getStatusText = () => {
      if (contact.status === 'typing...') return <span className="text-telegram-primary animate-pulse font-bold">در حال نوشتن...</span>;
      if (contact.status === 'online') return <span className="text-telegram-primary">آنلاین</span>;
      if (isChannel) return 'کانال';
      if (isGroup) return 'گروه';
      if (contact.id === 'saved') return 'فضای ابری';
      return contact.lastSeen ? `آخرین بازدید ${new Date(contact.lastSeen).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}` : 'آفلاین';
  };

  // --- Message Filtering & Date Grouping ---
  const filteredMessages = useMemo(() => {
      if (!isSearching || !searchQuery.trim()) return messages;
      return messages.filter(m => 
          m.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
          m.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [messages, isSearching, searchQuery]);

  const renderDateBadge = (timestamp: number) => {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label = date.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
      if (date.toDateString() === today.toDateString()) label = 'امروز';
      else if (date.toDateString() === yesterday.toDateString()) label = 'دیروز';

      return (
          <div className="flex justify-center my-4 sticky top-2 z-20 pointer-events-none">
              <span className="bg-black/40 dark:bg-white/10 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-sm font-bold pointer-events-auto">
                  {label}
              </span>
          </div>
      );
  };

  // Reply via Swipe Handler
  const handleReplySwipe = (msg: Message) => {
      setReplyingTo(msg);
      inputRef.current?.focus();
  };

  const handleCopy = () => {
      if (contextMenu?.message.text) {
          navigator.clipboard.writeText(contextMenu.message.text);
          setContextMenu(null);
      }
  };

  // --- Header Pinned Messages Logic ---
  const activePin = pinnedMessages[activePinIndex];

  return (
    <div 
        className="h-full flex flex-col relative bg-telegram-bg dark:bg-telegram-bgDark overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); if(!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
        onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            if(isBlockedByMe || amIBlocked || !canWrite) return;
            const file = e.dataTransfer.files?.[0];
            processFile(file, file?.type.startsWith('image/') ? 'image' : 'file');
        }}
    >
        {/* Emoji/Sticker Picker Panel */}
        <AnimatePresence>
        {showEmojiPicker && (
            <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="absolute bottom-16 left-2 right-2 sm:right-auto sm:left-4 sm:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border dark:border-gray-700 z-50 overflow-hidden flex flex-col h-80"
                >
                    {/* Picker Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={() => setPickerTab('emoji')} 
                            className={`flex-1 py-2 text-sm font-bold transition-colors ${pickerTab === 'emoji' ? 'text-telegram-primary border-b-2 border-telegram-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            اموجی
                        </button>
                        <button 
                            onClick={() => setPickerTab('sticker')} 
                            className={`flex-1 py-2 text-sm font-bold transition-colors ${pickerTab === 'sticker' ? 'text-telegram-primary border-b-2 border-telegram-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            استیکر
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gray-50 dark:bg-black/20">
                        {pickerTab === 'emoji' ? (
                            <div className="grid grid-cols-6 gap-2">
                                {COMMON_EMOJIS.map(emoji => (
                                    <button 
                                        key={emoji} 
                                        onClick={() => { setInputValue(prev => prev + emoji); }} 
                                        className="text-2xl hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg p-2 transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                                {/* Extended Emojis */}
                                {"🚀✨🎉🎈🎂🎁🎄🎃🎨🎭🎪🎰🎲🎱🎳🎵🎶🎸🎹🎷🎺🎻🎼🎧🎤🎬🎥📷📹📺📻📼📼💾💿📀💻📱☎️📞PagerFax🔋🔌💻🖥️🖨️⌨️🖱️🖲️🖽💾💿📀📼📷📸📹🎥📽️🎞️📞☎️📟".split("").map((e,i) => (
                                     <button 
                                        key={i} 
                                        onClick={() => { setInputValue(prev => prev + e); }} 
                                        className="text-2xl hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg p-2 transition-colors"
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {STICKERS.map((sticker, index) => (
                                    <button 
                                        key={index} 
                                        onClick={() => handleSendSticker(sticker.url)} 
                                        className="aspect-square bg-white dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center p-2 transition-all hover:scale-105"
                                        title="ارسال استیکر"
                                    >
                                        <Sticker size={32} className="text-telegram-primary opacity-80" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </>
        )}
        </AnimatePresence>

        {isDragging && canWrite && (
            <div className="absolute inset-0 z-50 bg-telegram-primary/80 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in">
                <Paperclip size={64} className="mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold">رها کنید تا ارسال شود</h2>
            </div>
        )}

        {/* Attachment Preview Modal */}
        {pendingAttachment && (
            <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
                <div className="flex-1 w-full max-w-2xl flex items-center justify-center relative">
                    {pendingAttachment.type === 'image' ? (
                        <img src={pendingAttachment.previewUrl} className="max-w-full max-h-[70vh] rounded-lg shadow-2xl object-contain" />
                    ) : (
                        <div className="bg-white/10 p-10 rounded-2xl flex flex-col items-center text-white">
                            <FileText size={64} className="mb-4" />
                            <span className="text-xl font-bold">{pendingAttachment.file.name}</span>
                            <span className="text-sm opacity-70 mt-2">{(pendingAttachment.file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    )}
                    <button onClick={() => setPendingAttachment(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Caption Input */}
                <div className="w-full max-w-2xl mt-4 flex gap-2 items-end">
                    <div className="flex-1 bg-white/10 rounded-2xl flex items-center p-2 border border-white/20">
                        <textarea 
                            value={attachmentCaption}
                            onChange={(e) => setAttachmentCaption(e.target.value)}
                            placeholder="افزودن کپشن..."
                            className="w-full bg-transparent text-white placeholder-white/50 border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2 px-2"
                            rows={1}
                        />
                    </div>
                    <button 
                        onClick={handleSendAttachment} 
                        className="p-3 bg-telegram-primary text-white rounded-full shadow-lg hover:bg-telegram-primaryDark transition-all"
                    >
                        <Send size={24} />
                    </button>
                </div>
            </div>
        )}

        {/* Upload Progress Overlay */}
        {uploadProgress !== null && (
            <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-64 text-center">
                    <Loader2 className="animate-spin w-10 h-10 text-telegram-primary mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">در حال ارسال...</h3>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-telegram-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 block font-mono">{Math.round(uploadProgress)}%</span>
                </div>
            </div>
        )}

        {/* Poll Creator Modal */}
        {showPollCreator && (
            <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">ساخت نظرسنجی</h3>
                    <div className="space-y-3">
                        <input 
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="سوال نظرسنجی..."
                            className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-black/20 dark:border-gray-600 outline-none focus:border-telegram-primary"
                        />
                        {pollOptions.map((opt, i) => (
                            <input 
                                key={i}
                                value={opt}
                                onChange={(e) => {
                                    const newOpts = [...pollOptions];
                                    newOpts[i] = e.target.value;
                                    setPollOptions(newOpts);
                                }}
                                placeholder={`گزینه ${i + 1}`}
                                className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-black/20 dark:border-gray-600 outline-none focus:border-telegram-primary"
                            />
                        ))}
                        <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-telegram-primary text-sm font-bold">+ افزودن گزینه</button>
                        <div className="flex items-center gap-2 mt-4 cursor-pointer" onClick={() => setPollAllowMultiple(!pollAllowMultiple)}>
                            <div className={`w-5 h-5 border-2 rounded ${pollAllowMultiple ? 'bg-telegram-primary border-telegram-primary' : 'border-gray-400'} flex items-center justify-center`}>
                                {pollAllowMultiple && <Check size={14} className="text-white" />}
                            </div>
                            <span className="text-sm">انتخاب چندگانه</span>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setShowPollCreator(false)} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl text-sm font-bold">انصراف</button>
                        <button onClick={handleSendPoll} className="flex-1 py-2 bg-telegram-primary text-white rounded-xl text-sm font-bold">ایجاد نظرسنجی</button>
                    </div>
                </div>
            </div>
        )}

        {/* Gallery Modal */}
        {viewingImageId && chatImages.length > 0 && (
            <ImageModal 
                images={chatImages} 
                initialImageId={viewingImageId} 
                onClose={() => setViewingImageId(null)} 
            />
        )}

        {/* Batch Forward Modal Placeholder - In real app, this reuses ForwardModal */}
        {showBatchForwardModal && (
            <ForwardModal 
                isOpen={true} 
                onClose={() => setShowBatchForwardModal(false)}
                contacts={[]} // Should pass contacts from parent or fetch here. Empty for now to satisfy type.
                onForward={executeBatchForwardToTarget} 
            />
        )}
        
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => processFile(e.target.files?.[0], 'image')} />
        <input type="file" ref={genericFileInputRef} className="hidden" onChange={(e) => processFile(e.target.files?.[0], 'file')} />

        <div className="absolute inset-0 z-0" style={{ backgroundColor: wallpaper === 'default' ? '#99bad0' : wallpaper.startsWith('http') || wallpaper.startsWith('data') ? undefined : wallpaper, backgroundImage: wallpaper.startsWith('http') || wallpaper.startsWith('data') ? `url(${wallpaper})` : undefined, backgroundSize: 'cover' }}></div>

        {/* Header */}
        <div className="relative z-50 flex flex-col shrink-0 bg-white/80 dark:bg-telegram-bgDark/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 shadow-sm transition-all duration-300">
            {isSelectionMode ? (
                <div className="flex items-center px-3 py-2 h-16 gap-4 animate-slide-in bg-white dark:bg-telegram-bgDark w-full">
                    <button onClick={() => { setIsSelectionMode(false); setSelectedMessageIds(new Set()); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">
                        <X size={22} />
                    </button>
                    <div className="flex-1 font-bold text-lg">
                        {selectedMessageIds.size} انتخاب شده
                    </div>
                    {/* Action Buttons in Header for Mobile friendliness, or keep in footer */}
                    {!isMobile && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleBatchForward('saved')} className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-gray-300" title="فوروارد">
                                <Forward size={20} />
                            </button>
                            <button onClick={handleBatchDelete} className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-red-500" title="حذف">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    )}
                </div>
            ) : isSearching ? (
                <div className="flex items-center px-3 py-2 h-16 gap-3 animate-fade-in">
                    <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">
                        <ArrowRight size={22} />
                    </button>
                    <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-full flex items-center px-4">
                        <Search size={18} className="text-gray-400" />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 py-2 px-2 text-sm"
                            placeholder="جستجو در این چت..."
                            autoFocus
                        />
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                        {filteredMessages.length} یافت شد
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between px-3 py-2 h-16 animate-fade-in relative">
                     <div className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1" onClick={onProfileClick}>
                        {isMobile && <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-2 -mr-2 text-gray-500"><ArrowRight size={22} /></button>}
                        {contact.id === 'saved' ? (
                            <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white shrink-0">
                                <Bookmark size={20} fill="currentColor" />
                            </div>
                        ) : (
                            <img src={contact.avatar || ''} className="w-10 h-10 rounded-full bg-gray-200 object-cover shrink-0" />
                        )}
                        <div className="flex flex-col overflow-hidden">
                            <h2 className="font-bold text-gray-900 dark:text-white truncate text-base flex items-center gap-1">
                                {contact.name}
                                {contact.isGlobal && <Globe size={12} className="text-blue-500"/>}
                            </h2>
                            <span className="text-xs text-gray-500 truncate">{getStatusText()}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center text-gray-500 gap-1">
                        <button onClick={() => setIsSearching(true)} className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><Search size={20} /></button>
                        {!isGlobalChat && !isChannel && (
                            <>
                                <button onClick={() => onCall(false)} className="p-2.5 rounded-full text-telegram-primary hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><Phone size={20} /></button>
                                <button onClick={() => onCall(true)} className="p-2.5 rounded-full text-telegram-primary hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><Video size={20} /></button>
                            </>
                        )}
                        <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors relative z-50"><MoreVertical size={20} /></button>
                        
                        {/* Dropdown Menu */}
                        {showChatMenu && (
                            <>
                                <div className="fixed inset-0 z-[60]" onClick={() => setShowChatMenu(false)}></div>
                                <div className="absolute top-12 left-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 py-2 z-[70] animate-fade-in flex flex-col">
                                    <button onClick={() => { setIsSelectionMode(true); setShowChatMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"><CheckCircle2 size={18} /> انتخاب پیام‌ها</button>
                                    {!isGlobalChat && contact.id !== 'saved' && (
                                        <>
                                            <button onClick={onClearHistory} className="w-full text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"><Eraser size={18} /> پاک کردن تاریخچه</button>
                                            <button onClick={onDeleteChat} className="w-full text-right px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-3 text-sm"><Trash2 size={18} /> حذف گفتگو</button>
                                            {contact.type === 'user' && <button onClick={onBlockUser} className="w-full text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"><Ban size={18} /> {isBlockedByMe ? 'رفع مسدودی' : 'مسدود کردن'}</button>}
                                        </>
                                    )}
                                    {isGlobalChat && isSystemAdmin && (
                                         <button onClick={onClearHistory} className="w-full text-right px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-3 text-sm"><Trash2 size={18} /> پاکسازی چت جهانی</button>
                                    )}
                                    {(isGroup || isChannel) && canWrite && (
                                        <button onClick={() => { setShowPollCreator(true); setShowChatMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200"><BarChart2 size={18} /> ایجاد نظرسنجی</button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Pinned Messages Header (Multiple Support) */}
            {pinnedMessages.length > 0 && !isSearching && !isSelectionMode && activePin && (
                <div 
                    onClick={() => {
                        handleJumpToMessage(activePin.id);
                        if (pinnedMessages.length > 1) {
                            setActivePinIndex((prev) => (prev + 1) % pinnedMessages.length);
                        }
                    }}
                    className="flex items-center justify-between px-3 py-2 bg-white/95 dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700 backdrop-blur-sm cursor-pointer relative animate-slide-in"
                >
                    <div className="flex items-center gap-2 border-l-2 border-telegram-primary pl-2 overflow-hidden flex-1">
                       <div className="flex flex-col min-w-0">
                           <span className="text-xs font-bold text-telegram-primary flex items-center gap-1">
                               پیام سنجاق شده
                               {pinnedMessages.length > 1 && (
                                   <span className="text-[10px] bg-telegram-primary/10 px-1 rounded-sm text-telegram-primary">
                                       {activePinIndex + 1} از {pinnedMessages.length}
                                   </span>
                               )}
                           </span>
                           <span className="text-xs truncate opacity-80 text-gray-700 dark:text-gray-300">{activePin.text}</span>
                       </div>
                    </div>
                    
                    {canPin && (
                        <button onClick={(e) => { e.stopPropagation(); onUnpinMessage(activePin.id); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ml-1">
                            <X size={14} className="text-gray-500" />
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} onScroll={handleScroll} className="relative z-10 flex-1 overflow-y-auto p-2 sm:p-4 flex flex-col gap-0.5 scroll-smooth">
            
            {/* ADVERTISEMENT SLOT - CHAT TOP */}
            {CONFIG.ADS.ENABLED && CONFIG.ADS.CHAT_TOP_BANNER && showAd && (
                <div className="sticky top-0 z-30 mb-2 px-4 pointer-events-auto">
                    <AdBanner 
                        slotId={CONFIG.ADS.PROVIDERS.CHAT_ID} 
                        format="banner" 
                        className="rounded-xl shadow-md border border-gray-100 dark:border-gray-700" 
                        onClose={() => setShowAd(false)}
                    />
                </div>
            )}

            <AnimatePresence initial={false}>
                {filteredMessages.map((msg, index) => {
                    const isMe = msg.senderId === 'me' || msg.senderId === myId;
                    
                    // Grouping Logic
                    const prevMsg = filteredMessages[index - 1];
                    const nextMsg = filteredMessages[index + 1];
                    
                    const isPrevSame = prevMsg && prevMsg.senderId === msg.senderId;
                    const isNextSame = nextMsg && nextMsg.senderId === msg.senderId;

                    // Time Grouping
                    const TIME_THRESHOLD = 2 * 60 * 1000;
                    const isPrevClose = prevMsg && (msg.timestamp - prevMsg.timestamp < TIME_THRESHOLD);
                    const isNextClose = nextMsg && (nextMsg.timestamp - msg.timestamp < TIME_THRESHOLD);
                    
                    const isFirstInGroup = !isPrevSame || !isPrevClose;
                    const isLastInGroup = !isNextSame || !isNextClose;
                    const isMiddleInGroup = !isFirstInGroup && !isLastInGroup;

                    // Date Separation
                    const showDate = isFirstInGroup && (!prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString());
                    
                    // Avatar logic: Show only on the last message of a group (for incoming)
                    const showAvatar = !isMe && isLastInGroup;
                    // Name logic: Show only on the first message of a group (for incoming group chats)
                    const showSenderName = !isMe && isFirstInGroup && (isGroup || isChannel || isGlobalChat);

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && renderDateBadge(msg.timestamp)}
                            <MessageBubble
                                message={msg}
                                isMe={isMe}
                                isFirstInGroup={isFirstInGroup}
                                isLastInGroup={isLastInGroup}
                                isMiddleInGroup={isMiddleInGroup}
                                showAvatar={showAvatar}
                                showSenderName={showSenderName || false}
                                onReply={handleReplySwipe}
                                onContextMenu={(e, m, i) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, message: m, isMe: i }); }}
                                onMediaClick={(url, id) => setViewingImageId(id)}
                                onPlayAudio={toggleAudio}
                                onSeekAudio={handleSeekAudio}
                                isPlayingAudio={playingAudioId === msg.id}
                                audioProgress={playingAudioId === msg.id ? audioProgress : 0}
                                repliedMessage={msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null}
                                // Selection Props
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedMessageIds.has(msg.id)}
                                onToggleSelect={handleToggleSelect}
                                onJumpToMessage={handleJumpToMessage}
                            />
                        </React.Fragment>
                    );
                })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
        </div>

        {/* Context Menu Overlay */}
        {contextMenu && (
            <>
                <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)}></div>
                <div 
                    className="fixed z-[101] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 w-56 overflow-hidden animate-fade-in flex flex-col"
                    style={{ 
                        top: Math.min(contextMenu.y, window.innerHeight - 350), 
                        left: contextMenu.x > window.innerWidth / 2 ? contextMenu.x - 230 : contextMenu.x
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Reactions */}
                    <div className="flex gap-2 p-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar bg-gray-50 dark:bg-white/5">
                        {COMMON_EMOJIS.slice(0, 6).map(emoji => (
                            <button 
                                key={emoji}
                                onClick={() => { onReaction(contextMenu.message.id, emoji); setContextMenu(null); }}
                                className="text-lg hover:scale-125 transition-transform p-1"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div className="p-1 flex flex-col gap-0.5">
                        <button onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); inputRef.current?.focus(); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 rounded-lg">
                            <Reply size={16} className="text-gray-500" /> پاسخ
                        </button>
                        
                        {onForwardMessage && (
                            <button onClick={() => { onForwardMessage(contextMenu.message); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 rounded-lg">
                                <Forward size={16} className="text-gray-500" /> فوروارد
                            </button>
                        )}

                        {contextMenu.message.text && (
                            <button onClick={handleCopy} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 rounded-lg">
                                <Copy size={16} className="text-gray-500" /> کپی
                            </button>
                        )}

                        {canPin && (
                            <button onClick={() => { onPinMessage(contextMenu.message); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 rounded-lg">
                                <Pin size={16} className="text-gray-500" /> سنجاق
                            </button>
                        )}

                        {contextMenu.isMe && contextMenu.message.type === 'text' && (
                            <button onClick={() => { setEditingMessage(contextMenu.message); setInputValue(contextMenu.message.text); setContextMenu(null); inputRef.current?.focus(); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 rounded-lg">
                                <Edit2 size={16} className="text-gray-500" /> ویرایش
                            </button>
                        )}

                        <button onClick={() => { setIsSelectionMode(true); setSelectedMessageIds(new Set([contextMenu.message.id])); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 rounded-lg">
                            <CheckCircle2 size={16} className="text-gray-500" /> انتخاب
                        </button>

                        {(contextMenu.isMe || myPermissions?.canDeleteMessages || isSystemAdmin || (isGroup && contact.creatorId === myId)) && (
                            <button onClick={() => { onDeleteMessage(contextMenu.message.id); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-3 text-sm rounded-lg">
                                <Trash2 size={16} /> حذف
                            </button>
                        )}
                    </div>
                </div>
            </>
        )}

        {/* Scroll To Bottom Button */}
        {showScrollButton && !isSelectionMode && (
            <button 
                onClick={scrollToBottom}
                className="absolute bottom-20 right-4 z-40 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 p-3 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 animate-fade-in hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <ArrowDown size={20} />
            </button>
        )}

        {/* Selection Footer (Mobile) */}
        {isSelectionMode ? (
            <div className="p-3 bg-white dark:bg-telegram-bgDark border-t border-gray-200 dark:border-white/5 relative z-20 flex justify-between items-center gap-2">
                <button onClick={handleBatchDelete} disabled={selectedMessageIds.size === 0} className="flex-1 py-3 flex flex-col items-center gap-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors disabled:opacity-50">
                    <Trash2 size={24} />
                    <span className="text-xs font-bold">حذف ({selectedMessageIds.size})</span>
                </button>
                <button onClick={() => handleBatchForward('saved')} disabled={selectedMessageIds.size === 0} className="flex-1 py-3 flex flex-col items-center gap-1 text-telegram-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-colors disabled:opacity-50">
                    <Forward size={24} />
                    <span className="text-xs font-bold">فوروارد ({selectedMessageIds.size})</span>
                </button>
            </div>
        ) : (
            /* Input Area */
            <div className="p-2 sm:p-3 bg-white dark:bg-telegram-bgDark border-t border-gray-200 dark:border-white/5 relative z-20">
                {isBlockedByMe ? (
                    <div className="w-full py-4 text-center text-gray-500 text-sm">شما این کاربر را مسدود کرده‌اید.</div>
                ) : amIBlocked ? (
                    <div className="w-full py-4 text-center text-gray-500 text-sm">امکان ارسال پیام وجود ندارد.</div>
                ) : !canWrite ? (
                    <div className="w-full py-3 flex items-center justify-center gap-2 text-gray-500 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 select-none cursor-default">
                        {isGuest && isGlobalChat ? (
                            <>
                                <Shield size={18} />
                                <span className="text-sm">کاربر مهمان فقط امکان مشاهده چت عمومی را دارد.</span>
                            </>
                        ) : (
                            <>
                                <Megaphone size={18} />
                                <span className="text-sm">فقط مدیران می‌توانند در این کانال پیام ارسال کنند.</span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex items-end gap-2 max-w-4xl mx-auto transition-all">
                        {/* Slow Mode Overlay */}
                        {slowModeCooldown > 0 && !editingMessage && (
                            <div className="absolute inset-0 z-50 bg-white/90 dark:bg-gray-800/90 rounded-xl flex items-center justify-center text-sm font-bold text-red-500">
                                لطفاً {slowModeCooldown} ثانیه صبر کنید...
                            </div>
                        )}

                        {/* Replying Banner */}
                        {replyingTo && (
                            <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-gray-800 p-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center animate-slide-in shadow-sm z-10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Reply className="text-telegram-primary shrink-0" size={20} />
                                    <div className="border-l-2 border-telegram-primary pl-2 flex flex-col">
                                        <span className="text-telegram-primary text-xs font-bold">پاسخ به {replyingTo.senderName || 'پیام'}</span>
                                        <span className="text-xs text-gray-500 truncate max-w-[200px]">{replyingTo.text || 'رسانه'}</span>
                                    </div>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={16} /></button>
                            </div>
                        )}

                        {/* Recording UI */}
                        {isRecording ? (
                            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-between px-4 py-3 shadow-md animate-fade-in border border-red-100 dark:border-red-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                                    <span className="font-mono text-red-500 font-bold">{formatDuration(recordingDuration)}</span>
                                </div>
                                
                                {/* Video Preview Bubble */}
                                {recordingMode === 'video' && (
                                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-red-500 shadow-lg">
                                        <video ref={videoPreviewRef} className="w-full h-full object-cover" muted />
                                    </div>
                                )}

                                <span className="text-sm text-gray-400">در حال ضبط {recordingMode === 'audio' ? 'صدا' : 'ویدیو'}...</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                    <button onClick={stopAndSendRecording} className="p-2 bg-telegram-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"><Send size={18} className="rotate-180" /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" onClick={() => genericFileInputRef.current?.click()}><Paperclip size={24} /></button>
                                <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl flex items-center relative transition-colors focus-within:bg-white dark:focus-within:bg-black/40 focus-within:ring-1 focus-within:ring-telegram-primary/30">
                                    <textarea
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); handleSend(); }}}
                                        placeholder="پیام..."
                                        className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-4 max-h-32 min-h-[48px] text-gray-900 dark:text-white placeholder-gray-400"
                                        rows={1}
                                    />
                                    <button className="p-2 text-gray-400 hover:text-yellow-500 transition-colors" onClick={() => setShowEmojiPicker(!showEmojiPicker)}><Smile size={24} /></button>
                                </div>
                                
                                {/* Send or Mic/Video Toggle */}
                                {inputValue.trim() ? (
                                    <button onClick={handleSend} className="p-3 bg-telegram-primary text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"><Send size={24} className={inputValue ? "rotate-0" : "rotate-0"} /></button>
                                ) : (
                                    <div className="relative group">
                                        <button 
                                            onMouseDown={startRecording}
                                            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                                            className="p-3 bg-telegram-primary/10 text-telegram-primary dark:text-white dark:bg-white/10 hover:bg-telegram-primary hover:text-white rounded-full shadow-none hover:shadow-lg transition-all active:scale-95"
                                        >
                                            {recordingMode === 'audio' ? <Mic size={24} /> : <Camera size={24} />}
                                        </button>
                                        
                                        {/* Toggle Switch */}
                                        {!isRecording && (
                                            <button 
                                                onClick={toggleRecordingMode}
                                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                                                title="تغییر حالت ضبط"
                                            >
                                                {recordingMode === 'audio' ? <Video size={14}/> : <Mic size={14}/>}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default ChatWindow;

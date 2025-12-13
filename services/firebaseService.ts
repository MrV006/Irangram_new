
import { db, auth, storage } from "../firebaseConfig";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  where, 
  getDocs, 
  writeBatch, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
  type User
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { Message, SystemInfo, Contact, UserRole, UserProfileData, AppNotification, SettingsDoc, Report, Appeal, DeletionRequest, PollData, AdminPermissions, ChatFolder, SystemPermissions } from "../types";
import { CONFIG } from "../config";

let localBannedWords: string[] = [];

const sanitizeData = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key];
        }
    });
    return clean;
};

export const getCurrentUser = () => {
    return auth?.currentUser || null;
};

export const subscribeToAuth = (callback: (user: any | null) => void) => {
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};

export const registerUser = async (email: string, pass: string, name: string, phone: string) => {
    if (!auth) throw new Error("Auth unavailable");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    
    if (db) {
        let role: UserRole = 'user';
        if (email === CONFIG.OWNER_EMAIL) role = 'owner';
        else if (email === CONFIG.DEVELOPER_EMAIL || email === 'developer.irangram@gmail.com') role = 'developer';

        const username = email.split('@')[0].replace(/\./g, '_') + '_' + Math.floor(Math.random() * 1000);

        await setDoc(doc(db, "users", cred.user.uid), {
            name: name,
            email: email,
            phone: phone,
            username: username,
            bio: "کاربر جدید ایران‌گرام",
            avatar: `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128`,
            role: role,
            isBanned: false,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            status: 'online'
        });
    }
    return cred.user;
};

export const loginUser = async (email: string, pass: string) => {
    if (!auth) throw new Error("Auth unavailable");
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    
    if (db) {
        const userRef = doc(db, "users", cred.user.uid);
        const updates: any = { status: 'online', lastSeen: serverTimestamp() };
        setDoc(userRef, updates, { merge: true }).catch(e => console.log("Status update warning", e));
    }
    return cred.user;
};

export const loginWithGoogle = async (isLoginMode: boolean = false) => {
    if (!auth) throw new Error("سرویس احراز هویت در دسترس نیست.");
    const provider = new GoogleAuthProvider();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const email = user.email || '';
        
        let role: UserRole = 'user';
        if (email === CONFIG.OWNER_EMAIL) role = 'owner';
        else if (email === CONFIG.DEVELOPER_EMAIL || email === 'developer.irangram@gmail.com') role = 'developer';

        if (db) {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                if (isLoginMode && email !== CONFIG.OWNER_EMAIL && email !== CONFIG.DEVELOPER_EMAIL && email !== 'developer.irangram@gmail.com') {
                    await signOut(auth);
                    localStorage.setItem('irangram_auth_error', 'user-not-found');
                    localStorage.setItem('irangram_auth_retry_email', email);
                    localStorage.setItem('irangram_auth_retry_name', user.displayName || '');
                    const error: any = new Error("User not found");
                    error.code = 'custom/user-not-found';
                    throw error;
                }
                
                const username = (email.split('@')[0] || 'user').replace(/\./g, '_') + '_' + Math.floor(Math.random() * 1000);

                await setDoc(docRef, {
                    name: user.displayName || 'کاربر گوگل',
                    email: email,
                    phone: '', 
                    username: username,
                    bio: "کاربر جدید ایران‌گرام",
                    avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random&color=fff&size=128`,
                    role: role,
                    isBanned: false,
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    status: 'online'
                });
            } else {
                 const updates: any = { status: 'online', lastSeen: serverTimestamp() };
                await setDoc(docRef, updates, { merge: true });
            }
        }
        return user;
    } catch (error) {
        console.error("Google Sign-In Error", error);
        throw error;
    }
};

export const loginAnonymously = async () => {
    if (!auth) throw new Error("Auth service unavailable");
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    if (db) {
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); 
        await setDoc(doc(db, "users", user.uid), {
            name: 'کاربر مهمان',
            email: '',
            phone: '',
            username: `guest_${user.uid.substring(0,6)}`,
            bio: "اکانت موقت (فقط خواندنی)",
            avatar: `https://ui-avatars.com/api/?name=Guest&background=ef4444&color=fff&size=128`,
            role: 'guest',
            isBanned: false,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            status: 'online',
            expiresAt: expiresAt
        });
    }
    return user;
};

export const sendPasswordReset = async (email: string) => {
    if (auth) await sendPasswordResetEmail(auth, email);
};

export const updateUserPassword = async (newPassword: string) => {
    if (auth?.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
    } else {
        throw new Error("برای تغییر رمز عبور لطفا از طریق تنظیمات گوگل اقدام کنید یا مجددا وارد شوید.");
    }
};

export const logoutUser = async (uid?: string) => {
    if (!auth) return;
    if (uid && db) {
        try {
            await updateDoc(doc(db, "users", uid), { status: 'offline', lastSeen: serverTimestamp() });
        } catch (e) {
            console.warn("Could not update status to offline", e);
        }
    }
    await signOut(auth);
};

export const getUserProfile = async (uid: string): Promise<UserProfileData | null> => {
    if (!db) return null;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { uid: docSnap.id, ...docSnap.data() } as UserProfileData;
        } else {
            if (auth?.currentUser?.uid === uid) {
                 const currentUser = auth.currentUser;
                 const email = currentUser.email;
                 if (email === CONFIG.OWNER_EMAIL || email === CONFIG.DEVELOPER_EMAIL || email === 'developer.irangram@gmail.com') {
                     const role = email === CONFIG.OWNER_EMAIL ? 'owner' : 'developer';
                     const newProfile: UserProfileData = {
                        uid: currentUser.uid,
                        name: currentUser.displayName || 'System Admin',
                        email: email || '',
                        phone: '',
                        username: role,
                        bio: 'حساب سیستمی',
                        avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${role}&background=random&color=fff`,
                        role: role as UserRole,
                        isBanned: false,
                        createdAt: serverTimestamp(),
                        lastSeen: serverTimestamp(),
                        status: 'online'
                     };
                     setDoc(docRef, newProfile).catch(e => console.error("Auto-profile create warning:", e));
                     return newProfile;
                 }
            }
        }
    } catch (e: any) {
        console.error("Error fetching profile", e);
    }
    return null;
};

// --- CHAT FUNCTIONS ---

export const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join("_");
};

export const subscribeToGlobalChat = (callback: (messages: Message[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "global_chat"), orderBy("createdAt", "asc"), limit(100));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toMillis() || Date.now()
        } as Message));
        callback(messages);
    }, (error) => {
        console.error("Global Chat Error:", error);
    });
};

export const sendGlobalMessage = async (message: Partial<Message>, userProfile: { name: string, avatar?: string, role?: UserRole }) => {
    if (!db || !auth?.currentUser) {
        alert("خطا: دیتابیس یا کاربر یافت نشد.");
        return;
    }
    const msgData = {
        ...message,
        senderId: auth.currentUser.uid,
        senderName: userProfile.name,
        senderAvatar: userProfile.avatar || '',
        senderRole: userProfile.role || 'user', // Add Role
        createdAt: serverTimestamp(),
        reactions: {},
        type: message.type || 'text'
    };
    try {
        await addDoc(collection(db, "global_chat"), msgData);
    } catch (error: any) {
        console.error("Send Global Error:", error);
        alert("ارسال پیام ناموفق بود. " + (error.code === 'permission-denied' ? "شما دسترسی ارسال پیام ندارید." : "لطفا اتصال اینترنت را چک کنید."));
    }
};

export const sendPrivateMessage = async (chatId: string, receiverId: string, message: Partial<Message>, userProfile: { name: string, avatar?: string, role?: UserRole }) => {
    if (!db) throw new Error("دیتابیس متصل نیست.");
    
    const currentUser = auth?.currentUser;
    const senderUid = currentUser?.uid || message.senderId;
    
    if (!senderUid) throw new Error("شناسه فرستنده یافت نشد.");

    const chatRef = doc(db, "chats", chatId);
    
    const chatUpdateData: any = { 
        updatedAt: serverTimestamp(), 
        lastMessage: message.text || (message.type === 'poll' ? '📊 نظرسنجی' : 'رسانه'), 
        lastSenderId: senderUid 
    };

    if (receiverId === 'saved') {
         chatUpdateData.participants = arrayUnion(senderUid);
         chatUpdateData.type = 'user'; 
    } 
    else {
         chatUpdateData.participants = arrayUnion(senderUid, receiverId);
    }

    try {
        await setDoc(chatRef, chatUpdateData, { merge: true });
        
        const safeMessage = sanitizeData({
            ...message,
            senderId: senderUid,
            senderName: userProfile.name, 
            senderAvatar: userProfile.avatar || '', 
            senderRole: userProfile.role || 'user', // Add Role
            createdAt: serverTimestamp(), 
            reactions: {},
            type: message.type || 'text'
        });
        
        await addDoc(collection(db, "chats", chatId, "messages"), safeMessage);
    } catch (error: any) {
        console.error("Send Private Error:", error);
        alert("ارسال پیام خصوصی ناموفق بود. " + (error.code === 'permission-denied' ? "دسترسی محدود شده است." : "خطای شبکه."));
    }
};

export const subscribeToPrivateChat = (chatId: string, callback: (messages: Message[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limit(100));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toMillis() || Date.now()
        } as Message));
        callback(messages);
    });
};

// NEW: Get Shared Media (Real Data)
export const getSharedMedia = async (chatId: string, isGlobal: boolean): Promise<Message[]> => {
    if (!db) return [];
    try {
        const collectionRef = isGlobal 
            ? collection(db, "global_chat") 
            : collection(db, "chats", chatId, "messages");
            
        // We want images, videos, and files. Firestore 'in' query supports up to 10 values.
        const q = query(
            collectionRef, 
            where("type", "in", ["image", "video_note", "file", "audio"]), 
            orderBy("createdAt", "desc"), 
            limit(50)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toMillis() || Date.now()
        } as Message));
    } catch (e) {
        console.error("Error fetching shared media:", e);
        return [];
    }
};

export const saveChatFolders = async (uid: string, folders: ChatFolder[]) => {
    if (!db) return;
    await setDoc(doc(db, "users", uid, "settings", "folders"), { folders });
};

export const subscribeToChatFolders = (uid: string, callback: (folders: ChatFolder[]) => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, "users", uid, "settings", "folders"), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data().folders || []);
        } else {
            callback([]);
        }
    }, (e) => console.warn("Folder listener error", e));
};

export const updateUserChatPreference = async (uid: string, contactId: string, updates: { isPinned?: boolean; isArchived?: boolean }) => {
    if (!db) return;
    const prefRef = doc(db, "users", uid, "chat_preferences", contactId);
    try {
        await setDoc(prefRef, updates, { merge: true });
    } catch (e) {
        console.error("Failed to update chat pref", e);
    }
};

export const subscribeToChatPreferences = (uid: string, callback: (prefs: Record<string, any>) => void) => {
    if (!db) return () => {};
    const q = collection(db, "users", uid, "chat_preferences");
    return onSnapshot(q, (snapshot) => {
        const prefs: Record<string, any> = {};
        snapshot.forEach(d => {
            prefs[d.id] = d.data();
        });
        callback(prefs);
    }, (error) => console.warn("ChatPref Listener Error:", error));
};

export const subscribeToUserProfile = (uid: string, callback: (data: UserProfileData) => void) => {
    if (!db) return () => {};
    const docRef = doc(db, "users", uid);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ uid: docSnap.id, ...docSnap.data() } as UserProfileData);
        }
    }, (error) => console.warn("Profile Listener Error:", error));
};

export const updateUserProfileDoc = async (uid: string, data: any) => {
    if (!db) return;
    const docRef = doc(db, "users", uid);
    const cleanData: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) cleanData[key] = data[key];
    });
    await updateDoc(docRef, cleanData);
};

// Unified Entity Search (Users, Groups, Channels)
export const resolveEntityByUsername = async (username: string): Promise<Contact | null> => {
    if (!db) return null;
    const cleanUsername = username.replace('@', '').toLowerCase();
    
    try {
        // 1. Check Users
        let q = query(collection(db, "users"), where("username", "==", cleanUsername));
        let snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data() as any;
            return {
                id: doc.id,
                name: data.name,
                avatar: data.avatar,
                bio: data.bio,
                username: '@' + data.username,
                phone: data.phone,
                status: data.status,
                type: 'user'
            };
        }

        // 2. Check Chats (Groups/Channels)
        q = query(collection(db, "chats"), where("username", "==", cleanUsername));
        snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data() as any;
            return {
                id: doc.id,
                name: data.name,
                avatar: data.avatar,
                bio: data.description,
                username: '@' + data.username,
                phone: '',
                status: 'online',
                type: data.type
            };
        }
    } catch (e) {
        console.warn("Resolve entity failed", e);
    }
    return null;
};

// Kept for backward compatibility but improved to search both
export const searchUser = async (term: string): Promise<UserProfileData | null> => {
    const result = await resolveEntityByUsername(term);
    if (result && result.type === 'user') {
        return {
            uid: result.id,
            name: result.name,
            avatar: result.avatar,
            bio: result.bio,
            username: result.username.replace('@',''),
            phone: result.phone,
            role: 'user', // Default fallback
            createdAt: Date.now(),
            lastSeen: Date.now(),
            status: result.status
        } as UserProfileData;
    }
    // Check phone only if it's strictly a number
    if (!db) return null;
    if (/^\+?\d+$/.test(term)) {
        try {
            const q = query(collection(db, "users"), where("phone", "==", term));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                return { uid: userDoc.id, ...userDoc.data() } as UserProfileData;
            }
        } catch(e) {}
    }
    return null;
};

export const syncPhoneContacts = async (phones: string[]): Promise<UserProfileData[]> => {
    if (!db || phones.length === 0) return [];
    const results: UserProfileData[] = [];
    const chunkSize = 10;
    for (let i = 0; i < phones.length; i += chunkSize) {
        const chunk = phones.slice(i, i + chunkSize);
        const normalized = chunk.map(p => p.replace(/\s+/g, ''));
        try {
            const q = query(collection(db, "users"), where("phone", "in", normalized));
            const snapshot = await getDocs(q);
            snapshot.forEach(d => {
                results.push({ uid: d.id, ...d.data() } as UserProfileData);
            });
        } catch (e) {
            console.error("Error syncing batch", e);
        }
    }
    return results;
};

export const uploadMedia = async (file: File, path: string): Promise<string> => {
    if (!storage) throw new Error("Storage unavailable");
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const uploadMediaWithProgress = async (file: File, path: string, onProgress: (progress: number) => void): Promise<string> => {
    if (!storage) throw new Error("Storage unavailable");
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
};

export const updateUserHeartbeat = async (uid: string, status: string = 'online') => {
    if(!db) return;
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, { 
            lastSeen: serverTimestamp(),
            status: status 
        });
    } catch(e) {}
};

export const createGroup = async (name: string, description: string, imageFile: File | null, memberIds: string[], creatorId: string, isChannel: boolean) => {
    if (!db) return null;
    
    let avatarUrl = `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`;
    if (imageFile) {
        try {
            avatarUrl = await uploadMedia(imageFile, `groups/${Date.now()}_${imageFile.name}`);
        } catch (e) { console.error("Group image upload failed", e); }
    }

    // Default username generation
    const cleanName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const uniqueSuffix = Math.floor(Math.random() * 10000).toString();
    const username = (cleanName.length > 3 ? cleanName : 'group') + '_' + uniqueSuffix;

    const groupData = {
        name,
        description,
        avatar: avatarUrl,
        type: isChannel ? 'channel' : 'group',
        username: username,
        creatorId,
        admins: [creatorId],
        participants: [...memberIds, creatorId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPinned: false
    };

    const docRef = await addDoc(collection(db, "chats"), groupData);
    return { id: docRef.id, ...groupData };
};

export const editPrivateMessage = async (chatId: string, messageId: string, newText: string) => {
    if (!db) return;
    const msgRef = doc(db, "chats", chatId, "messages", messageId);
    await updateDoc(msgRef, { text: newText, edited: true });
};

export const setChatPin = async (chatId: string, message: any) => {
    if (!db) return;
    const chatRef = chatId === 'global_chat' ? doc(db, "chat_metadata", chatId) : doc(db, "chats", chatId);
    
    const pinData = {
        id: message.id,
        text: message.text || 'Message',
        sender: message.sender,
        type: message.type
    };
    
    if (chatId === 'global_chat') {
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
             await setDoc(chatRef, { pinnedMessages: [pinData] });
        } else {
             await updateDoc(chatRef, { pinnedMessages: arrayUnion(pinData) });
        }
    } else {
        await updateDoc(chatRef, { pinnedMessages: arrayUnion(pinData) });
    }
};

export const removeChatPin = async (chatId: string, messageId?: string) => {
    if (!db) return;
    const chatRef = chatId === 'global_chat' ? doc(db, "chat_metadata", chatId) : doc(db, "chats", chatId);
    
    if (messageId) {
        const snap = await getDoc(chatRef);
        if (snap.exists()) {
            const data = snap.data();
            const currentPins = data.pinnedMessages || [];
            const updatedPins = currentPins.filter((p: any) => p.id !== messageId);
            await updateDoc(chatRef, { pinnedMessages: updatedPins });
        }
    } else {
        await updateDoc(chatRef, { pinnedMessages: [] });
    }
};

export const toggleMessageReaction = async (messageId: string, emoji: string, userId: string) => {
    if (!db) return;
    const msgRef = doc(db, "global_chat", messageId);
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
        const data = snap.data();
        const reactions = data.reactions || {};
        const userList = reactions[emoji] || [];
        
        if (userList.includes(userId)) {
            const newList = userList.filter((id: string) => id !== userId);
            if (newList.length === 0) delete reactions[emoji];
            else reactions[emoji] = newList;
        } else {
            reactions[emoji] = [...userList, userId];
        }
        await updateDoc(msgRef, { reactions });
    }
};

export const castPollVote = async (chatId: string, messageId: string, optionId: string, userId: string, isGlobal: boolean) => {
    if (!db) return;
    const collectionName = isGlobal ? "global_chat" : "chats";
    const msgRef = isGlobal 
        ? doc(db, collectionName, messageId) 
        : doc(db, collectionName, chatId, "messages", messageId);
    
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
        const data = snap.data();
        const poll = data.poll;
        if (!poll || poll.isClosed) return;

        const options = poll.options;
        const targetOptionIndex = options.findIndex((o: any) => o.id === optionId);
        if (targetOptionIndex === -1) return;

        const userVotedInOption = options[targetOptionIndex].voterIds.includes(userId);
        
        if (userVotedInOption) {
            options[targetOptionIndex].voterIds = options[targetOptionIndex].voterIds.filter((id: string) => id !== userId);
        } else {
            if (!poll.allowMultiple) {
                options.forEach((opt: any) => {
                    opt.voterIds = opt.voterIds.filter((id: string) => id !== userId);
                });
            }
            options[targetOptionIndex].voterIds.push(userId);
        }
        await updateDoc(msgRef, { poll: { ...poll, options } });
    }
};

export const setUserTyping = async (uid: string, isTyping: boolean) => {
    if(!db) return;
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, { isTyping: isTyping });
    } catch(e) {}
};

export const isGroupAdmin = async (chatId: string, userId: string) => {
    if (!db) return false;
    try {
        const chatRef = doc(db, "chats", chatId);
        const snap = await getDoc(chatRef);
        if (snap.exists()) {
            const data = snap.data();
            return data.admins?.includes(userId) || data.creatorId === userId;
        }
    } catch (e) { return false; }
    return false;
};

export const removeGroupMember = async (chatId: string, userId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { 
        participants: arrayRemove(userId),
        admins: arrayRemove(userId)
    });
};

export const addGroupMember = async (chatId: string, userId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { participants: arrayUnion(userId) });
};

export const leaveGroup = async (chatId: string, userId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { 
        participants: arrayRemove(userId),
        admins: arrayRemove(userId)
    });
};

export const getGroupInviteLink = (usernameOrId: string) => {
    // Dynamic URL based on current window location
    // This ensures if domain changes, the link updates automatically
    if (!usernameOrId) return '';
    if (typeof window === 'undefined') return '';
    
    const origin = window.location.origin;
    const cleanUser = usernameOrId.replace('@', '');
    return `${origin}/@${cleanUser}`;
};

export const joinGroupViaLink = async (chatId: string, userId: string) => {
     if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { participants: arrayUnion(userId) });
};

export const promoteToGroupAdmin = async (chatId: string, userId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { admins: arrayUnion(userId) });
};

export const demoteGroupAdmin = async (chatId: string, userId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { admins: arrayRemove(userId) });
};

export const updateChatSlowMode = async (chatId: string, seconds: number) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { slowMode: seconds });
};

export const updateGroupAdminPermissions = async (chatId: string, userId: string, permissions: AdminPermissions) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    const key = `adminPermissions.${userId}`;
    await updateDoc(chatRef, { [key]: permissions });
};

export const getGroupDetails = async (chatId: string) => {
    if (!db) return null;
    const chatRef = doc(db, "chats", chatId);
    const snap = await getDoc(chatRef);
    return snap.exists() ? snap.data() : null;
};

export const getGroupMembers = async (chatId: string): Promise<UserProfileData[]> => {
    if (!db) return [];
    try {
        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) return [];
        
        const participants = chatSnap.data().participants || [];
        if (participants.length === 0) return [];

        const members: UserProfileData[] = [];
        const chunkSize = 10;
        for (let i = 0; i < participants.length; i += chunkSize) {
            const chunk = participants.slice(i, i + chunkSize);
            const q = query(collection(db, "users"), where("__name__", "in", chunk));
            const querySnap = await getDocs(q);
            querySnap.forEach((d) => {
                members.push({ uid: d.id, ...d.data() } as UserProfileData);
            });
        }
        return members;
    } catch (e) {
        console.error("Error fetching group members", e);
        return [];
    }
};

export const subscribeToAllUsers = (callback: (users: Partial<UserProfileData>[]) => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "users"));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(d => ({
            uid: d.id,
            status: (d.data() as any).status,
            lastSeen: (d.data() as any).lastSeen ? ((d.data() as any).lastSeen as Timestamp).toMillis() : Date.now(),
            name: (d.data() as any).name,
            avatar: (d.data() as any).avatar
        }));
        callback(users);
    }, (error) => console.warn("AllUsers Listener Error:", error));
};

export const subscribeToChatPin = (chatId: string, callback: (data: any[]) => void) => {
    if (!db) return () => {};
    const docRef = chatId === 'global_chat' ? doc(db, "chat_metadata", chatId) : doc(db, "chats", chatId);
    
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.pinnedMessages && Array.isArray(data.pinnedMessages)) {
                callback(data.pinnedMessages);
            } else if (data.pinnedMessage) {
                callback([data.pinnedMessage]);
            } else {
                callback([]);
            }
        } else {
            callback([]);
        }
    }, (error) => console.warn("Pin Listener Error:", error));
};

export const subscribeToUserChats = (uid: string, callback: (chats: any[]) => void) => {
    if (!db) return () => {};
    
    const q = query(collection(db, "chats"), where("participants", "array-contains", uid));
    
    return onSnapshot(q, (querySnapshot) => {
        const chats = querySnapshot.docs.map(d => {
            const data = d.data() as any;
            return { 
                id: d.id, 
                ...data, 
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toMillis() : Date.now(),
                pinnedMessages: data.pinnedMessages || (data.pinnedMessage ? [data.pinnedMessage] : [])
            };
        });
        chats.sort((a, b) => b.updatedAt - a.updatedAt);
        callback(chats);
    }, (error) => console.warn("UserChats Listener Error:", error));
};

export const subscribeToSystemInfo = (callback: (info: SystemInfo & { forceUpdate: number, maintenanceMode?: boolean, globalScreenshotRestriction?: boolean }) => void) => { if (!db) return () => {}; const docRef = doc(db, "system", "info"); return onSnapshot(docRef, (docSnap) => { if (docSnap.exists()) { const data = docSnap.data(); callback({ currentVersion: data.currentVersion || CONFIG.VERSION, lastCleanup: data.lastCleanup ? (data.lastCleanup as Timestamp).toMillis() : 0, forceUpdate: data.forceUpdate ? (data.forceUpdate as Timestamp).toMillis() : 0, maintenanceMode: data.maintenanceMode || false, globalScreenshotRestriction: data.globalScreenshotRestriction || false }); } else { setDoc(docRef, { currentVersion: CONFIG.VERSION, lastCleanup: serverTimestamp(), maintenanceMode: false }); } }, (error) => console.warn("SystemInfo Listener Error:", error)); };
export const checkAndTriggerCleanup = async () => { if (!db) return; };
export const triggerSystemUpdate = async () => { if(!db) return; await setDoc(doc(db, "system", "info"), { forceUpdate: serverTimestamp() }, { merge: true }); };
export const wipeSystemData = async () => { if(!db) return; await clearGlobalChat(); };
export const setGlobalMaintenance = async (status: boolean) => { if(!db) return; await setDoc(doc(db, "system", "info"), { maintenanceMode: status }, { merge: true }); };
export const deleteUserAccount = async (targetUid: string) => { if(!db) return; try { await deleteDoc(doc(db, "users", targetUid)); } catch(e) {} };
export const subscribeToWordFilters = () => { if (!db) return () => {}; const docRef = doc(db, "settings", "wordFilters"); return onSnapshot(docRef, (docSnap) => { if (docSnap.exists()) { localBannedWords = (docSnap.data() as any).bannedWords || []; } }, (error) => console.warn("WordFilters Listener Error:", error)); };
export const getWordFilters = async (): Promise<string[]> => { if (localBannedWords.length > 0) return localBannedWords; if (!db) return []; try { const docRef = doc(db, "settings", "wordFilters"); const snap = await getDoc(docRef); if (snap.exists()) { const words = (snap.data() as any).bannedWords || []; localBannedWords = words; return words; } } catch(e) { console.warn("Could not fetch word filters (offline)"); } return []; };
export const updateWordFilters = async (words: string[]) => { if (!db) return; await setDoc(doc(db, "settings", "wordFilters"), { bannedWords: words }, { merge: true }); };
export const getAdminSpyChats = async (targetUid: string): Promise<Contact[]> => { if (!db) return []; const chats: Contact[] = [{ id: 'global_chat', name: 'چت عمومی جهانی', avatar: 'https://cdn-icons-png.flaticon.com/512/921/921490.png', status: 'online', bio: 'Surveillance View', username: '@global_world', phone: '', type: 'group', isGlobal: true }]; try { chats.push({ id: `saved_${targetUid}`, name: 'پیام‌های ذخیره شده (Cloud)', avatar: '', status: 'online', bio: 'Personal Saved Messages', username: 'saved', phone: '', type: 'user', isGlobal: false }); const q = query(collection(db, "chats"), where("participants", "array-contains", targetUid)); const snapshot = await getDocs(q); const chatPromises = snapshot.docs.map(async (docSnapshot) => { const data = docSnapshot.data(); const participants = data.participants || []; if (data.type === 'group' || data.type === 'channel') { return { id: docSnapshot.id, name: data.name || 'Group', avatar: data.avatar, status: 'online', bio: data.type === 'channel' ? 'Channel' : 'Group', username: '', phone: '', type: data.type, isGlobal: false } as Contact; } else { const otherId = participants.find((id: string) => id !== targetUid); if (otherId) { const otherProfile = await getUserProfile(otherId); return { id: docSnapshot.id, name: otherProfile ? `چت با: ${otherProfile.name}` : `User: ${otherId}`, avatar: otherProfile?.avatar, status: 'offline', bio: 'Private Chat', username: otherProfile?.username || '', phone: '', type: 'user', isGlobal: false } as Contact; } } return null; }); const resolvedChats = await Promise.all(chatPromises); return [...chats, ...resolvedChats.filter(c => c !== null) as Contact[]]; } catch (e) { return chats; } };
export const getAdminSpyMessages = async (targetUid: string, chatId: string): Promise<Message[]> => { if (!db) return []; try { let q; if (chatId === 'global_chat') { q = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(100)); } else if (chatId.startsWith('saved_')) { q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(100)); } else { q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(100)); } const snapshot = await getDocs(q); return snapshot.docs.map(d => { const data = d.data() as any; return { id: d.id, ...data, timestamp: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as Message; }); } catch (e) { return []; } };
export const adminSendMessageAsUser = async (chatId: string, spoofedSenderId: string, text: string) => { if (!db || !text.trim()) return; try { const userProfile = await getUserProfile(spoofedSenderId); const messageData = { text, senderId: spoofedSenderId, senderName: userProfile?.name || 'User', senderAvatar: userProfile?.avatar || '', type: 'text', createdAt: serverTimestamp(), isSticker: false, reactions: {} }; if (chatId === 'global_chat') { await addDoc(collection(db, "global_chat"), messageData); } else { await addDoc(collection(db, "chats", chatId, "messages"), messageData); await setDoc(doc(db, "chats", chatId), { lastMessage: text, lastSenderId: spoofedSenderId, updatedAt: serverTimestamp() }, { merge: true }); } } catch(e) {} };
export const forceJoinGroup = async (groupId: string, userId: string) => { if (!db) return; const chatRef = doc(db, "chats", groupId); await updateDoc(chatRef, { participants: arrayUnion(userId), admins: arrayUnion(userId) }); };
export const getAllGroups = async (): Promise<any[]> => { if (!db) return []; try { const q = query(collection(db, "chats"), where("type", "in", ["group", "channel"])); const snapshot = await getDocs(q); return snapshot.docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { return []; } };
export const sendSystemNotification = async (targetUid: string, title: string, message: string) => { if (!db) return; try { await addDoc(collection(db, "users", targetUid, "notifications"), { title, message, type: 'alert', read: false, createdAt: serverTimestamp() }); } catch (e) {} };
export const subscribeToNotifications = (uid: string, callback: (notifs: AppNotification[]) => void) => { if (!db) return () => {}; const q = query(collection(db, "users", uid, "notifications"), where("read", "==", false)); return onSnapshot(q, (snapshot) => { const notifs = snapshot.docs.map(d => { const data = d.data() as any; return { id: d.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as AppNotification; }); notifs.sort((a, b) => b.createdAt - a.createdAt); callback(notifs); }, (error) => console.warn("Notifications Listener Error:", error)); };
export const markNotificationRead = async (uid: string, notifId: string) => { if(!db) return; await updateDoc(doc(db, "users", uid, "notifications", notifId), { read: true }); };
export const editMessageGlobal = async (messageId: string, newText: string) => { if (!db) return; try { await updateDoc(doc(db, "global_chat", messageId), { text: newText, edited: true }); } catch (e) {} };
export const clearGlobalChat = async () => { if (!db) return; try { const q = query(collection(db, "global_chat")); const snapshot = await getDocs(q); const batch = writeBatch(db); let count = 0; snapshot.forEach((d) => { batch.delete(d.ref); count++; if (count >= 490) return; }); await batch.commit(); } catch (e) {} };
export const deleteMessageGlobal = async (messageId: string) => { if (!db) return; try { await deleteDoc(doc(db, "global_chat", messageId)); } catch (e) {} };
export const deletePrivateMessage = async (chatId: string, messageId: string) => { if (!db) return; try { await deleteDoc(doc(db, "chats", chatId, "messages", messageId)); } catch (e) {} };
export const deleteChat = async (chatId: string) => { if(!db) return; try { await deleteDoc(doc(db, "chats", chatId)); } catch(e) {} };
export const clearPrivateChatHistory = async (chatId: string) => { if (!db) return; try { const q = query(collection(db, "chats", chatId, "messages"), limit(500)); const snapshot = await getDocs(q); const batch = writeBatch(db); snapshot.docs.forEach((d) => batch.delete(d.ref)); await batch.commit(); } catch (e) {} };
export const blockUser = async (currentUid: string, targetUid: string) => { if(!db) return; try { await setDoc(doc(db, "users", currentUid, "blocked", targetUid), { blockedAt: serverTimestamp(), uid: targetUid }); } catch (e) {} };
export const unblockUser = async (currentUid: string, targetUid: string) => { if(!db) return; try { await deleteDoc(doc(db, "users", currentUid, "blocked", targetUid)); } catch (e) {} };
export const checkBlockedStatus = async (currentUid: string, targetUid: string) => { if(!db) return false; try { const docRef = doc(db, "users", currentUid, "blocked", targetUid); const snap = await getDoc(docRef); return snap.exists(); } catch { return false; } };
export const sendBanAppeal = async (senderUid: string, senderName: string, appealText: string) => { if (!db) return; await addDoc(collection(db, "appeals"), { userId: senderUid, userName: senderName, message: appealText, status: 'pending', createdAt: serverTimestamp() }); };
export const subscribeToAppeals = (callback: (appeals: Appeal[]) => void) => { if (!db) return () => {}; const q = query(collection(db, "appeals"), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => { const appeals = snapshot.docs.map(d => { const data = d.data() as any; return { id: d.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as Appeal; }); callback(appeals); }, (error) => console.warn("Appeals Listener Error:", error)); };
export const resolveAppeal = async (appealId: string, accepted: boolean) => { if (!db) return; await updateDoc(doc(db, "appeals", appealId), { status: accepted ? 'approved' : 'rejected' }); };
export const deleteAppeal = async (appealId: string) => { if (!db) return; await deleteDoc(doc(db, "appeals", appealId)); };
export const requestAccountDeletion = async (userId: string, userName: string, reason: string) => { if (!db) return; const q = query(collection(db, "deletion_requests"), where("userId", "==", userId)); const snap = await getDocs(q); if (snap.empty) { await addDoc(collection(db, "deletion_requests"), { userId, userName, reason, createdAt: serverTimestamp() }); } else { throw new Error("یک درخواست حذف هم‌اکنون در جریان است."); } };
export const subscribeToDeletionRequests = (callback: (requests: DeletionRequest[]) => void) => { if (!db) return () => {}; const q = query(collection(db, "deletion_requests"), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => { const requests = snapshot.docs.map(d => { const data = d.data() as any; return { id: d.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as DeletionRequest; }); callback(requests); }, (error) => console.warn("DeletionRequests Listener Error:", error)); };
export const resolveDeletionRequest = async (requestId: string, userId: string, approve: boolean) => { if (!db) return; if (approve) await deleteUserAccount(userId); await deleteDoc(doc(db, "deletion_requests", requestId)); };
export const sendReport = async (messageId: string, messageContent: string, reportedUserId: string, reportedUserName: string, reporterId: string, reason: string) => { if (!db) return; await addDoc(collection(db, "reports"), { messageId, messageContent, reportedUserId, reportedUserName, reporterId, reason, status: 'pending', createdAt: serverTimestamp() }); };
export const subscribeToReports = (callback: (reports: Report[]) => void) => { if (!db) return () => {}; const q = query(collection(db, "reports"), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => { const reports = snapshot.docs.map(d => { const data = d.data() as any; return { id: d.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now(), handledAt: data.handledAt ? (data.handledAt as Timestamp).toMillis() : undefined } as Report; }); callback(reports); }, (error) => console.warn("Reports Listener Error:", error)); };
export const handleReport = async (reportId: string, adminName: string) => { if (!db) return; await updateDoc(doc(db, "reports", reportId), { status: 'handled', handledBy: adminName, handledAt: serverTimestamp() }); };
export const deleteReport = async (reportId: string) => { if (!db) return; await deleteDoc(doc(db, "reports", reportId)); };
export const getAllUsers = async () => { if (!db) return []; try { const q = query(collection(db, "users")); const snapshot = await getDocs(q); return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfileData)); } catch (e) { console.error("Error fetching users", e); return []; } };
export const updateUserRole = async (targetUid: string, newRole: UserRole) => { if (!db) return; await updateDoc(doc(db, "users", targetUid), { role: newRole }); };
export const updateUserSystemPermissions = async (targetUid: string, permissions: SystemPermissions) => { if (!db) return; await updateDoc(doc(db, "users", targetUid), { systemPermissions: permissions }); };
export const toggleUserBan = async (targetUid: string, currentBanStatus: boolean) => { if (!db) return; const docRef = doc(db, "users", targetUid); if (currentBanStatus) await updateDoc(docRef, { isBanned: false, banExpiresAt: null }); else await updateDoc(docRef, { isBanned: true }); };
export const toggleUserMaintenance = async (targetUid: string, status: boolean) => { if(!db) return; await updateDoc(doc(db, "users", targetUid), { isUnderMaintenance: status }); };
export const toggleUserScreenshotRestriction = async (targetUid: string, status: boolean) => { if(!db) return; await updateDoc(doc(db, "users", targetUid), { isScreenshotRestricted: status }); };
export const setGlobalScreenshotRestriction = async (status: boolean) => { if(!db) return; await setDoc(doc(db, "system", "info"), { globalScreenshotRestriction: status }, { merge: true }); };
export const suspendUser = async (targetUid: string, hours: number) => { if (!db) return; const expireTime = Date.now() + (hours * 60 * 60 * 1000); await updateDoc(doc(db, "users", targetUid), { isBanned: true, banExpiresAt: expireTime }); };
export const checkAndLiftBan = async (uid: string, currentProfile: UserProfileData) => { if (!db || !currentProfile.isBanned || !currentProfile.banExpiresAt) return; if (currentProfile.role === 'owner' || currentProfile.role === 'developer') { await updateDoc(doc(db, "users", uid), { isBanned: false, banExpiresAt: null }); return; } if (Date.now() > currentProfile.banExpiresAt) { await updateDoc(doc(db, "users", uid), { isBanned: false, banExpiresAt: null }); } };

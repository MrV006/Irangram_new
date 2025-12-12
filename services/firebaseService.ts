
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
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable
} from "firebase/storage";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  signInAnonymously
} from "firebase/auth";
import { Message, SystemInfo, Contact, UserRole, UserProfileData, AppNotification, SettingsDoc, Report, Appeal, DeletionRequest, PollData, AdminPermissions } from "../types";
import { CONFIG } from "../config";

// Helper to remove undefined values
const sanitizeData = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key];
        }
    });
    return clean;
};

// --- AUTHENTICATION ---
export const subscribeToAuth = (callback: (user: User | null) => void) => {
    if (!auth) {
        console.warn("Auth module not initialized. Treating as logged out.");
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

export const registerUser = async (email: string, pass: string, name: string, phone: string) => {
    if (!auth) throw new Error("سرویس احراز هویت در دسترس نیست. لطفا اینترنت خود را بررسی کنید.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    let role: UserRole = 'user';
    if (email === CONFIG.OWNER_EMAIL) role = 'owner';
    else if (email === CONFIG.DEVELOPER_EMAIL || email === 'developer.irangram@gmail.com') role = 'developer';

    await updateProfile(user, { displayName: name });
    if (db) {
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            phone: phone,
            username: email.split('@')[0],
            bio: "کاربر جدید ایران‌گرام",
            avatar: `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128`,
            role: role,
            isBanned: false,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            status: 'online'
        });
    }
    return user;
};

export const loginUser = async (email: string, pass: string) => {
    if (!auth) throw new Error("سرویس احراز هویت در دسترس نیست.");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (db && userCredential.user) {
        const userRef = doc(db, "users", userCredential.user.uid);
        const updates: any = { status: 'online', lastSeen: serverTimestamp() };
        if (email === CONFIG.OWNER_EMAIL) updates.role = 'owner';
        if (email === CONFIG.DEVELOPER_EMAIL || email === 'developer.irangram@gmail.com') updates.role = 'developer';
        await setDoc(userRef, updates, { merge: true }).catch(e => console.log("Status update error", e));
    }
    return userCredential.user;
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
                    await firebaseSignOut(auth);
                    localStorage.setItem('irangram_auth_error', 'user-not-found');
                    localStorage.setItem('irangram_auth_retry_email', email);
                    localStorage.setItem('irangram_auth_retry_name', user.displayName || '');
                    const error: any = new Error("User not found");
                    error.code = 'custom/user-not-found';
                    throw error;
                }
                await setDoc(docRef, {
                    name: user.displayName || 'کاربر گوگل',
                    email: email,
                    phone: '', 
                    username: email.split('@')[0] || 'user',
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
                if (email === CONFIG.OWNER_EMAIL) updates.role = 'owner';
                if (email === CONFIG.DEVELOPER_EMAIL || email === 'developer.irangram@gmail.com') updates.role = 'developer';
                await setDoc(docRef, updates, { merge: true }).catch(e => console.log("Status update error", e));
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
    
    // Create a temporary guest profile
    if (db) {
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
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
    if (!auth) return;
    await sendPasswordResetEmail(auth, email);
};

export const updateUserPassword = async (newPassword: string) => {
    if (!auth || !auth.currentUser) throw new Error("No user logged in");
    await updatePassword(auth.currentUser, newPassword);
};

export const logoutUser = async (uid?: string) => {
    if (!auth) return;
    if (uid && db) {
        // Only update status if not guest, or let backend handle cleanup
        await updateDoc(doc(db, "users", uid), { status: 'offline', lastSeen: serverTimestamp() }).catch(() => {});
    }
    await firebaseSignOut(auth);
};

export const getUserProfile = async (uid: string) => {
    if (!db) return null;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            const currentUser = auth?.currentUser;
            if (currentUser && currentUser.uid === uid) {
                const email = currentUser.email;
                if (email === CONFIG.OWNER_EMAIL || email === CONFIG.DEVELOPER_EMAIL || email === 'developer.irangram@gmail.com') {
                     const role = email === CONFIG.OWNER_EMAIL ? 'owner' : 'developer';
                     const name = email === CONFIG.OWNER_EMAIL ? 'مدیر سیستم' : 'توسعه‌دهنده سیستم';
                     const newProfile = {
                        name: currentUser.displayName || name,
                        email: email,
                        phone: '',
                        username: role,
                        bio: 'حساب سیستمی',
                        avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${role}&background=random&color=fff`,
                        role: role,
                        isBanned: false,
                        createdAt: serverTimestamp(),
                        lastSeen: serverTimestamp(),
                        status: 'online'
                     };
                     await setDoc(docRef, newProfile);
                     return newProfile;
                }
            }
        }
    } catch (e) {
        console.error("Error fetching profile", e);
    }
    return null;
};

// --- CHAT PREFERENCES (PIN/ARCHIVE) ---
export const updateUserChatPreference = async (uid: string, contactId: string, updates: { isPinned?: boolean; isArchived?: boolean }) => {
    if (!db) return;
    // We store preferences in a sub-collection 'preferences' under the user
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
        snapshot.forEach(doc => {
            prefs[doc.id] = doc.data();
        });
        callback(prefs);
    });
};

export const subscribeToUserProfile = (uid: string, callback: (data: UserProfileData) => void) => {
    if (!db) return () => {};
    const docRef = doc(db, "users", uid);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ uid: docSnap.id, ...docSnap.data() } as UserProfileData);
        }
    });
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

export const searchUser = async (term: string): Promise<UserProfileData | null> => {
    if (!db) return null;
    let q = query(collection(db, "users"), where("username", "==", term.replace('@', '')));
    let snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { uid: doc.id, ...doc.data() } as UserProfileData;
    }
    q = query(collection(db, "users"), where("phone", "==", term));
    snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { uid: doc.id, ...doc.data() } as UserProfileData;
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
            snapshot.forEach(doc => {
                results.push({ uid: doc.id, ...doc.data() } as UserProfileData);
            });
        } catch (e) {
            console.error("Error syncing batch", e);
        }
    }
    return results;
};

// --- GROUPS & CHANNELS MANAGEMENT ---

export const createGroup = async (name: string, description: string, imageFile: File | null, memberIds: string[], creatorId: string, isChannel: boolean = false) => {
    if (!db) return null;

    let avatarUrl = `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128`;
    if (imageFile && storage) {
        try {
            const path = `groups/${Date.now()}_${imageFile.name}`;
            avatarUrl = await uploadMedia(imageFile, path);
        } catch (e) {
            console.error("Group image upload failed", e);
        }
    }

    const finalMembers = [...new Set([...memberIds, creatorId])];
    const type = isChannel ? 'channel' : 'group';

    const groupRef = await addDoc(collection(db, "chats"), {
        participants: finalMembers,
        updatedAt: serverTimestamp(),
        lastMessage: isChannel ? 'کانال ایجاد شد' : 'گروه ایجاد شد',
        type: type,
        name,
        avatar: avatarUrl,
        description,
        creatorId,
        admins: [creatorId],
        adminPermissions: { [creatorId]: { canDeleteMessages: true, canBanUsers: true, canPinMessages: true, canChangeInfo: true, canAddAdmins: true } },
        slowMode: 0
    });

    return { id: groupRef.id, name, avatar: avatarUrl, type: type };
};

export const getGroupInviteLink = (groupId: string) => {
    return `https://mrv006.github.io/Irangram/?join=${groupId}`;
};

export const joinGroupViaLink = async (groupId: string, userId: string) => {
    if (!db) return null;
    try {
        const chatRef = doc(db, "chats", groupId);
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) return null;
        
        const data = chatSnap.data();
        if (data.participants && data.participants.includes(userId)) return data;

        await updateDoc(chatRef, {
            participants: arrayUnion(userId)
        });
        return data;
    } catch (e) {
        console.error("Join group error", e);
        return null;
    }
};

export const leaveGroup = async (chatId: string, userId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        participants: arrayRemove(userId),
        admins: arrayRemove(userId) 
    });
};

export const addGroupMember = async (chatId: string, targetUserId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        participants: arrayUnion(targetUserId)
    });
};

export const removeGroupMember = async (chatId: string, targetUserId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        participants: arrayRemove(targetUserId),
        admins: arrayRemove(targetUserId)
    });
};

export const promoteToGroupAdmin = async (chatId: string, targetUserId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        admins: arrayUnion(targetUserId),
        [`adminPermissions.${targetUserId}`]: { canDeleteMessages: true, canBanUsers: true, canPinMessages: true, canChangeInfo: true, canAddAdmins: false }
    });
};

export const updateGroupAdminPermissions = async (chatId: string, targetUserId: string, permissions: AdminPermissions) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        [`adminPermissions.${targetUserId}`]: permissions
    });
};

export const updateChatSlowMode = async (chatId: string, delaySeconds: number) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { slowMode: delaySeconds });
};

export const demoteGroupAdmin = async (chatId: string, targetUserId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        admins: arrayRemove(targetUserId)
    });
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

export const getGroupDetails = async (chatId: string) => {
    if (!db) return null;
    const chatRef = doc(db, "chats", chatId);
    const snap = await getDoc(chatRef);
    return snap.exists() ? snap.data() : null;
};

export const isGroupAdmin = async (chatId: string, userId: string): Promise<boolean> => {
    if (!db) return false;
    try {
        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
            const admins = chatSnap.data().admins || [];
            const creator = chatSnap.data().creatorId;
            return admins.includes(userId) || creator === userId;
        }
    } catch(e) {}
    return false;
};

// --- PRESENCE & HEARTBEAT ---
export const updateUserHeartbeat = async (uid: string, status: 'online' | 'offline') => {
    if(!db) return;
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, { status: status, lastSeen: serverTimestamp() });
    } catch(e) { console.error("Heartbeat error", e); }
};

export const setUserTyping = async (uid: string, isTyping: boolean) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    try { await updateDoc(userRef, { status: isTyping ? 'typing...' : 'online' }); } catch(e) {}
};

export const subscribeToAllUsers = (callback: (users: Partial<UserProfileData>[]) => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "users"));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            status: (doc.data() as any).status,
            lastSeen: (doc.data() as any).lastSeen ? ((doc.data() as any).lastSeen as Timestamp).toMillis() : Date.now(),
            name: (doc.data() as any).name,
            avatar: (doc.data() as any).avatar
        }));
        callback(users);
    });
};

// --- STORAGE ---
export const uploadMedia = async (file: File | Blob, path: string): Promise<string> => {
    if (!storage) throw new Error("سرویس ذخیره‌سازی فایل در دسترس نیست.");
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const uploadMediaWithProgress = (file: File | Blob, path: string, onProgress: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!storage) {
            reject(new Error("Storage not available"));
            return;
        }
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            }, 
            (error) => {
                reject(error);
            }, 
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};

export const setChatPin = async (chatId: string, message: { id: string, text: string, sender: string, type: string }) => {
    if (!db) return;
    if (chatId === 'global_chat') {
        await setDoc(doc(db, "chat_metadata", chatId), { pinnedMessage: message, updatedAt: serverTimestamp() }, { merge: true });
    } else {
        await updateDoc(doc(db, "chats", chatId), { pinnedMessage: message });
    }
};

export const removeChatPin = async (chatId: string) => {
    if (!db) return;
    if (chatId === 'global_chat') {
        await updateDoc(doc(db, "chat_metadata", chatId), { pinnedMessage: null });
    } else {
        await updateDoc(doc(db, "chats", chatId), { pinnedMessage: null });
    }
};

export const subscribeToChatPin = (chatId: string, callback: (data: any) => void) => {
    if (!db) return () => {};
    if (chatId === 'global_chat') {
        return onSnapshot(doc(db, "chat_metadata", chatId), (docSnap) => {
            if (docSnap.exists()) callback(docSnap.data().pinnedMessage);
            else callback(null);
        });
    } else {
        return onSnapshot(doc(db, "chats", chatId), (docSnap) => {
             if (docSnap.exists()) callback(docSnap.data().pinnedMessage);
             else callback(null);
        });
    }
};

export const getChatId = (uid1: string, uid2: string) => {
    if (uid2 === 'saved') return `saved_${uid1}`;
    return [uid1, uid2].sort().join('_');
};

export const subscribeToGlobalChat = (callback: (messages: Message[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({ id: doc.id, ...data, timestamp: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now(), status: 'read', reactions: data.reactions || {} } as Message);
        });
        callback(messages.reverse());
    });
};

export const sendGlobalMessage = async (message: Partial<Message>, userProfile: { name: string, avatar?: string, role?: UserRole }) => {
    if (!db) return;
    try {
        let finalText = message.text || '';
        if (finalText && message.type === 'text') {
            const bannedWords = await getWordFilters();
            bannedWords.forEach(word => { const regex = new RegExp(word, 'gi'); finalText = finalText.replace(regex, '*'.repeat(word.length)); });
        }
        const safeMessage = sanitizeData(message);
        await addDoc(collection(db, "global_chat"), { ...safeMessage, text: finalText, senderName: userProfile.name, senderAvatar: userProfile.avatar || '', senderRole: userProfile.role || 'user', createdAt: serverTimestamp(), edited: false, reactions: {} });
    } catch (e) { console.error(e); }
};

export const subscribeToPrivateChat = (chatId: string, callback: (messages: Message[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({ id: doc.id, ...data, timestamp: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now(), status: 'read', reactions: data.reactions || {} } as Message);
        });
        callback(messages.reverse());
    });
};

export const editPrivateMessage = async (chatId: string, messageId: string, newText: string) => {
    if (!db) return;
    try { await updateDoc(doc(db, "chats", chatId, "messages", messageId), { text: newText, edited: true }); } catch (e) {}
};

export const subscribeToUserChats = (uid: string, callback: (chats: any[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "chats"), where("participants", "array-contains", uid));
    return onSnapshot(q, (querySnapshot) => {
        const chats = querySnapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { 
                id: doc.id, 
                ...data, 
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toMillis() : Date.now(),
                pinnedMessage: data.pinnedMessage || null
            };
        });
        chats.sort((a, b) => b.updatedAt - a.updatedAt);
        callback(chats);
    });
};

export const sendPrivateMessage = async (chatId: string, receiverId: string, message: Partial<Message>, userProfile: { name: string, avatar?: string }) => {
    if (!db) return;
    const chatRef = doc(db, "chats", chatId);
    const currentUser = auth.currentUser;
    const participants = receiverId === 'saved' ? [currentUser?.uid] : [currentUser?.uid, receiverId];

    await setDoc(chatRef, { participants, updatedAt: serverTimestamp(), lastMessage: message.text || (message.type === 'poll' ? '📊 نظرسنجی' : 'رسانه'), lastSenderId: currentUser?.uid }, { merge: true });
    const safeMessage = sanitizeData(message);
    await addDoc(collection(db, "chats", chatId, "messages"), { ...safeMessage, senderName: userProfile.name, senderAvatar: userProfile.avatar || '', createdAt: serverTimestamp(), reactions: {} });
};

// --- POLLS ---
export const castPollVote = async (chatId: string, messageId: string, optionId: string, userId: string, isGlobal: boolean = false) => {
    if (!db) return;
    const collectionPath = isGlobal ? "global_chat" : `chats/${chatId}/messages`;
    const msgRef = doc(db, collectionPath, messageId);
    
    try {
        const snap = await getDoc(msgRef);
        if (snap.exists()) {
            const data = snap.data();
            const poll = data.poll as PollData;
            
            if (poll.isClosed) return;

            let newOptions = poll.options.map(opt => {
                // If not multi-choice, remove user from other options
                if (!poll.allowMultiple && opt.id !== optionId && opt.voterIds.includes(userId)) {
                    return { ...opt, voterIds: opt.voterIds.filter(id => id !== userId) };
                }
                return opt;
            });

            newOptions = newOptions.map(opt => {
                if (opt.id === optionId) {
                    if (opt.voterIds.includes(userId)) {
                        // Toggle off
                        return { ...opt, voterIds: opt.voterIds.filter(id => id !== userId) };
                    } else {
                        // Toggle on
                        return { ...opt, voterIds: [...opt.voterIds, userId] };
                    }
                }
                return opt;
            });

            await updateDoc(msgRef, { "poll.options": newOptions });
        }
    } catch(e) {
        console.error("Voting failed", e);
    }
};

export const toggleMessageReaction = async (messageId: string, emoji: string, userId: string) => {
    if (!db) return;
    const msgRef = doc(db, "global_chat", messageId);
    try {
        const snap = await getDoc(msgRef);
        if (snap.exists()) {
            const data = snap.data();
            const reactions = data.reactions || {};
            const userList = reactions[emoji] || [];
            let newReactions = { ...reactions };
            if (userList.includes(userId)) {
                newReactions[emoji] = userList.filter((id: string) => id !== userId);
                if (newReactions[emoji].length === 0) delete newReactions[emoji];
            } else {
                newReactions[emoji] = [...userList, userId];
            }
            await updateDoc(msgRef, { reactions: newReactions });
        }
    } catch (e) {}
};
export const subscribeToSystemInfo = (callback: (info: SystemInfo & { forceUpdate: number, maintenanceMode?: boolean }) => void) => {
    if (!db) return () => {};
    const docRef = doc(db, "system", "info");
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({ 
                currentVersion: data.currentVersion || CONFIG.VERSION, 
                lastCleanup: data.lastCleanup ? (data.lastCleanup as Timestamp).toMillis() : 0, 
                forceUpdate: data.forceUpdate ? (data.forceUpdate as Timestamp).toMillis() : 0,
                maintenanceMode: data.maintenanceMode || false 
            });
        } else {
            setDoc(docRef, { currentVersion: CONFIG.VERSION, lastCleanup: serverTimestamp(), maintenanceMode: false });
        }
    });
};
export const checkAndTriggerCleanup = async () => { if (!db) return; };
export const triggerSystemUpdate = async () => { if(!db) return; await setDoc(doc(db, "system", "info"), { forceUpdate: serverTimestamp() }, { merge: true }); };
export const wipeSystemData = async () => { if(!db) return; await clearGlobalChat(); };
export const setGlobalMaintenance = async (status: boolean) => { if(!db) return; await setDoc(doc(db, "system", "info"), { maintenanceMode: status }, { merge: true }); };
export const deleteUserAccount = async (targetUid: string) => { if(!db) return; try { await deleteDoc(doc(db, "users", targetUid)); } catch(e) {} };
export const getWordFilters = async (): Promise<string[]> => {
    if (!db) return [];
    const docRef = doc(db, "settings", "wordFilters");
    const snap = await getDoc(docRef);
    if (snap.exists()) return (snap.data() as any).bannedWords || [];
    return [];
};
export const updateWordFilters = async (words: string[]) => {
    if (!db) return;
    await setDoc(doc(db, "settings", "wordFilters"), { bannedWords: words }, { merge: true });
};
export const getAdminSpyChats = async (targetUid: string): Promise<Contact[]> => {
    if (!db) return [];
    const chats: Contact[] = [
        { id: 'global_chat', name: 'چت عمومی جهانی', avatar: 'https://cdn-icons-png.flaticon.com/512/921/921490.png', status: 'online', bio: 'Surveillance View', username: '@global_world', phone: '', type: 'group', isGlobal: true }
    ];
    try {
        chats.push({ id: `saved_${targetUid}`, name: 'پیام‌های ذخیره شده (Cloud)', avatar: '', status: 'online', bio: 'Personal Saved Messages', username: 'saved', phone: '', type: 'user', isGlobal: false });
        const q = query(collection(db, "chats"), where("participants", "array-contains", targetUid));
        const snapshot = await getDocs(q);
        const chatPromises = snapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            const participants = data.participants || [];
            if (data.type === 'group' || data.type === 'channel') {
                 return { id: docSnapshot.id, name: data.name || 'Group', avatar: data.avatar, status: 'online', bio: data.type === 'channel' ? 'Channel' : 'Group', username: '', phone: '', type: data.type, isGlobal: false } as Contact;
            } else {
                const otherId = participants.find((id: string) => id !== targetUid);
                if (otherId) {
                    const otherProfile = await getUserProfile(otherId);
                    return { id: docSnapshot.id, name: otherProfile ? `چت با: ${otherProfile.name}` : `User: ${otherId}`, avatar: otherProfile?.avatar, status: 'offline', bio: 'Private Chat', username: otherProfile?.username || '', phone: '', type: 'user', isGlobal: false } as Contact;
                }
            }
            return null;
        });
        const resolvedChats = await Promise.all(chatPromises);
        return [...chats, ...resolvedChats.filter(c => c !== null) as Contact[]];
    } catch (e) { return chats; }
};
export const getAdminSpyMessages = async (targetUid: string, chatId: string): Promise<Message[]> => {
    if (!db) return [];
    try {
        let q;
        if (chatId === 'global_chat') {
            q = query(collection(db, "global_chat"), orderBy("createdAt", "desc"), limit(100));
        } else if (chatId.startsWith('saved_')) {
            q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(100));
        } else {
            q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(100));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { id: doc.id, ...data, timestamp: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as Message;
        }).reverse();
    } catch (e) { return []; }
};
export const adminSendMessageAsUser = async (chatId: string, spoofedSenderId: string, text: string) => {
    if (!db || !text.trim()) return;
    try {
        const userProfile = await getUserProfile(spoofedSenderId);
        const messageData = { text, senderId: spoofedSenderId, senderName: userProfile?.name || 'User', senderAvatar: userProfile?.avatar || '', type: 'text', createdAt: serverTimestamp(), isSticker: false, reactions: {} };
        if (chatId === 'global_chat') {
            await addDoc(collection(db, "global_chat"), messageData);
        } else {
            await addDoc(collection(db, "chats", chatId, "messages"), messageData);
            await setDoc(doc(db, "chats", chatId), { lastMessage: text, lastSenderId: spoofedSenderId, updatedAt: serverTimestamp() }, { merge: true });
        }
    } catch(e) {}
};
export const forceJoinGroup = async (groupId: string, userId: string) => {
    if (!db) return;
    const chatRef = doc(db, "chats", groupId);
    await updateDoc(chatRef, { participants: arrayUnion(userId), admins: arrayUnion(userId) });
};
export const getAllGroups = async (): Promise<any[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, "chats"), where("type", "in", ["group", "channel"]));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) { return []; }
};
export const sendSystemNotification = async (targetUid: string, title: string, message: string) => {
    if (!db) return;
    try { await addDoc(collection(db, "users", targetUid, "notifications"), { title, message, type: 'alert', read: false, createdAt: serverTimestamp() }); } catch (e) {}
};
export const subscribeToNotifications = (uid: string, callback: (notifs: AppNotification[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "users", uid, "notifications"), where("read", "==", false));
    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { id: doc.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as AppNotification;
        });
        notifs.sort((a, b) => b.createdAt - a.createdAt);
        callback(notifs);
    });
};
export const markNotificationRead = async (uid: string, notifId: string) => { if(!db) return; await updateDoc(doc(db, "users", uid, "notifications", notifId), { read: true }); };
export const editMessageGlobal = async (messageId: string, newText: string) => { if (!db) return; try { await updateDoc(doc(db, "global_chat", messageId), { text: newText, edited: true }); } catch (e) {} };
export const clearGlobalChat = async () => { if (!db) return; try { const q = query(collection(db, "global_chat")); const snapshot = await getDocs(q); const batch = writeBatch(db); let count = 0; snapshot.forEach((doc) => { batch.delete(doc.ref); count++; if (count >= 490) return; }); await batch.commit(); } catch (e) {} };
export const deleteMessageGlobal = async (messageId: string) => { if (!db) return; try { await deleteDoc(doc(db, "global_chat", messageId)); } catch (e) {} };
export const deletePrivateMessage = async (chatId: string, messageId: string) => { if (!db) return; try { await deleteDoc(doc(db, "chats", chatId, "messages", messageId)); } catch (e) {} };
export const deleteChat = async (chatId: string) => { if(!db) return; try { await deleteDoc(doc(db, "chats", chatId)); } catch(e) {} };
export const clearPrivateChatHistory = async (chatId: string) => { if (!db) return; try { const q = query(collection(db, "chats", chatId, "messages"), limit(500)); const snapshot = await getDocs(q); const batch = writeBatch(db); snapshot.docs.forEach((doc) => batch.delete(doc.ref)); await batch.commit(); } catch (e) {} };
export const blockUser = async (currentUid: string, targetUid: string) => { if(!db) return; try { await setDoc(doc(db, "users", currentUid, "blocked", targetUid), { blockedAt: serverTimestamp(), uid: targetUid }); } catch (e) {} };
export const unblockUser = async (currentUid: string, targetUid: string) => { if(!db) return; try { await deleteDoc(doc(db, "users", currentUid, "blocked", targetUid)); } catch (e) {} };
export const checkBlockedStatus = async (currentUid: string, targetUid: string) => { if(!db) return false; try { const docRef = doc(db, "users", currentUid, "blocked", targetUid); const snap = await getDoc(docRef); return snap.exists(); } catch { return false; } };
export const sendBanAppeal = async (senderUid: string, senderName: string, appealText: string) => { if (!db) return; await addDoc(collection(db, "appeals"), { userId: senderUid, userName: senderName, message: appealText, status: 'pending', createdAt: serverTimestamp() }); };
export const subscribeToAppeals = (callback: (appeals: Appeal[]) => void) => { if (!db) return () => {}; const q = query(collection(db, "appeals"), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => { const appeals = snapshot.docs.map(doc => { const data = doc.data() as any; return { id: doc.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as Appeal; }); callback(appeals); }); };
export const resolveAppeal = async (appealId: string, accepted: boolean) => { if (!db) return; await updateDoc(doc(db, "appeals", appealId), { status: accepted ? 'approved' : 'rejected' }); };
export const deleteAppeal = async (appealId: string) => { if (!db) return; await deleteDoc(doc(db, "appeals", appealId)); };
export const requestAccountDeletion = async (userId: string, userName: string, reason: string) => { if (!db) return; const q = query(collection(db, "deletion_requests"), where("userId", "==", userId)); const snap = await getDocs(q); if (snap.empty) { await addDoc(collection(db, "deletion_requests"), { userId, userName, reason, createdAt: serverTimestamp() }); } else { throw new Error("یک درخواست حذف هم‌اکنون در جریان است."); } };
export const subscribeToDeletionRequests = (callback: (requests: DeletionRequest[]) => void) => { if (!db) return () => {}; const q = query(collection(db, "deletion_requests"), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => { const requests = snapshot.docs.map(doc => { const data = doc.data() as any; return { id: doc.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now() } as DeletionRequest; }); callback(requests); }); };
export const resolveDeletionRequest = async (requestId: string, userId: string, approve: boolean) => { if (!db) return; if (approve) await deleteUserAccount(userId); await deleteDoc(doc(db, "deletion_requests", requestId)); };
export const sendReport = async (messageId: string, messageContent: string, reportedUserId: string, reportedUserName: string, reporterId: string, reason: string) => { if (!db) return; await addDoc(collection(db, "reports"), { messageId, messageContent, reportedUserId, reportedUserName, reporterId, reason, status: 'pending', createdAt: serverTimestamp() }); };
export const subscribeToReports = (callback: (reports: Report[]) => void) => { if (!db) return () => {}; const q = query(collection(db, "reports"), orderBy("createdAt", "desc")); return onSnapshot(q, (snapshot) => { const reports = snapshot.docs.map(doc => { const data = doc.data() as any; return { id: doc.id, ...data, createdAt: data.createdAt ? (data.createdAt as Timestamp).toMillis() : Date.now(), handledAt: data.handledAt ? (data.handledAt as Timestamp).toMillis() : undefined } as Report; }); callback(reports); }); };
export const handleReport = async (reportId: string, adminName: string) => { if (!db) return; await updateDoc(doc(db, "reports", reportId), { status: 'handled', handledBy: adminName, handledAt: serverTimestamp() }); };
export const deleteReport = async (reportId: string) => { if (!db) return; await deleteDoc(doc(db, "reports", reportId)); };
export const getAllUsers = async () => { if (!db) return []; try { const q = query(collection(db, "users"), orderBy("createdAt", "desc")); const snapshot = await getDocs(q); return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfileData)); } catch (e) { console.error("Error fetching users", e); return []; } };
export const updateUserRole = async (targetUid: string, newRole: UserRole) => { if (!db) return; await updateDoc(doc(db, "users", targetUid), { role: newRole }); };
export const toggleUserBan = async (targetUid: string, currentBanStatus: boolean) => { if (!db) return; const docRef = doc(db, "users", targetUid); if (currentBanStatus) await updateDoc(docRef, { isBanned: false, banExpiresAt: null }); else await updateDoc(docRef, { isBanned: true }); };
export const toggleUserMaintenance = async (targetUid: string, status: boolean) => { if(!db) return; await updateDoc(doc(db, "users", targetUid), { isUnderMaintenance: status }); };
export const suspendUser = async (targetUid: string, hours: number) => { if (!db) return; const expireTime = Date.now() + (hours * 60 * 60 * 1000); await updateDoc(doc(db, "users", targetUid), { isBanned: true, banExpiresAt: expireTime }); };
export const checkAndLiftBan = async (uid: string, currentProfile: UserProfileData) => { if (!db || !currentProfile.isBanned || !currentProfile.banExpiresAt) return; if (currentProfile.role === 'owner' || currentProfile.role === 'developer') { await updateDoc(doc(db, "users", uid), { isBanned: false, banExpiresAt: null }); return; } if (Date.now() > currentProfile.banExpiresAt) { await updateDoc(doc(db, "users", uid), { isBanned: false, banExpiresAt: null }); } };

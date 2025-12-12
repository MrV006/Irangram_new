
import { db } from "../firebaseConfig";
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global reference to peer connection
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;

export const initializeWebRTC = async (isVideo: boolean = false) => {
    pc = new RTCPeerConnection(servers);
    
    // Setup local stream
    localStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
    });

    // Setup remote stream placeholder
    remoteStream = new MediaStream();

    // Add tracks to PC
    localStream.getTracks().forEach((track) => {
        if(pc && localStream) pc.addTrack(track, localStream);
    });

    // Listen for remote tracks
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            if(remoteStream) remoteStream.addTrack(track);
        });
    };

    return { pc, localStream, remoteStream };
};

// --- Caller Side ---
export const createCall = async (callerId: string, calleeId: string, callerName: string, callerAvatar: string, isVideo: boolean) => {
    if (!pc) return null;

    // Reference to call doc
    const callDoc = doc(collection(db, "calls"));
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    // Save Caller Candidates
    pc.onicecandidate = (event) => {
        if(event.candidate) {
            addDoc(offerCandidates, event.candidate.toJSON());
        }
    };

    // Create Offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    };

    await setDoc(callDoc, {
        callerId,
        calleeId,
        callerName,
        callerAvatar,
        offer,
        isVideo,
        status: 'offering',
        createdAt: serverTimestamp()
    });

    // Listen for Answer
    const unsubscribe = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        // Check if pc exists before accessing properties or methods
        if (pc && !pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription).catch(e => console.error("Set remote desc error", e));
        }
        if (data?.status === 'ended') {
            // Call ended by remote
            window.dispatchEvent(new CustomEvent('callEnded'));
        }
    });

    // Listen for Callee Candidates
    onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && pc) {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate).catch(e => console.error("Add ICE candidate error", e));
            }
        });
    });

    return { callId: callDoc.id, unsubscribe };
};

// --- Callee Side ---
export const answerCall = async (callId: string) => {
    if (!pc) return;

    const callDoc = doc(db, "calls", callId);
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    pc.onicecandidate = (event) => {
        if(event.candidate) {
            addDoc(answerCandidates, event.candidate.toJSON());
        }
    };

    const callSnapshot = await getDoc(callDoc);
    const callData = callSnapshot.data();
    
    // Check pc again as it might have been closed during the async fetch
    if (!callData || !pc) return;

    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer, status: 'connected' });

    // Listen for Offer Candidates
    onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && pc) {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate).catch(e => console.error("Add ICE candidate error", e));
            }
        });
    });
    
    // Listen for hangup
    const unsubscribe = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended') {
             window.dispatchEvent(new CustomEvent('callEnded'));
        }
    });
    
    return unsubscribe;
};

// --- Hangup ---
export const endCall = async (callId: string) => {
    // Cleanup Local
    if (pc) {
        pc.close();
        pc = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Update DB
    if (callId) {
        const callDoc = doc(db, "calls", callId);
        try {
            await updateDoc(callDoc, { status: 'ended' });
        } catch (e) {
            console.log("Call doc already deleted or not found");
        }
        // Optionally delete doc after a delay
        setTimeout(() => deleteDoc(callDoc).catch(() => {}), 2000); 
    }
};

// --- Listen for Incoming Calls ---
export const subscribeToIncomingCalls = (userId: string, callback: (call: any) => void) => {
    const q = query(
        collection(db, "calls"), 
        where("calleeId", "==", userId), 
        where("status", "==", "offering")
    );
    
    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                callback({ id: change.doc.id, ...change.doc.data() });
            }
        });
    });
};

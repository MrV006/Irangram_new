
import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

interface CallModalProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isIncoming: boolean;
  callerName: string;
  callerAvatar: string;
  isVideo: boolean;
  onAccept?: () => void;
  onReject: () => void;
  status: string;
}

const CallModal: React.FC<CallModalProps> = ({ 
  localStream, remoteStream, isIncoming, callerName, callerAvatar, isVideo, onAccept, onReject, status 
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
      if (localStream) {
          localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
          setIsMuted(!isMuted);
      }
  };

  const toggleVideo = () => {
      if (localStream) {
          localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
          setIsVideoOff(!isVideoOff);
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col animate-fade-in">
      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {status === 'connected' ? (
            <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
            />
        ) : (
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 mb-6 shadow-2xl">
                    <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{callerName}</h2>
                <p className="text-white/60 text-lg">{status === 'incoming' ? 'تماس ورودی...' : status}</p>
            </div>
        )}

        {/* Local Video (PiP) */}
        {localStream && status === 'connected' && (
            <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-xl border-2 border-white/20 overflow-hidden shadow-2xl transition-all hover:scale-105">
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                />
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800/80 backdrop-blur-md p-6 pb-10 flex justify-center items-center gap-8 rounded-t-3xl border-t border-white/10 relative -mt-6">
          {isIncoming ? (
              <>
                <div className="flex flex-col items-center gap-2">
                    <button onClick={onReject} className="p-5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-transform hover:scale-110 animate-bounce">
                        <PhoneOff size={32} />
                    </button>
                    <span className="text-white/80 text-sm">رد تماس</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <button onClick={onAccept} className="p-5 bg-green-500 rounded-full text-white shadow-lg hover:bg-green-600 transition-transform hover:scale-110 animate-bounce delay-100">
                        <Phone size={32} />
                    </button>
                    <span className="text-white/80 text-sm">پاسخ</span>
                </div>
              </>
          ) : (
              <>
                <button onClick={toggleMute} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                
                <button onClick={onReject} className="p-6 bg-red-600 rounded-full text-white shadow-xl hover:bg-red-700 transition-transform hover:scale-105">
                    <PhoneOff size={36} />
                </button>

                <button onClick={toggleVideo} className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
                </button>
              </>
          )}
      </div>
    </div>
  );
};

export default CallModal;

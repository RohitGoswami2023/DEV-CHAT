import { useContext, useEffect, useRef } from "react";
import { CallContext } from "../../context/CallContext.jsx";
import assets from "../assets/assets.js";

const CallModal = () => {
  const {
    call, callActive, callAccepted, outgoingCall,
    answerCall, rejectCall, endCall, toggleMute, isMuted,
    remoteAudioRef, localAudioRef, stream, remoteStream,
  } = useContext(CallContext);

  // Attach streams to audio elements
  useEffect(() => {
    if (localAudioRef.current && stream) localAudioRef.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (!callActive) return null;

  const isIncoming = !!call && !callAccepted && !outgoingCall;
  const isOutgoing = !!outgoingCall && !callAccepted;
  const isConnected = callAccepted;

  const callerName = call?.callerName || outgoingCall?.name || "Unknown";
  const callerPic = call?.callerPic || outgoingCall?.pic;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <audio ref={localAudioRef} autoPlay muted className="hidden" />
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-white/10 w-80 overflow-hidden">
        
        {/* Avatar + Name */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6 gap-4">
          <div className="relative">
            <img
              src={callerPic || assets.avatar_icon}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white/20 shadow-xl"
              alt={callerName}
            />
            {isConnected && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-800 animate-pulse" />
            )}
          </div>
          <div className="text-center">
            <h2 className="text-white text-xl font-bold tracking-wide">{callerName}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {isIncoming ? "Incoming voice call…" : isOutgoing ? "Calling…" : "Connected"}
            </p>
            {isConnected && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                <span className="text-green-400 text-xs font-semibold">Voice call active</span>
              </div>
            )}
          </div>
        </div>

        {/* Wave animation for outgoing/connected */}
        {(isOutgoing || isConnected) && (
          <div className="flex justify-center gap-1 pb-4">
            {[1,2,3,4,5].map(i => (
              <span
                key={i}
                className="w-1 bg-indigo-400 rounded-full"
                style={{ height: `${Math.random() * 16 + 8}px`, animation: `pulse ${0.6 + i * 0.1}s ease-in-out infinite alternate` }}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-8">
          {isIncoming && !callAccepted ? (
            <div className="flex justify-center gap-8">
              {/* Reject */}
              <button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
                title="Decline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              {/* Accept */}
              <button
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 animate-bounce"
                title="Accept"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              {/* Mute toggle */}
              {isConnected && (
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              )}
              {/* End call */}
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
                title="End call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;

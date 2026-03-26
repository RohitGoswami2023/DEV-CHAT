import { useContext, useEffect, useRef } from "react";
import { CallContext } from "../context/CallContext.jsx";
import assets from "../assets/assets.js";

const CallModal = () => {
  const {
    call, callActive, callAccepted, outgoingCall,
    answerCall, rejectCall, endCall, toggleMute, isMuted,
    remoteAudioRef, localAudioRef, stream, remoteStream,
    isMinimized, setIsMinimized, duration, formatDuration,
    isSpeaker, toggleSpeaker
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

  // --- MINIMIZED FLOATING VIEW ---
  if (isMinimized && isConnected) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[300] bg-slate-800/90 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:scale-105 transition-all group"
      >
        <img src={callerPic || assets.avatar_icon} className="w-10 h-10 rounded-full object-cover" alt="" />
        <div>
          <p className="text-white text-xs font-bold">{callerName}</p>
          <p className="text-green-400 text-[10px] font-mono">{formatDuration(duration)}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); endCall(); }} 
          className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-xl animate-in fade-in duration-300 p-4">
      <audio ref={localAudioRef} autoPlay muted className="hidden" />
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/20 w-full max-w-sm overflow-hidden relative transition-all duration-500">
        
        {/* TOP BAR / MINIMIZE */}
        {isConnected && (
          <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center z-20">
            <button onClick={() => setIsMinimized(true)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
              <span className="text-white text-sm font-mono font-bold tracking-tight">{formatDuration(duration)}</span>
            </div>
            <div className="w-10" />
          </div>
        )}

        {/* Avatar + Name */}
        <div className="flex flex-col items-center pt-20 pb-12 px-8 gap-8">
          <div className="relative">
            <div className={`absolute -inset-8 bg-indigo-500/30 rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
            <img
              src={callerPic || assets.avatar_icon}
              className="w-36 h-36 rounded-full object-cover ring-4 ring-white/30 shadow-2xl relative z-10 scale-100 hover:scale-105 transition-transform"
              alt={callerName}
            />
            {isConnected && (
              <div className="absolute bottom-3 right-3 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900 z-20 shadow-lg" />
            )}
          </div>
          <div className="text-center relative z-10">
            <h2 className="text-white text-3xl font-black tracking-tighter drop-shadow-md">{callerName}</h2>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 shadow-sm">
              {isConnected && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-[0.2em]">
                {isIncoming ? "Incoming Call" : isOutgoing ? "Calling..." : "Encrypted Call"}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-8 pb-12">
          {isIncoming && !callAccepted ? (
            <div className="flex justify-center gap-12">
              <button
                onClick={rejectCall}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all hover:scale-110 active:scale-95 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white rotate-[135deg] group-hover:rotate-[145deg] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
              <button
                onClick={answerCall}
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all hover:scale-110 active:scale-95 animate-[bounce_2s_infinite]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex justify-center gap-8">
                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all border shadow-lg ${isMuted ? 'bg-red-500 border-red-400 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  )}
                </button>

                {/* Speaker */}
                <button
                  onClick={toggleSpeaker}
                  className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all border shadow-lg ${isSpeaker ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill={isSpeaker ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </div>

              {/* End */}
              <button
                onClick={endCall}
                className="w-full py-5 rounded-[2rem] bg-red-500 hover:bg-red-600 text-white font-black text-lg flex items-center justify-center gap-4 shadow-[0_10px_40px_rgba(239,68,68,0.4)] transition-all hover:scale-[1.03] active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center rotate-[135deg] group-hover:rotate-[145deg] transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                End Call
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;

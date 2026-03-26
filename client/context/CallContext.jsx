import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";
import SimplePeer from "simple-peer";
import toast from "react-hot-toast";

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const { socket, authUser } = useContext(AuthContext);

  const [call, setCall] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0); 
  const [callLogs, setCallLogs] = useState([]);

  const peerRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTargetRef = useRef(null);
  const timerRef = useRef(null);

  const getStream = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStream(s);
      return s;
    } catch (err) {
      toast.error("Microphone access denied");
      return null;
    }
  };

  const callUser = async (toUser) => {
    const s = await getStream();
    if (!s) return;
    callTargetRef.current = toUser._id;
    setOutgoingCall({ to: toUser._id, name: toUser.fullName, pic: toUser.profilePic });
    setCallActive(true);

    const peer = new SimplePeer({ initiator: true, trickle: false, stream: s });

    peer.on("signal", (signalData) => {
      socket.emit("callUser", {
        to: toUser._id,
        signalData,
        from: authUser._id,
        callerName: authUser.fullName,
        callerPic: authUser.profilePic,
      });
    });

    peer.on("stream", (remote) => {
      setRemoteStream(remote);
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
    });

    peer.on("error", (err) => { console.error("Peer error:", err); endCall(); });

    socket.once("callAnswered", (signal) => {
      setCallAccepted(true);
      setOutgoingCall(null);
      peer.signal(signal);
    });

    peerRef.current = peer;
  };

  const answerCall = async () => {
    const s = await getStream();
    if (!s || !call) return;
    callTargetRef.current = call.from;
    setCallAccepted(true);
    setOutgoingCall(null);

    const peer = new SimplePeer({ initiator: false, trickle: false, stream: s });

    peer.on("signal", (signal) => {
      socket.emit("answerCall", { to: call.from, signal });
    });

    peer.on("stream", (remote) => {
      setRemoteStream(remote);
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remote;
    });

    peer.on("error", (err) => { console.error("Peer error:", err); endCall(); });

    peer.signal(call.signal);
    peerRef.current = peer;
  };

  const rejectCall = () => {
    if (call) socket.emit("callRejected", { to: call.from });
    setCall(null);
    setCallActive(false);
  };

  const endCall = () => {
    const target = callTargetRef.current;
    if (target) socket.emit("endCall", { to: target });
    callTargetRef.current = null;
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    
    setCall(null);
    setCallActive(false);
    setCallAccepted(false);
    setCallEnded(true);
    setOutgoingCall(null);
    setRemoteStream(null);
    setDuration(0);
    setIsMinimized(false);
    setTimeout(() => setCallEnded(false), 100);
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(prev => !prev);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onIncoming = (data) => {
      callTargetRef.current = data.from;
      setCall(data);
      setCallActive(true);
    };
    const onEnded = () => {
      callTargetRef.current = null;
      if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
      setCall(null); setCallActive(false); setCallAccepted(false);
      setOutgoingCall(null); setRemoteStream(null);
      toast("Call ended");
    };
    const onRejected = () => {
      toast("Call declined");
      callTargetRef.current = null;
      if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setCall(null); setCallActive(false); setCallAccepted(false);
      setOutgoingCall(null); setRemoteStream(null);
      setDuration(0);
    };

    const onAnswered = (signal) => {
      // Incoming call was answered by me? No, this is for OUTGOING call being answered
      // Already handled in callUser once, but let's ensure timer here if needed
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      }
    };

    socket.on("callIncoming", onIncoming);
    socket.on("callEnded", onEnded);
    socket.on("callRejected", onRejected);
    socket.on("callAnswered", onAnswered);
    return () => {
      socket.off("callIncoming", onIncoming);
      socket.off("callEnded", onEnded);
      socket.off("callRejected", onRejected);
      socket.off("callAnswered", onAnswered);
    };
  }, [socket, stream]);

  // Handle local state timer for answering calls
  useEffect(() => {
    if (callAccepted && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (!callAccepted && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [callAccepted]);

  const fetchCallLogs = async (axiosInstance) => {
    try {
      const res = await axiosInstance.get("/api/calls/history");
      if (res.data.success) setCallLogs(res.data.logs);
    } catch (err) {
      console.error("Fetch call logs error:", err.message);
    }
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleSpeaker = () => {
    setIsSpeaker(prev => !prev);
    // In browser, this is limited, but we can toggle volume/class for UI
    toast(isSpeaker ? "Speaker Off" : "Speaker On");
  };

  return (
    <CallContext.Provider value={{
      call, callActive, callAccepted, callEnded, outgoingCall,
      stream, remoteStream, isMuted, isSpeaker, setIsSpeaker,
      isMinimized, setIsMinimized, duration, formatDuration,
      callLogs, fetchCallLogs, toggleSpeaker,
      callUser, answerCall, rejectCall, endCall, toggleMute,
      localAudioRef, remoteAudioRef,
    }}>
      {children}
    </CallContext.Provider>
  );
};

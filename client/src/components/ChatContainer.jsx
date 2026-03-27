// components/ChatContainer.jsx (HMR trigger)
import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import { useSwipe } from "../hooks/useSwipe";
import { CallContext } from "../context/CallContext";
import { formatMessageTime } from "../lib/utils";
import toast from "react-hot-toast";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react";

const AudioMessage = ({ src, isMine }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => setProgress((audio.currentTime / audio.duration) * 100);
    const handleEnded = () => { setIsPlaying(false); setProgress(0); };

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", handleEnded);
    }
  }, [src]);

  const togglePlay = () => {
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration;
    audioRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`flex items-center gap-2 lg:gap-3 w-[220px] lg:w-[260px] pt-1 select-none ${isMine ? 'text-gray-800' : 'text-white'}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={togglePlay} className="flex-shrink-0 text-3xl opacity-80 hover:opacity-100 transition-opacity outline-none">
        {isPlaying ? "⏸" : "▶"}
      </button>
      <div className="flex flex-col flex-1 gap-1">
        <input
          type="range"
          min="0" max="100"
          value={isNaN(progress) ? 0 : progress}
          onChange={handleSeek}
          className={`w-full h-1.5 cursor-pointer rounded-full appearance-none bg-black/20 outline-none ${isMine ? 'accent-gray-600' : 'accent-white'}`}
        />
        <div className="flex justify-between items-center text-[10px] font-bold opacity-70 px-1">
          <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
        </div>
      </div>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex justify-center items-center text-sm ml-1 ${isMine ? 'bg-black/10' : 'bg-black/20'}`}>
        🎤
      </div>
    </div>
  );
};

const ChatContainer = () => {
  const {
    messages,
    activeChat,
    sendMessage,
    toggleRightSidebar,
    setActiveChat,
    deleteMessage,
    fetchMessages,
    toggleArchiveChat,
    toggleBlockUser,
    fetchPrivateChats,
    privateChats
  } = useContext(ChatContext);
  const { authUser, axios } = useContext(AuthContext);
  const { callUser, callActive, callAccepted, duration, formatDuration, call, outgoingCall } = useContext(CallContext);
  
  const sendSound = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"));
  const receiveSound = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"));

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId === authUser._id) {
        // sendSound.current.play().catch(() => {});
      } else {
        receiveSound.current.play().catch(() => {});
      }
    }
  }, [messages.length]);

  // --- MOBILES SWIPE GESTURE HANDLERS ---
  const swipeHandlers = useSwipe({
    onSwipeRight: () => {
      if (window.innerWidth >= 1024) return;
      if (showRightSidebar) {
        toggleRightSidebar();
      } else {
        setActiveChat(null);
      }
    },
    onSwipeLeft: () => {
      if (window.innerWidth >= 1024) return;
      if (!showRightSidebar) {
        toggleRightSidebar();
      }
    }
  });

  const bottomRef = useRef(null);
  const [input, setInput] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionList, setMentionList] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [docPreview, setDocPreview] = useState(null); // { name: string, content?: string, type: 'txt' | 'pdf', url: string }
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [openMsgMenu, setOpenMsgMenu] = useState(null);

  // --- NEW MEDIA STATES ---
  const [previewVideo, setPreviewVideo] = useState(null);
  const [locationPayload, setLocationPayload] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [isViewOnce, setIsViewOnce] = useState(false);

  // --- AUDIO RECORDING ---
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null); // base64 Audio
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // --- VIEW ONCE MODAL ---
  const [viewOnceModal, setViewOnceModal] = useState(null);
  const [screenshotDetected, setScreenshotDetected] = useState(false);
  const alertTriggeredRef = useRef(false);

  const closeViewOnce = async () => {
    if (viewOnceModal) {
      try { await axios.post(`/api/messages/consume-view-once/${viewOnceModal._id}`); } catch (err) { }
      setViewOnceModal(null);
      setScreenshotDetected(false);
      alertTriggeredRef.current = false;
    }
  };

  useEffect(() => {
    if (!viewOnceModal) return;

    const triggerScreenshotAlert = async () => {
      if (alertTriggeredRef.current) return;
      alertTriggeredRef.current = true;
      setScreenshotDetected(true);

      try {
        toast.error("Screenshot or Screen Recording activity detected!");
        const payload = {
          text: `🚫 ${authUser?.fullName || "The user"} tried to take a screenshot or screen recording of the View Once message!`
        };
        await sendMessage(payload);
      } catch (err) { }

      setTimeout(() => {
        closeViewOnce();
      }, 2000);
    };

    const handleKeydown = (e) => {
      // PrintScreen key, or Mac shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5, Cmd+Shift+S
      if (e.key === "PrintScreen" || (e.metaKey && e.shiftKey && ["3", "4", "5", "s", "S"].includes(e.key))) {
        e.preventDefault();
        triggerScreenshotAlert();
      }
    };

    const handleBlur = () => triggerScreenshotAlert();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') triggerScreenshotAlert();
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [viewOnceModal]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!activeChat) return <div className="h-full flex items-center justify-center font-bold bg-white/10">Select a chat to start</div>;

  const isGroup = activeChat.type === "group";

  const renderStatusIcon = (status) => {
    if (!status || status === "sent") return <span className="text-gray-500 font-bold text-[10px]">✓</span>;
    if (status === "delivered") return <span className="text-gray-500 font-bold text-[10px]">✓✓</span>;
    if (status === "read") return <span className="text-blue-500 font-bold text-[10px]">✓✓</span>;
    return null;
  };

  const handleDeleteConversation = async (e) => {
    e.stopPropagation();
    if (isGroup) return;
    if (!window.confirm("Delete this entire chat history for you?")) return;
    try {
      const { data } = await axios.delete(`/api/messages/chat/${activeChat.data._id}`);
      if (data.success) {
        toast.success("Conversation deleted");
        setActiveChat(null);
        await fetchPrivateChats();
      }
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (isGroup) {
      const lastWord = val.split(" ").pop();
      if (lastWord.startsWith("@")) {
        const query = lastWord.slice(1).toLowerCase();
        const matches = activeChat.data.members.filter(m => m.fullName.toLowerCase().includes(query));
        setMentionList(matches);
        setShowMentions(true);
      } else { setShowMentions(false); }
    }
  };

  const insertMention = (user) => {
    const words = input.split(" ");
    words[words.length - 1] = `@${user.fullName} `;
    setInput(words.join(" "));
    setShowMentions(false);
  };

  const handleReplyPrivately = (msg) => {
    setOpenMsgMenu(null);
    fetchMessages({ type: "private", data: msg.sender });
    setReplyingTo({ ...msg, fromGroup: true });
  };

  // ✅ UPDATED: Always allow opening the delete modal
  const handleDeleteFromMenu = (msg) => {
    const isOwner = (msg.sender?._id || msg.senderId) === authUser._id;
    const isAdmin = isGroup && activeChat.data.admins.some(a => (a._id || a) === authUser._id);
    setDeleteTarget({ msg, isOwner, isAdmin });
    setOpenMsgMenu(null);
  };

  const handleSend = async () => {
    if (!input.trim() && !previewImage && !previewVideo && !audioUrl && !locationPayload && !previewDocument) return;
    if (isSending) return; // Block double-clicks!

    setIsSending(true);

    // Explicitly package our standard and rich media variables
    const payload = {
      text: input.trim(),
      image: previewImage,
      video: previewVideo,
      audio: audioUrl,
      location: locationPayload,
      document: previewDocument,
      documentName,
      isViewOnce
    };

    if (replyingTo) {
      if (replyingTo.fromGroup && activeChat.type === "private") {
        payload.replyToGroupMsgId = replyingTo._id;
      } else {
        payload.replyTo = replyingTo._id;
      }
    }

    await sendMessage(payload);

    // Reset all context wrappers uniquely
    setInput("");
    setPreviewImage(null);
    setPreviewVideo(null);
    setAudioUrl(null);
    setLocationPayload(null);
    setPreviewDocument(null);
    setDocumentName("");
    setReplyingTo(null);
    setIsViewOnce(false);
    setIsSending(false);
  };

  const handleMedia = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size exceeds 2MB limit.");
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Video size strictly exceeds 10MB limit.");
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreviewVideo(reader.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("audio/")) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Audio file size strictly exceeds 10MB limit.");
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setAudioUrl(reader.result);
      reader.readAsDataURL(file);
    } else if (
      file.type === "application/pdf" ||
      file.type === "application/msword" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "text/plain" ||
      file.name.match(/\.(pdf|doc|docx|txt)$/i)
    ) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Document size exceeds 10MB limit.");
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewDocument(reader.result);
        setDocumentName(file.name);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Unsupported file type.");
      e.target.value = null;
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    if (isFetchingLocation) return;
    
    setIsFetchingLocation(true);
    toast.loading("Getting your location...", { id: "loc" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss("loc");
        setIsFetchingLocation(false);
        setLocationPayload({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location ready to send!");
      },
      () => {
        toast.dismiss("loc");
        setIsFetchingLocation(false);
        toast.error("Location access denied.");
      }
    );
  };

  // --- NATIVE MIC RECORDERS ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioUrl(reader.result); // Base64 buffer
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone access actively denied by browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioUrl(null);
  };

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const onRightClick = (e, msg) => {
    e.preventDefault(); e.stopPropagation();
    if (msg.deleted) return;
    const isOwner = (msg.sender?._id || msg.senderId) === authUser._id;
    const isAdmin = isGroup && activeChat.data.admins.some(a => (a._id || a) === authUser._id);
    setDeleteTarget({ msg, isOwner, isAdmin });
  };

  return (
    <div
      className="h-full flex flex-col bg-transparent relative"
      style={{ touchAction: "pan-y" }}
      onClick={() => setOpenMsgMenu(null)}
      {...swipeHandlers}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b bg-white/30 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={() => setActiveChat(null)} className="lg:hidden text-2xl mr-1 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">←</button>
          <p className="font-bold text-lg truncate max-w-[150px] lg:max-w-none">
            {isGroup ? activeChat.data.name : activeChat.data.fullName}
          </p>
          {!isGroup && (
            <button onClick={handleDeleteConversation} className="ml-2 text-[10px] uppercase tracking-wider font-bold text-black hover:text-white transition-colors bg-transparent border-2 border-red-600 hover:bg-red-600 px-2 py-0.5 rounded">
              Delete Chat
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {/* Active Call Indicator */}
          {callActive && callAccepted && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20 mr-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-600 font-mono text-xs font-bold">{formatDuration(duration)}</span>
            </div>
          )}
          
          {/* Voice call button — private chats only */}
          {!isGroup && !callActive && (
            <button
              onClick={() => callUser(activeChat.data)}
              title="Voice Call"
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          )}
          <button onClick={() => setActiveChat(null)} className="font-bold hidden lg:block text-sm">Close</button>
          <button onClick={toggleRightSidebar} className="text-2xl font-bold p-1 hover:bg-black/5 rounded">‹</button>
        </div>
      </div>

      {/* MESSAGES */}
      <div 
        className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 custom-scrollbar touch-pan-y"
        style={{ touchAction: "pan-y" }}
        {...swipeHandlers}
      >
        <div className="max-w-[820px] mx-auto space-y-4">
          {messages.map((msg) => {
            const senderId = msg.sender?._id || msg.senderId;
            const isMine = senderId === authUser._id;

            return (
              <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div onContextMenu={(e) => onRightClick(e, msg)}
                  className={`relative group max-w-[85%] lg:max-w-[520px] px-5 py-3 rounded-2xl shadow transition-all 
                  ${isMine ? "bg-gray-200 text-black rounded-tr-none" : "bg-green-600 text-white rounded-tl-none"} ${openMsgMenu === msg._id ? "z-50" : "z-0"}`}>

                  {!msg.deleted && (
                    <>
                      {/* --- PC HOVER BUTTON (Dark & Visible) --- */}
                      <div className={`absolute top-2 ${isMine ? "-left-12" : "-right-12"} opacity-0 group-hover:opacity-100 hidden lg:block transition-all z-10`}>
                        <button onClick={(e) => { e.stopPropagation(); setOpenMsgMenu(msg._id); }}
                          className="bg-gray-200 hover:bg-white text-black font-black w-8 h-8 rounded-full shadow-md flex items-center justify-center transform hover:scale-110 transition-transform">
                          ⋮
                        </button>
                      </div>

                      {/* --- MOBILE VISIBLE BUTTON (Inside Bubble - Darker/Clearer) --- */}
                      <button onClick={(e) => { e.stopPropagation(); setOpenMsgMenu(msg._id); }}
                        className="lg:hidden absolute top-2 right-3 bg-black/10 hover:bg-black/20 text-inherit rounded-full w-6 h-6 flex items-center justify-center font-bold text-lg z-10">
                        ⋮
                      </button>

                      {/* --- MENU DROPDOWN --- */}
                      {openMsgMenu === msg._id && (
                        <div className={`absolute z-50 bg-white text-black shadow-2xl border border-gray-200 rounded-xl py-2 w-40 text-sm font-bold flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${isMine ? "top-8 right-0" : "top-8 left-0"}`}>
                          <button onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setOpenMsgMenu(null); }}
                            className="text-left px-4 py-3 hover:bg-gray-100 transition-colors">
                            Reply
                          </button>

                          {isGroup && !isMine && (
                            <button onClick={(e) => { e.stopPropagation(); handleReplyPrivately(msg); }}
                              className="text-left px-4 py-3 hover:bg-gray-100 transition-colors border-t border-gray-100">
                              Reply Privately
                            </button>
                          )}

                          {/* ✅ UPDATED: Delete is ALWAYS shown, permissions checked in modal */}
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteFromMenu(msg); }}
                            className="text-left px-4 py-3 hover:bg-red-50 text-red-600 transition-colors border-t border-gray-100">
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {isGroup && !isMine && <p className="text-xs font-bold mb-1 pr-4">{msg.sender?.fullName}</p>}

                  {(msg.replyTo || msg.replyToGroupMsg) && (
                    <div className="bg-black/10 border-l-4 border-black/30 p-2 mb-2 rounded text-xs opacity-80">
                      <p className="font-bold">{(msg.replyTo?.senderId?.fullName || msg.replyTo?.sender?.fullName || msg.replyToGroupMsg?.sender?.fullName)}</p>
                      <p className="truncate">{(msg.replyTo?.text || msg.replyToGroupMsg?.text || "Image")}</p>
                    </div>
                  )}

                  {msg.deleted ? <p className="italic opacity-70 text-sm">This message was deleted</p> : (
                    <div className="pr-2 w-full">
                      {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                      {msg.isViewOnce && (msg.image || msg.video) ? (
                        <div
                          onClick={() => setViewOnceModal(msg)}
                          className={`flex items-center gap-3 p-3 mt-2 rounded-xl cursor-pointer transition-colors shadow-inner border border-white/20
                                  ${isMine ? "bg-black/10 hover:bg-black/20" : "bg-black/20 hover:bg-black/30"}`}
                        >
                          <span className="text-2xl drop-shadow-md">{msg.image ? "📷" : "🎥"}</span>
                          <div className="flex flex-col">
                            <span className="font-bold tracking-wide">{msg.image ? "Photo" : "Video"}</span>
                            <span className="text-[10px] opacity-70 flex items-center gap-1 font-semibold uppercase tracking-wider"><span className="w-3 h-3 text-[8px] border border-current rounded-full flex items-center justify-center">1</span> View Once</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.image && <img src={msg.image} className="mt-2 rounded-lg max-h-60 max-w-full object-cover shadow-sm border border-black/10" />}
                          {msg.video && <video src={msg.video} controls preload="metadata" className="mt-2 rounded-lg max-h-60 max-w-full object-cover bg-black shadow-sm" />}
                        </>
                      )}

                      {msg.audio && (
                        <div className="mt-1">
                          <AudioMessage src={msg.audio} isMine={isMine} />
                        </div>
                      )}

                      {/* Document bubble */}
                      {msg.document && (() => {
                        const fname = msg.documentName && msg.documentName.trim() ? msg.documentName.trim() : "Document";
                        const ext = fname.includes(".") ? fname.split(".").pop().toUpperCase() : "FILE";
                        const extColor = ext === "PDF" ? "bg-red-500" : ext === "DOC" || ext === "DOCX" ? "bg-blue-500" : "bg-gray-500";
                        return (
                          <div className="mt-2 rounded-2xl overflow-hidden border border-gray-200 shadow-lg w-[240px] bg-white">
                            {/* File header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <div className={`w-10 h-10 rounded-xl ${extColor} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-gray-800">{fname}</p>
                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${extColor} text-white`}>{ext}</span>
                              </div>
                            </div>
                                     <div className="flex divide-x divide-gray-100">
                              {ext === "TXT" || ext === "PDF" ? (
                                <button
                                  onClick={async () => {
                                    if (ext === "TXT") {
                                      try {
                                        const res = await fetch(msg.document);
                                        const text = await res.text();
                                        setDocPreview({ name: fname, content: text, type: 'txt', url: msg.document });
                                      } catch (e) {
                                        toast.error("Failed to load text file");
                                      }
                                    } else {
                                      // PDF
                                      setDocPreview({ name: fname, url: msg.document, type: 'pdf' });
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </button>
                              ) : (
                                <a
                                  href={msg.document}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </a>
                              )}
                              <a
                                href={msg.document}
                                download={fname}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </a>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Call Log Message */}
                      {msg.messageType === "call_log" && (
                        <div className={`flex flex-col gap-2 p-1 ${isMine ? 'text-black' : 'text-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMine ? 'bg-black/5' : 'bg-white/20'}`}>
                              {msg.callLog?.status === "missed" ? <PhoneMissed className="w-5 h-5 text-red-400" /> : 
                               msg.callLog?.status === "rejected" ? <PhoneMissed className="w-5 h-5 text-orange-400" /> :
                               <Phone className="w-5 h-5 text-current" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold uppercase tracking-wide">
                                {msg.callLog?.status === "missed" ? "Missed Voice Call" : 
                                 msg.callLog?.status === "rejected" ? "Declined Voice Call" : "Voice Call"}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] opacity-70 font-bold">
                                {msg.callLog?.status === "completed" && (
                                  <>
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDuration(msg.callLog.duration)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isMine && (msg.callLog?.status === "missed" || msg.callLog?.status === "rejected") && (
                            <button 
                              onClick={() => callUser(activeChat.data)}
                              className="mt-2 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10"
                            >
                              Call Back
                            </button>
                          )}
                        </div>
                      )}

                      {msg.location?.lat && (
                        <div className="mt-2">
                          <a
                            href={`https://www.google.com/maps?q=${msg.location.lat},${msg.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-3 p-3 rounded-xl shadow-sm border w-fit transition-colors pointer-events-auto
                              ${isMine ? 'bg-black/10 hover:bg-black/20 border-black/10 text-black' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'}`}
                          >
                            <span className="text-3xl">📍</span>
                            <div className="flex flex-col">
                              <span className="font-bold">Live Location</span>
                              <span className="text-[10px] opacity-70">{msg.location.lat.toFixed(5)}, {msg.location.lng.toFixed(5)}</span>
                              <span className="text-[10px] underline opacity-70">Open in Maps →</span>
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className="text-[11px] opacity-70">{formatMessageTime(msg.createdAt)}</p>
                    {isMine && !isGroup && renderStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-[320px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-center mb-5 text-gray-800">Delete Message?</h3>
            <div className="space-y-3">

              {/* ✅ "Delete for me" is ALWAYS available */}
              <button onClick={() => { deleteMessage(deleteTarget.msg._id, "me"); setDeleteTarget(null); }} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">Delete for me</button>

              {/* ✅ "Delete for everyone" ONLY if owner or admin */}
              {isGroup ? (
                deleteTarget.isAdmin && (
                  <button onClick={() => { deleteMessage(deleteTarget.msg._id, "everyone"); setDeleteTarget(null); }} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all">Delete for everyone</button>
                )
              ) : (
                deleteTarget.isOwner && (
                  <button onClick={() => { deleteMessage(deleteTarget.msg._id, "everyone"); setDeleteTarget(null); }} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all">Delete for everyone</button>
                )
              )}

              <button onClick={() => setDeleteTarget(null)} className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ONCE MODAL (Fullscreen Overlay) */}
      {viewOnceModal && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center flex-col animate-in fade-in zoom-in duration-200 select-none" style={{ WebkitUserDrag: "none" }}>

          {!screenshotDetected && (
            <div className="absolute top-6 left-6 z-10">
              <button
                onClick={closeViewOnce}
                className="bg-white/20 hover:bg-white/40 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-90"
              >
                ✕
              </button>
            </div>
          )}

          {screenshotDetected ? (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center pt-2 text-5xl animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.6)]">
                🚫
              </div>
              <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest text-center px-4">Screenshot Prevented</h2>
              <p className="text-white/60 text-lg font-medium text-center px-4">An alert has been securely sent to the Chat.</p>
            </div>
          ) : (
            <>
              {viewOnceModal.image && <img src={viewOnceModal.image} draggable={false} className="max-w-[95%] max-h-[85vh] object-contain drop-shadow-2xl rounded-lg pointer-events-none" />}
              {viewOnceModal.video && <video src={viewOnceModal.video} controls autoPlay className="max-w-[95%] max-h-[85vh] object-contain drop-shadow-2xl rounded-lg bg-black" controlsList="nodownload noplaybackrate" disablePictureInPicture />}

              <div className="absolute bottom-10 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-2xl flex items-center gap-3">
                <span className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center text-xs font-black text-white">1</span>
                <p className="text-white font-bold tracking-widest uppercase text-sm">View Once Message</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* INPUT AREA */}
      {(!isGroup && (privateChats.find(u => u._id === activeChat.data._id) || activeChat.data).blockedUsers?.includes(authUser._id)) ? (
        <div className="px-4 lg:px-6 py-4 border-t bg-gray-50 flex items-center justify-center">
          <p className="text-sm font-bold text-red-600 text-center bg-red-100 px-6 py-3 rounded-xl shadow-inner w-full lg:w-auto border border-red-200">
            This user has blocked you. You cannot send messages.
          </p>
        </div>
      ) : (
        <div className="px-4 lg:px-6 pt-3 pb-6 lg:py-4 border-t bg-white/50 relative">
          {(previewImage || previewVideo || locationPayload || previewDocument || (audioUrl && !isRecording)) && (
            <div className="absolute bottom-full left-0 mb-2 p-4 bg-white/90 backdrop-blur shadow-lg rounded-t-2xl flex items-center gap-4 w-full lg:w-auto">
              {previewImage && (
                <div className="relative group">
                  <img src={previewImage} alt="Preview" className="w-20 h-20 object-cover rounded-lg border-2 border-green-600" />
                  <button onClick={() => setPreviewImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">✕</button>
                </div>
              )}
              {previewVideo && (
                <div className="relative group">
                  <video src={previewVideo} className="w-20 h-20 object-cover rounded-lg border-2 border-blue-600" />
                  <button onClick={() => setPreviewVideo(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">✕</button>
                </div>
              )}
              {previewDocument && (
                <div className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-800 max-w-[120px] truncate">{documentName}</span>
                  <button onClick={() => { setPreviewDocument(null); setDocumentName(""); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">✕</button>
                </div>
              )}
              {locationPayload && (
                <div className="relative flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-green-800">Location ready</span>
                  <button onClick={() => setLocationPayload(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">✕</button>
                </div>
              )}
              {audioUrl && !isRecording && (
                <div className="relative group flex items-center bg-gray-100 rounded-lg p-2 border border-gray-300">
                  <audio src={audioUrl} controls controlsList="nodownload noplaybackrate" className="h-10 w-48" />
                  <button onClick={() => setAudioUrl(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10">✕</button>
                </div>
              )}
              <div className="text-sm">
                <p className="font-bold text-gray-700">{audioUrl ? "Audio ready" : previewVideo ? "Video selected" : locationPayload ? "📍 Location ready" : "Image selected"}</p>
                <p className="text-xs text-gray-500 mt-1">{isViewOnce ? "View Once Enabled" : ""}</p>
              </div>
            </div>
          )}

          {showMentions && mentionList.length > 0 && (
            <div className="absolute bottom-full left-6 w-64 bg-white border shadow-2xl rounded-t-xl overflow-hidden mb-2">
              {mentionList.map(m => (
                <div key={m._id} onClick={() => insertMention(m)} className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer">
                  <img src={m.profilePic || assets.avatar_icon} className="w-8 h-8 rounded-full" /><span className="font-semibold text-sm">{m.fullName}</span>
                </div>
              ))}
            </div>
          )}

          {replyingTo && (
            <div className="flex items-center justify-between bg-gray-100 p-2 mb-2 border-l-4 border-green-600 rounded">
              <div className="text-xs truncate max-w-[250px] lg:max-w-md">
                <span className="font-bold block">Replying to {replyingTo.sender?.fullName || replyingTo.senderId?.fullName}</span>
                <span className="opacity-70">{replyingTo.text || "Media"}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1">✕</button>
            </div>
          )}

          <div className="flex gap-2 lg:gap-3 items-center w-full">
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-red-50 text-red-600 rounded-full px-5 py-2 lg:py-3 border border-red-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-red-600 rounded-full shadow-sm animate-ping"></span>
                  <span className="font-bold text-sm tracking-widest">{formatRecordingTime(recordingTime)}</span>
                </div>
                <div className="flex gap-4 items-center">
                  <button onClick={cancelRecording} className="text-xl font-bold text-red-400 hover:text-red-700 hover:scale-110 active:scale-95 transition-all">✕</button>
                  <button onClick={stopRecording} className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:scale-110 shadow-md">◼</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-3xl pr-2 shadow-sm focus-within:ring-2 focus-within:ring-green-400 focus-within:border-transparent transition-all">
                <input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-black placeholder:text-gray-500 font-medium px-4 lg:px-5 py-2.5 lg:py-3.5 outline-none rounded-l-3xl"
                />

                <div className="flex items-center gap-1">
                  {/* Attachment (📎 → SVG paperclip) */}
                  <input hidden type="file" id="media" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={handleMedia} />
                  <label htmlFor="media" title="Attach file" className="cursor-pointer hover:bg-gray-100 rounded-full p-2 transition-colors flex items-center justify-center opacity-70 hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </label>

                  {/* Location button (admin-only in groups) → SVG map pin */}
                  {(!isGroup || activeChat.data.admins?.some(a => (a._id || a) === authUser._id)) && (
                    <button
                      onClick={handleShareLocation}
                      disabled={isFetchingLocation}
                      title="Share Location"
                      className={`rounded-full p-2 transition-colors flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-gray-100 ${locationPayload ? 'opacity-100 bg-green-100 text-green-600' : 'text-gray-600'} ${isFetchingLocation ? 'animate-pulse' : ''}`}
                    >
                      {isFetchingLocation ? (
                        <div className="w-4 h-4 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* View Once Toggle */}
                  {(previewImage || previewVideo) && (
                    <button onClick={() => setIsViewOnce(!isViewOnce)}
                      className={`w-7 h-7 mr-1 rounded-full font-black text-xs flex items-center justify-center transition-all ${isViewOnce ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300 scale-105" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}>
                      1
                    </button>
                  )}

                  {/* Mic / Send Button */}
                  {!input.trim() && !previewImage && !previewVideo && !audioUrl && !locationPayload && !previewDocument ? (
                    <button onClick={startRecording} className="bg-green-500 hover:bg-green-600 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all outline-none mr-1">
                      {/* SVG Mic */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  ) : (
                    <button onClick={handleSend} disabled={isSending} className={`text-white w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all outline-none mr-1 ${isSending ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'}`}>
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <img src={assets.send_button} className="w-4 brightness-0 invert" alt="Send" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {txtPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[999] p-4 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
           <div className="w-full max-w-2xl h-[80vh] bg-white rounded-[32px] flex flex-col shadow-2xl overflow-hidden border border-white/20">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <div>
                    <h3 className="font-black text-lg text-gray-900 leading-none">{txtPreview.name}</h3>
                    <p className="text-[10px] uppercase font-bold text-indigo-600 mt-1 tracking-widest">Text Document View</p>
                 </div>
                 <button onClick={() => setTxtPreview(null)} className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors">
                    <span className="text-2xl font-black leading-none">&times;</span>
                 </button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto bg-[#fafafa]">
                 <pre className="text-sm font-medium text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
                    {txtPreview.content}
                 </pre>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                 <button onClick={() => setTxtPreview(null)} className="px-8 py-3 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                    Close Preview
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* DOCUMENT PREVIEW MODAL (TXT / PDF) */}
      {docPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[999] p-4 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
           <div className="w-full max-w-4xl h-[90vh] bg-white rounded-[32px] flex flex-col shadow-2xl overflow-hidden border border-white/20">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <div>
                    <h3 className="font-black text-lg text-gray-900 leading-none truncate max-w-[200px] md:max-w-md">{docPreview.name}</h3>
                    <p className="text-[10px] uppercase font-bold text-indigo-600 mt-1 tracking-widest">{docPreview.type === 'pdf' ? 'PDF Document View' : 'Text Document View'}</p>
                 </div>
                 <button onClick={() => setDocPreview(null)} className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors">
                    <span className="text-2xl font-black leading-none">&times;</span>
                 </button>
              </div>
              <div className="flex-1 relative overflow-hidden bg-[#fafafa]">
                 {docPreview.type === 'pdf' ? (
                    <iframe 
                        src={`${docPreview.url}#toolbar=0`} 
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                    />
                 ) : (
                    <div className="p-8 h-full overflow-y-auto">
                        <pre className="text-sm font-medium text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
                            {docPreview.content}
                        </pre>
                    </div>
                 )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                 <a href={docPreview.url || "#"} download={docPreview.name} className="px-6 py-3 bg-gray-100 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all active:scale-95">
                    Download
                 </a>
                 <button onClick={() => setDocPreview(null)} className="px-8 py-3 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                    Close
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;

import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatMessageTime } from "../lib/utils";
import toast from "react-hot-toast";

const AudioMessage = ({ src, isMine }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if(!audio) return;

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
        if(isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const seekTime = (e.target.value / 100) * duration;
        audioRef.current.currentTime = seekTime;
        setProgress(e.target.value);
    };

    const formatTime = (time) => {
        if(isNaN(time) || !isFinite(time)) return "0:00";
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
    privateChats
  } = useContext(ChatContext);
  const { authUser, axios } = useContext(AuthContext);

  const bottomRef = useRef(null);
  const [input, setInput] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSending, setIsSending] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionList, setMentionList] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [openMsgMenu, setOpenMsgMenu] = useState(null);

  // --- NEW MEDIA STATES ---
  const [previewVideo, setPreviewVideo] = useState(null);
  const [isViewOnce, setIsViewOnce] = useState(false);

  // --- AUDIO RECORDING ---
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null); // base64 Audio
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // --- MOBILES SWIPE GESTURE HANDLERS ---
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

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
          } catch(err) {}

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
    if (!input.trim() && !previewImage && !previewVideo && !audioUrl) return;
    if (isSending) return; // Block double-clicks!
    
    setIsSending(true);
    
    // Explicitly package our standard and rich media variables
    const payload = { 
        text: input.trim(), 
        image: previewImage,
        video: previewVideo,
        audio: audioUrl,
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
    } else {
        toast.error("Please select a valid image, video, or audio file.");
        e.target.value = null;
    }
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

  // --- MOBILES SWIPE GESTURE HANDLERS ---
  const minSwipeDistance = 75; // More forgiving distance for natural swiping

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    // Swipe Right (touchStart > touchEnd distance is negative. Math.abs checks absolute.)
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Only fire swipe back on mobile (where the LG back arrow is actually used)
    if (isRightSwipe && window.innerWidth < 1024) {
      setActiveChat(null);
    }
  };

  return (
    <div 
      className="h-full flex flex-col bg-transparent relative" 
      onClick={() => setOpenMsgMenu(null)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
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
        <div className="flex gap-4 items-center">
          <button onClick={() => setActiveChat(null)} className="font-bold hidden lg:block">Close</button>
          <button onClick={toggleRightSidebar} className="text-2xl font-bold p-1 hover:bg-black/5 rounded">‹</button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 custom-scrollbar">
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
        <div className="px-4 lg:px-6 py-4 border-t bg-white/50 relative">
          {(previewImage || previewVideo || (audioUrl && !isRecording)) && (
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
              {audioUrl && !isRecording && (
                <div className="relative group flex items-center bg-gray-100 rounded-lg p-2 border border-gray-300">
                    <audio src={audioUrl} controls controlsList="nodownload noplaybackrate" className="h-10 w-48" />
                    <button onClick={() => setAudioUrl(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10">✕</button>
                </div>
              )}
              <div className="text-sm">
                 <p className="font-bold text-gray-700">{audioUrl ? "Audio ready" : previewVideo ? "Video selected" : "Image selected"}</p>
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
                        {/* Single Attachment Input */}
                        <input hidden type="file" id="media" accept="image/*,video/*,audio/*" onChange={handleMedia} />
                        <label htmlFor="media" className="cursor-pointer hover:bg-gray-100 rounded-full p-2 transition-colors flex items-center justify-center opacity-80 hover:opacity-100">
                             <span className="text-xl -rotate-45 block transform">📎</span>
                        </label>

                        {/* View Once Toggle */}
                        {(previewImage || previewVideo) && (
                            <button onClick={() => setIsViewOnce(!isViewOnce)} 
                                    className={`w-7 h-7 mr-1 rounded-full font-black text-xs flex items-center justify-center transition-all ${isViewOnce ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300 scale-105" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}>
                                1
                            </button>
                        )}

                        {/* Mic / Send Button purely localized inside the text box border area */}
                        {!input.trim() && !previewImage && !previewVideo && !audioUrl ? (
                           <button onClick={startRecording} className="bg-green-500 hover:bg-green-600 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all outline-none mr-1">
                              <span className="text-lg">🎤</span>
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
    </div>
  );
};

export default ChatContainer;
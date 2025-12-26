import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatMessageTime } from "../lib/utils";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const { 
    messages, 
    activeChat, 
    sendMessage, 
    toggleRightSidebar, 
    setActiveChat, 
    deleteMessage, 
    fetchMessages 
  } = useContext(ChatContext);
  const { authUser, axios } = useContext(AuthContext);

  const bottomRef = useRef(null);
  const [input, setInput] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionList, setMentionList] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [openMsgMenu, setOpenMsgMenu] = useState(null);

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
    if (!input.trim() && !previewImage) return;
    const payload = { text: input.trim(), image: previewImage };
    if (replyingTo) {
      if (replyingTo.fromGroup && activeChat.type === "private") {
        payload.replyToGroupMsgId = replyingTo._id;
      } else {
        payload.replyTo = replyingTo._id;
      }
    }
    await sendMessage(payload);
    setInput(""); setPreviewImage(null); setReplyingTo(null);
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > 1048576) {
      toast.error("Image size exceeds 1MB limit.");
      e.target.value = null; 
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const onRightClick = (e, msg) => {
    e.preventDefault(); e.stopPropagation();
    if (msg.deleted) return;
    const isOwner = (msg.sender?._id || msg.senderId) === authUser._id;
    const isAdmin = isGroup && activeChat.data.admins.some(a => (a._id || a) === authUser._id);
    setDeleteTarget({ msg, isOwner, isAdmin });
  };

  return (
    <div className="h-full flex flex-col bg-transparent relative" onClick={() => setOpenMsgMenu(null)}>
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
                  ${isMine ? "bg-gray-200 text-black rounded-tr-none" : "bg-green-600 text-white rounded-tl-none"}`}>
                  
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
                            <div className={`absolute z-50 bg-white text-black shadow-2xl border border-gray-200 rounded-xl py-2 w-40 text-sm font-bold flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${isMine ? "top-full right-0 mt-2" : "top-full left-0 mt-2"}`}>
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
                    <div className="pr-2">
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      {msg.image && <img src={msg.image} className="mt-2 rounded-lg max-h-60 object-cover" />}
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

      {/* INPUT AREA */}
      <div className="px-4 lg:px-6 py-4 border-t bg-white/50 relative">
        {previewImage && (
          <div className="absolute bottom-full left-0 mb-2 p-4 bg-white/90 backdrop-blur shadow-lg rounded-t-2xl flex items-center gap-4 w-full lg:w-auto">
            <div className="relative group">
              <img src={previewImage} alt="Preview" className="w-20 h-20 object-cover rounded-lg border-2 border-green-600" />
              <button onClick={() => setPreviewImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">✕</button>
            </div>
            <div className="text-sm"><p className="font-bold text-gray-700">Image selected</p></div>
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
              <span className="opacity-70">{replyingTo.text || "Image"}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1">✕</button>
          </div>
        )}

        <div className="flex gap-2 lg:gap-3 items-center">
          <input value={input} onChange={handleInputChange} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type a message..." className="flex-1 border-2 border-black bg-white text-black placeholder:text-gray-600 rounded-full px-4 lg:px-5 py-2 lg:py-3 outline-none transition-all" />
          <input hidden type="file" id="img" accept="image/*" onChange={handleImage} />
          <label htmlFor="img" className="cursor-pointer hover:opacity-70 transition-opacity p-1"><img src={assets.gallery_icon} className="w-6" alt="Gallery" /></label>
          <button onClick={handleSend} className="hover:scale-110 active:scale-95 transition-transform p-1"><img src={assets.send_button} className="w-7" alt="Send" /></button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
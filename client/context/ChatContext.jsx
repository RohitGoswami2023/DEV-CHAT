import { createContext, useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "./AuthContext.jsx";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { axios, socket, authUser, setAuthUser } = useContext(AuthContext);

  const [groups, setGroups] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [chatRequests, setChatRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]); 
  const [mutedChats, setMutedChats] = useState([]); 
  
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unseenMessages, setUnseenMessages] = useState({});

  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const toggleRightSidebar = () => setShowRightSidebar((p) => !p);

  // --- STABLE REFS FOR SOCKET CALLBACKS ---
  const activeChatRef = useRef(activeChat);
  const privateChatsRef = useRef(privateChats);
  const mutedChatsRef = useRef(mutedChats);
  const groupsRef = useRef(groups);

  useEffect(() => {
    activeChatRef.current = activeChat;
    privateChatsRef.current = privateChats;
    mutedChatsRef.current = mutedChats;
    groupsRef.current = groups;
  }, [activeChat, privateChats, mutedChats, groups]);

  // --- FETCH DATA ---
  const fetchGroups = async () => {
    try {
      const { data } = await axios.get("/api/groups/my");
      if (data.success) setGroups(data.groups);
    } catch (error) { console.error(error); }
  };

  const fetchPrivateChats = async () => {
    try {
      const { data } = await axios.get("/api/messages/chats");
      if (data.success) {
        setPrivateChats(data.users);
        setUnseenMessages(data.unseen || {});
      }
    } catch (error) { console.error(error); }
  };

  const fetchChatRequests = async () => {
    try {
      const { data } = await axios.get("/api/chat-requests/incoming"); 
      if (data.success) setChatRequests(data.requests);
    } catch (error) { console.error(error); }
  };

  // --- BLOCK / ARCHIVE MANAGEMENT ---
  const toggleArchiveChat = async (chatId) => {
    try {
      const res = await axios.post("/api/auth/archive", { chatId });
      if (res.data.success) {
        setAuthUser((prev) => {
           const updatedArchived = res.data.isArchived 
                ? [...(prev.archivedChats || []), chatId] 
                : (prev.archivedChats || []).filter(id => id !== chatId);
           return { ...prev, archivedChats: updatedArchived };
        });
        toast.success(res.data.message);
        
        // Auto-Mute when archiving
        if (res.data.isArchived) {
           if (!mutedChats.includes(chatId) && !mutedChatsRef.current?.includes(chatId)) {
               toggleMuteChat(chatId);
           }
        }
      }
    } catch (error) { toast.error("Failed to update archive status"); }
  };

  const fetchBlockedUsers = async () => {
    try {
      const { data } = await axios.get("/api/auth/blocked-users");
      if (data.success) setBlockedUsers(data.blockedUsers);
    } catch (error) { console.error(error); }
  };

  // Sync Muted Chats
  useEffect(() => {
    if (authUser?.mutedChats) setMutedChats(authUser.mutedChats);
  }, [authUser]);

  // --- MESSAGING ---
  const fetchMessages = async (chat) => {
    setActiveChat(chat);
    setMessages([]);
    setShowRightSidebar(false); 
    
    setUnseenMessages((prev) => {
      const copy = { ...prev };
      delete copy[chat.data._id];
      return copy;
    });

    try {
      const url = chat.type === "private" ? `/api/messages/${chat.data._id}` : `/api/group-messages/${chat.data._id}`;
      const { data } = await axios.get(url);
      if (data.success) setMessages(data.messages);
    } catch (error) { console.error(error); }
  };

  const sendMessage = async (payload) => {
    try {
      let res;
      if (activeChat.type === "private") {
        res = await axios.post(`/api/messages/send/${activeChat.data._id}`, payload);
        // Optimistically update list if this is a new chat
        if (!privateChats.find(u => u._id === activeChat.data._id)) {
            await fetchPrivateChats(); 
        }
      } else {
        res = await axios.post("/api/group-messages/send", {
          groupId: activeChat.data._id,
          ...payload,
        });
      }
      
      if (res?.data?.success) {
        if (activeChat.type === "private") {
             setMessages((prev) => [...prev, res.data.message]);
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to send message";
      toast.error(errorMsg); 
    }
  };

  const deleteMessage = async (messageId, mode) => {
    try {
      const endpoint = activeChat.type === "group" ? `/api/group-messages/${messageId}` : `/api/messages/message/${messageId}`;
      await axios.delete(endpoint, { data: { mode } });
      if (mode === "me") setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (error) { toast.error("Failed to delete"); }
  };

  // --- ACTIONS ---
  const sendChatRequest = async (receiverId) => {
    try {
      const { data } = await axios.post("/api/chat-requests/send", { receiverId });
      if (data.message === "You are already connected") {
        toast.success("Connection restored!");
        await fetchPrivateChats(); 
      } else {
        toast.success("Request sent!");
      }
    } catch (error) { toast.error(error.response?.data?.message || "Failed"); }
  };

  const acceptChatRequest = async (requestId) => {
    try {
      const { data } = await axios.post("/api/chat-requests/accept", { requestId });
      if (data.success) {
        toast.success("Accepted");
        setChatRequests((prev) => prev.filter((r) => r._id !== requestId));
        await fetchPrivateChats(); 
      }
    } catch (error) { toast.error("Failed"); }
  };

  const rejectChatRequest = async (requestId) => {
    try {
      const { data } = await axios.post("/api/chat-requests/reject", { requestId });
      if (data.success) {
        toast.success("Rejected");
        setChatRequests((prev) => prev.filter((r) => r._id !== requestId));
      }
    } catch (error) { toast.error("Failed"); }
  };

  const approveGroupJoinRequest = async (groupId, userId) => {
    try {
      await axios.post("/api/groups/approve", { groupId, userId });
      toast.success("Approved");
      fetchGroups(); 
    } catch (error) { toast.error("Failed"); }
  };

  const rejectGroupJoinRequest = async (groupId, userId) => {
    try {
      await axios.post("/api/groups/reject", { groupId, userId });
      toast.success("Rejected");
      fetchGroups(); 
    } catch (error) { toast.error("Failed"); }
  };

  const toggleBlockUser = async (targetUserId) => {
    try {
        const { data } = await axios.post("/api/auth/block-toggle", { targetUserId });
        if(data.success) {
            toast.success(data.message);
            fetchBlockedUsers(); 
        }
    } catch (error) { toast.error("Failed to block/unblock"); }
  };

  const toggleMuteChat = async (chatId) => {
    try {
        const { data } = await axios.post("/api/auth/mute", { chatId });
        if(data.success) {
            toast.success(data.message);
            if(data.isMuted) setMutedChats(prev => [...prev, chatId]);
            else setMutedChats(prev => prev.filter(id => id !== chatId));
        }
    } catch (error) { toast.error("Failed to mute/unmute"); }
  };

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!socket || !authUser) return;

    const onNewMessage = (msg) => {
      const currentActiveChat = activeChatRef.current;
      const currentMuted = mutedChatsRef.current || [];
      const currentGroups = groupsRef.current || [];
      const currentPrivates = privateChatsRef.current || [];

      const chatId = msg.group?._id || msg.group || msg.groupId || 
                     (msg.senderId === authUser._id ? msg.receiverId : msg.senderId);

      if (msg.senderId && !msg.group && !currentPrivates.find(u => u._id === msg.senderId)) {
        fetchPrivateChats();
      }

      if (currentActiveChat && chatId === currentActiveChat.data._id) {
        setMessages((prev) => (prev.find(m => m._id === msg._id) ? prev : [...prev, msg]));
      } else {
        setUnseenMessages((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
      }

      // NOTIFICATIONS
      if (msg.senderId !== authUser._id && !currentMuted.includes(chatId)) {
         const isChatInactive = !currentActiveChat || currentActiveChat.data._id !== chatId;
         if (isChatInactive) {
            let title = "";
            let senderName = "Someone";

            if (msg.group || msg.groupId) {
                let gName = msg.group?.name;
                if (!gName) {
                    const gId = msg.group?._id || msg.group || msg.groupId;
                    const foundGroup = currentGroups.find(g => g._id === gId);
                    if (foundGroup) gName = foundGroup.name;
                }
                title = `Message from ${gName || "Group"}`;
            } else {
                if (msg.sender && msg.sender.fullName) {
                    senderName = msg.sender.fullName;
                } else if (msg.senderId) {
                    const foundUser = currentPrivates.find(u => u._id === msg.senderId);
                    if (foundUser) senderName = foundUser.fullName;
                }
                title = `${senderName} sent you a message`;
            }

            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                try {
                    const bodyStr = msg.isViewOnce ? '📷 View Once Message' : (msg.text ? msg.text : (msg.image ? '📷 Photo' : (msg.video ? '🎥 Video' : (msg.audio ? '🎤 Voice Message' : 'New Message'))));
                    
                    if ("serviceWorker" in navigator) {
                        navigator.serviceWorker.ready.then((registration) => {
                            registration.showNotification(title, { 
                                body: bodyStr, 
                                icon: '/vite.svg',
                                vibrate: [200, 100, 200]
                            });
                        }).catch(err => {
                             new Notification(title, { body: bodyStr, icon: '/vite.svg' });
                        });
                    } else {
                        new Notification(title, { body: bodyStr, icon: '/vite.svg' });
                    }
                } catch(e) { console.log("Failed to show foreground Native Notification:", e); }
            }

            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-in fade-in slide-in-from-top-5' : 'animate-out fade-out slide-out-to-top-5'
                } px-6 py-3 bg-white/20 backdrop-blur-2xl border border-white/30 
                  shadow-2xl rounded-full pointer-events-auto 
                  flex items-center justify-center gap-3 transform transition-all duration-300 ease-out`}
                onClick={() => toast.dismiss(t.id)}
              >
                <span className="text-sm font-bold text-gray-900 drop-shadow-sm truncate max-w-[250px]">
                  {title}
                </span>
                <button onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                }} className="text-gray-900/50 hover:text-gray-900 hover:scale-110 transition-transform text-lg leading-none font-bold">
                    &times;
                </button>
              </div>
            ), { duration: 3000, position: "top-center" });
        }
      }
    };

    const onMessagesRead = ({ by }) => {
      const currentActiveChat = activeChatRef.current;
      if (currentActiveChat?.data?._id === by) {
        setMessages((prev) => prev.map((msg) => (msg.sender?._id === authUser._id || msg.senderId === authUser._id) ? { ...msg, status: "read" } : msg));
      }
    };

    const onDeleted = ({ messageId, chatId }) => {
      const currentActiveChat = activeChatRef.current;
      if (currentActiveChat && currentActiveChat.data._id === chatId) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, deleted: true, text: null, image: null, video: null, audio: null } : m)));
      }
    };

    const onViewOnceConsumed = ({ messageId, chatId }) => {
      const currentActiveChat = activeChatRef.current;
      if (currentActiveChat && currentActiveChat.data._id === chatId) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, image: null, video: null } : m)));
      }
    };

    const onGroupUpdate = (updatedGroup) => {
      const currentActiveChat = activeChatRef.current;
      setGroups((prev) => prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g)));
      if (currentActiveChat && currentActiveChat.data._id === updatedGroup._id) setActiveChat((prev) => ({ ...prev, data: updatedGroup }));
    };

    const onUserKicked = ({ groupId, userId }) => {
      const currentActiveChat = activeChatRef.current;
      if (userId === authUser._id) {
        if (currentActiveChat && currentActiveChat.data._id === groupId) { setActiveChat(null); setMessages([]); }
        setGroups((prev) => prev.filter((g) => g._id !== groupId));
        toast.error("Removed from group");
      } else { fetchGroups(); }
    };

    const onRequestAccepted = () => { 
        fetchPrivateChats(); 
        toast.success("New Connection!"); 
    };

    const onNewRequest = () => { fetchChatRequests(); toast("New Friend Request"); };
    
    const onGroupDeleted = (groupId) => { 
      const currentActiveChat = activeChatRef.current;
      setGroups((prev) => prev.filter(g => g._id !== groupId)); 
      if (currentActiveChat?.data?._id === groupId) { setActiveChat(null); setMessages([]); toast.error("Group deleted"); } 
    };
    
    const onGroupJoined = (newGroup) => { setGroups((prev) => [newGroup, ...prev]); toast.success(`Joined ${newGroup.name}`); };
    const onNewJoinRequest = () => { fetchGroups(); toast("New Group Join Request"); };
    const onBlockListUpdate = () => { fetchBlockedUsers(); };
    
    const onBlockedBy = ({ userId }) => {
      setPrivateChats((prev) => prev.map(u => 
        u._id === userId ? { ...u, blockedUsers: [...(u.blockedUsers || []), authUser._id] } : u
      ));
    };

    const onUnblockedBy = ({ userId }) => {
      setPrivateChats((prev) => prev.map(u => 
        u._id === userId ? { ...u, blockedUsers: (u.blockedUsers || []).filter(id => id !== authUser._id) } : u
      ));
    };

    socket.on("newMessage", onNewMessage);
    socket.on("messagesRead", onMessagesRead);
    socket.on("messageDeleted", onDeleted);
    socket.on("groupMessageDeleted", onDeleted);
    socket.on("groupUpdated", onGroupUpdate);
    socket.on("memberKicked", onUserKicked);
    socket.on("requestAccepted", onRequestAccepted); 
    socket.on("newChatRequest", onNewRequest); 
    socket.on("groupDeleted", onGroupDeleted);
    socket.on("groupJoined", onGroupJoined);
    socket.on("newJoinRequest", onNewJoinRequest);
    socket.on("blockListUpdate", onBlockListUpdate);
    socket.on("blockedBy", onBlockedBy);
    socket.on("unblockedBy", onUnblockedBy);
    socket.on("viewOnceConsumed", onViewOnceConsumed);

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("messagesRead", onMessagesRead);
      socket.off("messageDeleted", onDeleted);
      socket.off("groupMessageDeleted", onDeleted);
      socket.off("groupUpdated", onGroupUpdate);
      socket.off("memberKicked", onUserKicked);
      socket.off("requestAccepted", onRequestAccepted);
      socket.off("newChatRequest", onNewRequest);
      socket.off("groupDeleted", onGroupDeleted);
      socket.off("groupJoined", onGroupJoined);
      socket.off("newJoinRequest", onNewJoinRequest);
      socket.off("blockListUpdate", onBlockListUpdate);
      socket.off("blockedBy", onBlockedBy);
      socket.off("unblockedBy", onUnblockedBy);
      socket.off("viewOnceConsumed", onViewOnceConsumed);
    };
  }, [socket, authUser]);

  useEffect(() => { 
    if (authUser) { fetchGroups(); fetchPrivateChats(); fetchChatRequests(); fetchBlockedUsers(); } 
  }, [authUser]);

  return (
    <ChatContext.Provider value={{ 
        groups, privateChats, chatRequests, blockedUsers, activeChat, setActiveChat, messages, 
        unseenMessages, fetchMessages, sendMessage, deleteMessage, 
        sendChatRequest, acceptChatRequest, rejectChatRequest,
        approveGroupJoinRequest, rejectGroupJoinRequest,
        toggleBlockUser, toggleMuteChat, mutedChats, 
        showRightSidebar, toggleRightSidebar, fetchGroups, toggleArchiveChat
    }}>
      {children}
    </ChatContext.Provider>
  );
};
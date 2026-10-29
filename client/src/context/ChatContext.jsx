import { createContext, useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "./AuthContext.jsx";
import toast from "react-hot-toast";
import { saveMessages, getCachedMessages } from "../lib/messageCache";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { axios, socket, authUser, setAuthUser } = useContext(AuthContext);

  const [groups, setGroups] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [chatRequests, setChatRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [reminders, setReminders] = useState([]); // Global bell reminders
  const [blockedUsers, setBlockedUsers] = useState([]); 
  const [mutedChats, setMutedChats] = useState([]); 
  
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unseenMessages, setUnseenMessages] = useState({});

  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const toggleRightSidebar = () => setShowRightSidebar((p) => !p);

  // --- PERFORMANCE: PRELOAD NOTIFICATION SOUND ---
  const notificationSound = useRef(new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3"));

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
      const [inRes, outRes] = await Promise.all([
          axios.get("/api/chat-requests/incoming"),
          axios.get("/api/chat-requests/outgoing")
      ]);
      if (inRes.data.success) setChatRequests(inRes.data.requests);
      if (outRes.data.success) setOutgoingRequests(outRes.data.requests);
    } catch (error) { console.error(error); }
  };

  const fetchMyReminders = async () => {
    try {
      const { data } = await axios.get("/api/reminders/my");
      if (data.success) setReminders(data.reminders);
    } catch (e) { console.error(e); }
  };

  const createReminder = async (payload) => {
    try {
      const { data } = await axios.post("/api/reminders", payload);
      if (data.success) { toast.success("Reminder set!"); setReminders(prev => [...prev, data.reminder]); }
    } catch (err) { toast.error(err.response?.data?.message || "Failed to set reminder"); }
  };

  const deleteReminder = async (reminderId) => {
    try {
      await axios.delete(`/api/reminders/${reminderId}`);
      toast.success("Reminder cancelled");
      setReminders(prev => prev.filter(r => r._id !== reminderId));
    } catch (err) { toast.error(err.response?.data?.message || "Failed to cancel reminder"); }
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
    setShowRightSidebar(false); 
    
    setUnseenMessages((prev) => {
      const copy = { ...prev };
      delete copy[chat.data._id];
      return copy;
    });

    const targetRoomId = chat.type === "group" ? chat.data._id : [authUser?._id, chat.data._id].sort().join("_");

    // 1. Instant load from IndexedDB cache
    try {
      const cached = await getCachedMessages(targetRoomId);
      if (cached && cached.length > 0) {
        setMessages(cached);
      } else {
        setMessages([]);
      }
    } catch (e) {
      setMessages([]);
    }

    // 2. Refresh from server if online
    if (navigator.onLine) {
      try {
        const url = chat.type === "private" ? `/api/messages/${chat.data._id}` : `/api/group-messages/${chat.data._id}`;
        const { data } = await axios.get(url);
        if (data.success && Array.isArray(data.messages)) {
          const tagged = data.messages.map(m => ({ ...m, roomId: targetRoomId }));
          await saveMessages(tagged);
          const updated = await getCachedMessages(targetRoomId);
          setMessages(updated.length > 0 ? updated : data.messages);
        }
      } catch (error) { 
        console.error("fetchMessages online fetch error (showing cached):", error); 
      }
    }
  };

  const loadOlderMessages = async () => {
    if (!activeChat || messages.length === 0) return;
    const targetRoomId = activeChat.type === "group" ? activeChat.data._id : [authUser?._id, activeChat.data._id].sort().join("_");
    const oldest = messages[0].createdAt;
    let older = await getCachedMessages(targetRoomId, { before: oldest });

    if (older.length === 0 && navigator.onLine) {
      try {
        const { data } = await axios.get(`/api/messages?roomId=${encodeURIComponent(targetRoomId)}&before=${encodeURIComponent(oldest)}&limit=50`);
        if (data && Array.isArray(data)) {
          older = data.map(m => ({ ...m, roomId: targetRoomId }));
          await saveMessages(older);
        }
      } catch (e) {
        console.error("loadOlderMessages fetch error:", e);
      }
    }

    if (older && older.length > 0) {
      setMessages(prev => {
        const seen = new Set(prev.map(m => m._id));
        const filtered = older.filter(m => !seen.has(m._id));
        return [...filtered, ...prev];
      });
    }
  };

  // Reload when a message is queued, sent, or failed locally
  useEffect(() => {
    const reload = async () => {
      if (!activeChatRef.current || !authUser) return;
      const c = activeChatRef.current;
      const targetRoomId = c.type === "group" ? c.data._id : [authUser._id, c.data._id].sort().join("_");
      const cached = await getCachedMessages(targetRoomId);
      if (cached && cached.length > 0) {
        setMessages(cached);
      }
    };
    window.addEventListener("devchat:changed", reload);
    return () => window.removeEventListener("devchat:changed", reload);
  }, [authUser]);

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
        const targetRoomId = activeChat.type === "group" ? activeChat.data._id : [authUser?._id, activeChat.data._id].sort().join("_");
        const msgWithRoom = { ...res.data.message, roomId: targetRoomId };
        await saveMessages([msgWithRoom]);
        if (activeChat.type === "private") {
             setMessages((prev) => [...prev, msgWithRoom]);
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to send message";
      toast.error(errorMsg); 
    }
  };

  const deleteMessage = async (messageId, mode) => {
    try {
      // Optimistic UI update
      if (mode === "me") {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      } else if (mode === "everyone") {
        setMessages((prev) => prev.map((m) => 
          m._id === messageId ? { ...m, deleted: true, text: null, image: null, video: null, audio: null } : m
        ));
      }

      const endpoint = activeChat.type === "group" ? `/api/group-messages/${messageId}` : `/api/messages/message/${messageId}`;
      await axios.delete(endpoint, { data: { mode } });
    } catch (error) { 
      toast.error("Failed to delete"); 
    }
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

  const cancelChatRequest = async (requestId) => {
    try {
      const { data } = await axios.delete(`/api/chat-requests/${requestId}`);
      if (data.success) {
        toast.success("Request cancelled");
        setOutgoingRequests((prev) => prev.filter((r) => r._id !== requestId));
      }
    } catch (error) { toast.error("Failed to cancel request"); }
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

      const targetRoomId = msg.roomId || (msg.group?._id || msg.group || msg.groupId 
        ? (msg.group?._id || msg.group || msg.groupId)
        : [authUser._id, chatId].sort().join("_"));

      // Cache locally in IndexedDB
      saveMessages([{ ...msg, roomId: targetRoomId }]);

      if (msg.senderId && !msg.group && !currentPrivates.find(u => u._id === msg.senderId)) {
        fetchPrivateChats();
      }

      if (currentActiveChat && chatId === currentActiveChat.data._id) {
        // Real-time deduplication with pending local copy by clientId or _id
        setMessages((prev) => {
          if (msg.clientId && prev.some(m => m._id === msg.clientId || m.clientId === msg.clientId)) {
            return prev.map(m => (m._id === msg.clientId || m.clientId === msg.clientId) ? { ...msg, roomId: targetRoomId } : m);
          }
          if (prev.some(m => m._id === msg._id)) {
            return prev.map(m => m._id === msg._id ? { ...msg, roomId: targetRoomId } : m);
          }
          return [...prev, { ...msg, roomId: targetRoomId }];
        });
      } else {
        setUnseenMessages((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
      }

      // NOTIFICATIONS
      if (msg.senderId !== authUser._id && !currentMuted.includes(chatId)) {
         const isChatInactive = !currentActiveChat || currentActiveChat.data._id !== chatId;
         if (isChatInactive) {
            // PLAY PRELOADED NOTIFICATION SOUND
            try {
               notificationSound.current.currentTime = 0;
               notificationSound.current.volume = 0.5;
               notificationSound.current.play().catch(e => {});
            } catch(e) {}

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
      if (currentActiveChat && currentActiveChat.data._id === groupId && authUser._id === userId) {
        setActiveChat(null);
        toast.error("You were removed from this group");
        fetchGroups();
      } else {
        fetchGroups();
      }
    };

    const onRequestAccepted = ({ senderId }) => { fetchPrivateChats(); };
    const onNewRequest = () => { fetchChatRequests(); toast("New Chat Request!"); };
    
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

    // Both newMessage and message:new event listeners
    socket.on("newMessage", onNewMessage);
    socket.on("message:new", onNewMessage);
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

    // ── Reminder socket listeners ──────────────────────────────
    const onNewReminder = (reminder) => {
      setReminders(prev => prev.find(r => r._id === reminder._id) ? prev : [...prev, reminder]);
    };
    const onReminderDeleted = ({ reminderId }) => {
      setReminders(prev => prev.filter(r => r._id !== reminderId));
    };
    const onReminderExecuted = (reminder) => {
      toast(`⏰ Reminder: ${reminder.text}`, { duration: 6000, icon: "🔔" });
    };
    const onReminderWarning = (reminder) => {
      toast(`⚠️ Reminder in 15 mins: ${reminder.text}`, { duration: 6000, icon: "⏰" });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification("⏰ Reminder in 15 minutes", { body: reminder.text, icon: "/vite.svg" }); } catch(e) {}
      }
    };

    socket.on("newReminder", onNewReminder);
    socket.on("reminderDeleted", onReminderDeleted);
    socket.on("reminderExecuted", onReminderExecuted);
    socket.on("reminderWarning", onReminderWarning);

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("message:new", onNewMessage);
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
      socket.off("newReminder", onNewReminder);
      socket.off("reminderDeleted", onReminderDeleted);
      socket.off("reminderExecuted", onReminderExecuted);
      socket.off("reminderWarning", onReminderWarning);
    };
  }, [socket, authUser]);

  useEffect(() => { 
    if (authUser) { fetchGroups(); fetchPrivateChats(); fetchChatRequests(); fetchBlockedUsers(); fetchMyReminders(); } 
  }, [authUser]);

  return (
    <ChatContext.Provider value={{ 
        groups, privateChats, chatRequests, blockedUsers, activeChat, setActiveChat, messages,
        unseenMessages, fetchMessages, sendMessage, deleteMessage, loadOlderMessages,
        showRightSidebar,
        outgoingRequests,
        toggleRightSidebar,
        fetchGroups,
        fetchPrivateChats,
        fetchChatRequests,
        fetchBlockedUsers,
        sendChatRequest,
        acceptChatRequest,
        rejectChatRequest,
        cancelChatRequest,
        approveGroupJoinRequest, rejectGroupJoinRequest,
        toggleBlockUser, toggleMuteChat, mutedChats, 
        toggleArchiveChat,
        reminders, fetchMyReminders, createReminder,
        deleteReminder: deleteReminder,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

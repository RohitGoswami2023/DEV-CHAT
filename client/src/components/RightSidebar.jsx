import { useContext, useState, useEffect } from "react";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import assets from "../assets/assets";

const RightSidebar = () => {
  const { 
    activeChat, messages, setActiveChat, fetchGroups, fetchMessages, 
    toggleBlockUser, blockedUsers, 
    toggleMuteChat, mutedChats,
    toggleRightSidebar,
    reminders, createReminder, deleteReminder,
  } = useContext(ChatContext);
  
  const { authUser, axios } = useContext(AuthContext);

  const [showMembers, setShowMembers] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [confirmBox, setConfirmBox] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIcon, setEditIcon] = useState(null);

  const [openMenu, setOpenMenu] = useState(null);

  // Reminder form
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [sendReminderEmail, setSendReminderEmail] = useState(false);

  // Scheduled message form
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [schedText, setSchedText] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [isSavingSched, setIsSavingSched] = useState(false);
  const [myScheduled, setMyScheduled] = useState([]);

  if (!activeChat) return null;

  const isGroup = activeChat.type === "group";
  const data = activeChat.data;

  // Helper
  const isBlocked = (uid) => blockedUsers?.some(u => u._id === uid);
  const isMuted = mutedChats.includes(data._id); // Check mute status

  const media = messages?.filter((m) => m.image)?.map((m) => m.image) || [];

  const adminIds = isGroup
    ? data?.admins?.map((a) => (typeof a === "object" ? a._id?.toString() : a.toString())).filter(Boolean) || []
    : [];

  const isAdmin = isGroup && authUser?._id && adminIds.includes(authUser._id.toString());

  const promote = async (userId) => {
    try {
      await axios.post("/api/groups/promote", { groupId: data._id, userId });
      toast.success("Promoted to admin");
      setOpenMenu(null);
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const demote = async (userId) => {
    try {
      await axios.post("/api/groups/demote", { groupId: data._id, userId });
      toast.success("Admin demoted");
      setOpenMenu(null);
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const kickMember = async (userId) => {
    if (!window.confirm("Remove this member from group?")) return;
    try {
      await axios.post("/api/groups/kick", { groupId: data._id, userId });
      toast.success("Member removed");
      setOpenMenu(null);
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const approveRequest = async (userId) => {
    try {
      await axios.post("/api/groups/approve", { groupId: data._id, userId });
      toast.success("User added to group");
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const rejectRequest = async (userId) => {
    try {
      await axios.post("/api/groups/reject", { groupId: data._id, userId });
      toast.success("Request rejected");
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const confirmAction = async () => {
    try {
      const url = confirmBox === "leave" ? "/api/groups/leave" : "/api/groups/delete";
      await axios.post(url, { groupId: data._id });
      toast.success(confirmBox === "leave" ? "Left group" : "Group deleted");
      setActiveChat(null);
      setConfirmBox(null);
      if (fetchGroups) fetchGroups();
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const handleDirectMessage = (member) => {
    setOpenMenu(null);
    fetchMessages({ type: "private", data: member });
  };

  useEffect(() => {
    if (isGroup && data) {
      setEditName(data.name || "");
      setEditDesc(data.description || "");
      setEditIcon(null);
    }
  }, [data, isGroup]);

  const saveGroupEdit = async () => {
    try {
      await axios.put("/api/groups/update", { groupId: data._id, name: editName, description: editDesc, groupIcon: editIcon });
      toast.success("Group updated");
      setEditOpen(false);
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setEditIcon(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    // UPDATED: w-full for mobile, lg:w-[380px] for desktop
    <div className="h-full w-full lg:w-[380px] bg-white/10 backdrop-blur-2xl border-l border-black/20 p-5 space-y-6 relative overflow-y-auto scrollbar-hide shadow-2xl">
      
      {/* MOBILE ONLY: Back Button to return to ChatContainer */}
      <div className="lg:hidden mb-2">
        <button 
            onClick={toggleRightSidebar} 
            className="flex items-center gap-2 text-sm font-bold bg-white/20 px-4 py-2 rounded-full"
        >
            ✕ Close Details
        </button>
      </div>

      {/* PROFILE SECTION */}
      <div className="text-center space-y-3 p-4 rounded-3xl bg-black/5 border border-white/10 transition-all hover:bg-black/10">
        <img
          src={isGroup ? data?.groupIcon || assets.group_icon : data?.profilePic || assets.avatar_icon}
          className="w-28 h-28 rounded-full mx-auto border-4 border-white/20 object-cover shadow-lg transform transition-transform hover:scale-110"
          alt="icon"
        />
        <div>
          <h2 className="font-black text-xl tracking-tight">{isGroup ? data?.name : data?.fullName}</h2>
          {isGroup && <p className="text-[10px] uppercase font-bold opacity-40 tracking-widest mt-1">Group ID: {data?.groupId}</p>}
        </div>
        {isGroup && data?.description && (
          <p className="text-sm opacity-70 leading-relaxed italic px-2">"{data?.description}"</p>
        )}
      </div>

      {/* 🔥 MUTE BUTTON */}
      <div className="w-full">
        <button 
          onClick={() => toggleMuteChat(data._id)}
          className={`w-full py-3 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2
            ${isMuted 
              ? "bg-orange-500/10 border border-orange-500/30 text-orange-600 hover:bg-orange-500/20" 
              : "bg-white/40 border border-white/20 text-gray-800 hover:bg-white/60"
            }`}
        >
          {isMuted ? "🔕 Unmute Notifications" : "🔔 Mute Notifications"}
        </button>
      </div>

      {/* EDIT ACTION */}
      {isGroup && isAdmin && (
        <button onClick={() => setEditOpen(true)} className="w-full py-3 rounded-2xl bg-black text-white font-bold text-sm shadow-xl transition-all hover:bg-zinc-800 hover:scale-[1.02] active:scale-95">
          Edit Group Settings
        </button>
      )}

      {/* MEDIA SECTION */}
      <div className="space-y-2">
        <button onClick={() => setShowMedia(!showMedia)} className="w-full flex justify-between items-center font-black text-sm uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity">
          Shared Media <span>{showMedia ? "−" : "+"}</span>
        </button>
        {showMedia && (
          <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {media.length ? (
              media.map((img, i) => (
                <img key={i} src={img} className="rounded-2xl cursor-pointer h-24 w-full object-cover border border-white/20 shadow-md transition-all hover:scale-105 hover:brightness-110" onClick={() => window.open(img, "_blank")} alt="media" />
              ))
            ) : (
              <p className="text-xs opacity-40 col-span-2 text-center py-4">No media found</p>
            )}
          </div>
        )}
      </div>

      {/* JOIN REQUESTS */}
      {isGroup && isAdmin && data?.joinRequests?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-black text-sm uppercase tracking-wider opacity-60">Pending Requests</h3>
          <div className="space-y-2">
            {data.joinRequests.map((r) => {
              const user = r.user; 
              const uid = user?._id;
              if (!uid) return null;
              return (
                <div key={uid} className="flex justify-between items-center bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30 shadow-sm hover:scale-[1.02] transition-all">
                  <div className="flex items-center gap-3">
                    <img src={user?.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full object-cover border border-white/40" alt="u" />
                    <p className="text-sm font-bold truncate max-w-[100px]">{user?.fullName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveRequest(uid)} className="px-3 py-1.5 text-[10px] font-black uppercase rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors">Accept</button>
                    <button onClick={() => rejectRequest(uid)} className="px-3 py-1.5 text-[10px] font-black uppercase rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors">Refuse</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MEMBERS SECTION */}
      {isGroup && (
        <div className="space-y-3">
          <button onClick={() => setShowMembers(!showMembers)} className="w-full flex justify-between items-center font-black text-sm uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity">
            Members ({data?.members?.length || 0}) <span>{showMembers ? "−" : "+"}</span>
          </button>
          {showMembers && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              {data?.members?.map((m) => {
                if (!m?._id) return null;
                const id = m._id.toString();
                const isGroupAdmin = adminIds.includes(id);
                const userBlocked = isBlocked(id);
                const showMenu = (isAdmin && id !== authUser?._id?.toString()) || (id !== authUser?._id?.toString());

                return (
                  <div key={id} className={`relative flex justify-between items-center bg-white/10 p-3 rounded-2xl border border-white/10 transition-all hover:bg-white/20 hover:scale-[1.01] ${userBlocked ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3">
                      <img src={m.profilePic || assets.avatar_icon} className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-sm" alt="m" />
                      <div className="flex flex-col">
                        <p className="text-sm font-bold truncate max-w-[140px]">{m.fullName}</p>
                        {isGroupAdmin && <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">Administrator</span>}
                      </div>
                    </div>
                    
                    {/* Menu Button */}
                    {id !== authUser?._id?.toString() && (
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === id ? null : id)} className="p-1 font-black text-xl hover:opacity-50">⋮</button>
                        
                        {openMenu === id && (
                          <div className="absolute right-0 top-8 bg-zinc-900 text-white rounded-2xl w-44 z-50 shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-100">
                            
                            <button onClick={() => handleDirectMessage(m)} className="block w-full px-4 py-3 text-left text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-tight">Send Message</button>
                            
                            <button onClick={() => { toggleBlockUser(id); setOpenMenu(null); }} className={`block w-full px-4 py-3 text-left text-xs font-bold transition-colors uppercase tracking-tight border-t border-white/5 ${userBlocked ? "text-green-500 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10"}`}>
                                {userBlocked ? "Unblock User" : "Block User"}
                            </button>

                            {isAdmin && (
                                <>
                                <button onClick={() => (isGroupAdmin ? demote(id) : promote(id))} className="block w-full px-4 py-3 text-left text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-tight border-t border-white/5">
                                {isGroupAdmin ? "Remove Admin Role" : "Make Administrator"}
                                </button>
                                <button onClick={() => kickMember(id)} className="block w-full px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors uppercase tracking-tight border-t border-white/5">Kick from Group</button>
                                </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ⏰ REMINDERS (personal bell only) ═══════════ */}
      {activeChat && (
        <div className="space-y-3">
          <button
            onClick={() => setShowReminderForm(v => !v)}
            className="w-full flex justify-between items-center font-black text-sm uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
          >
            ⏰ Reminders <span>{showReminderForm ? "−" : "+"}</span>
          </button>
          <p className="text-[10px] opacity-40 -mt-1">Personal bell notification — no message sent to chat</p>

          {showReminderForm && (
            <div className="space-y-3 bg-black/5 rounded-2xl p-4 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <textarea
                value={reminderText}
                onChange={e => setReminderText(e.target.value)}
                placeholder="What to remind you about?"
                rows={2}
                className="w-full px-4 py-3 rounded-2xl bg-white/20 border border-white/30 text-sm font-bold outline-none resize-none placeholder-white/30 focus:border-white/60 transition-all"
              />
              <div className="flex items-center gap-2 ml-1">
                <input type="checkbox" id="sendEmail" checked={sendReminderEmail}
                  className="w-4 h-4 cursor-pointer accent-indigo-500"
                  onChange={e => setSendReminderEmail(e.target.checked)} />
                <label htmlFor="sendEmail" className="text-[10px] font-black uppercase opacity-60 cursor-pointer">Email Notification</label>
              </div>
              <input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/20 border border-white/30 text-sm font-bold outline-none focus:border-white/60 transition-all" />
              <button disabled={isSavingReminder} onClick={async () => {
                if (!reminderText.trim() || !reminderDate) return toast.error("Fill both fields");
                if (isSavingReminder) return; 
                setIsSavingReminder(true);
                try {
                  await createReminder({ text: reminderText.trim(), chatId: data._id, isGroup, scheduledAt: new Date(reminderDate).toISOString(), sendEmail: sendReminderEmail });
                  setReminderText(""); setReminderDate(""); setShowReminderForm(false);
                } finally { setIsSavingReminder(false); }
              }}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all ${
                  isSavingReminder ? "bg-indigo-400 text-white cursor-not-allowed opacity-70" : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"}`}>
                {isSavingReminder ? "⏳ Saving..." : "✓ Set Reminder"}
              </button>
            </div>
          )}

          {/* Active reminders for this chat */}
          {reminders.filter(r => r.chatId === data._id).map(rem => (
            <div key={rem._id} className="flex justify-between items-center bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-3 gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{rem.text}</p>
                <p className="text-[10px] opacity-50 mt-0.5">{new Date(rem.scheduledAt).toLocaleString()}</p>
              </div>
              {(rem.creatorId?._id === authUser?._id || (isGroup && adminIds.includes(authUser?._id?.toString()))) && (
                <button onClick={() => deleteReminder(rem._id)} className="text-red-400 hover:text-red-600 font-black text-lg leading-none">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ 📅 SCHEDULE MESSAGE (private only) ═══════════ */}
      {activeChat && !isGroup && (
        <div className="space-y-3">
          <button
            onClick={async () => {
              setShowSchedForm(v => !v);
              if (!showSchedForm) {
                try {
                  const { data: d } = await axios.get("/api/scheduled/my");
                  setMyScheduled(d.scheduled.filter(s => s.receiverId?._id === activeChat.data._id || s.receiverId === activeChat.data._id));
                } catch (e) {}
              }
            }}
            className="w-full flex justify-between items-center font-black text-sm uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
          >
            📅 Schedule Message <span>{showSchedForm ? "−" : "+"}</span>
          </button>
          <p className="text-[10px] opacity-40 -mt-1">Auto-sent to this chat at the chosen time</p>

          {showSchedForm && (
            <div className="space-y-3 bg-black/5 rounded-2xl p-4 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <textarea
                value={schedText}
                onChange={e => setSchedText(e.target.value)}
                placeholder="Message to send automatically..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-white/20 border border-white/30 text-sm font-bold outline-none resize-none placeholder-white/30 focus:border-white/60 transition-all"
              />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-40 ml-1">Send At</label>
                <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/20 border border-white/30 text-sm font-bold outline-none focus:border-white/60 transition-all" />
              </div>
              <button disabled={isSavingSched} onClick={async () => {
                if (!schedText.trim() || !schedDate) return toast.error("Fill both fields");
                const at = new Date(schedDate);
                if (at <= new Date()) return toast.error("Choose a future time");
                setIsSavingSched(true);
                try {
                  const { data: d } = await axios.post("/api/scheduled", { receiverId: activeChat.data._id, text: schedText.trim(), scheduledAt: at.toISOString() });
                  setMyScheduled(prev => [...prev, d.scheduled]);
                  setSchedText(""); setSchedDate("");
                  toast.success("Message scheduled!");
                } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
                finally { setIsSavingSched(false); }
              }}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all ${
                  isSavingSched ? "bg-emerald-400 text-white cursor-not-allowed opacity-70" : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"}`}>
                {isSavingSched ? "⏳ Scheduling..." : "📤 Schedule Send"}
              </button>

              {/* Pending list */}
              {myScheduled.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-black uppercase opacity-40">Pending</p>
                  {myScheduled.map(s => (
                    <div key={s._id} className="flex justify-between items-start bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{s.text}</p>
                        <p className="text-[10px] opacity-50 mt-0.5">Sends: {new Date(s.scheduledAt).toLocaleString()}</p>
                      </div>
                      <button onClick={async () => {
                        try {
                          await axios.delete(`/api/scheduled/${s._id}`);
                          setMyScheduled(prev => prev.filter(m => m._id !== s._id));
                          toast.success("Cancelled");
                        } catch (e) { toast.error("Failed to cancel"); }
                      }} className="text-red-400 hover:text-red-600 font-black text-lg leading-none">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Access Toggle (Group Admins only) */}
      {isGroup && isAdmin && (
        <div className="space-y-2">
          <p className="font-black text-[10px] uppercase tracking-wider opacity-40">New Member History</p>
          <div className="flex rounded-2xl overflow-hidden border border-white/20">
            {["all", "from_join"].map(opt => (
              <button
                key={opt}
                onClick={async () => {
                  try {
                    await axios.put("/api/groups/update", { groupId: data._id, historyAccess: opt });
                    toast.success(opt === "all" ? "Full history visible" : "New members see from join only");
                  } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
                }}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-tighter transition-colors
                  ${ data.historyAccess === opt || (!data.historyAccess && opt === "all")
                    ? "bg-black text-white"
                    : "bg-white/10 text-gray-500 hover:bg-white/20"
                  }`}
              >
                {opt === "all" ? "Full History" : "From Join"}
              </button>
            ))}
          </div>
        </div>
      )}
      {!isGroup && activeChat && (
        <div className="pt-4 border-t border-white/10 mt-auto">
             <button 
                onClick={() => toggleBlockUser(data._id)}
                className={`w-full py-3 rounded-2xl font-bold text-sm shadow-sm transition-all border ${
                    isBlocked(data._id) 
                    ? "bg-green-600/10 border-green-500/30 text-green-500 hover:bg-green-600/20" 
                    : "bg-red-600/10 border-red-500/30 text-red-600 hover:bg-red-600/20"
                }`}
             >
                {isBlocked(data._id) ? "Unblock User" : "Block User"}
             </button>
        </div>
      )}

      {/* BOTTOM ACTIONS (Group) */}
      {isGroup && (
        <div className="space-y-3 pt-4 border-t border-black/10">
          <button onClick={() => setConfirmBox("leave")} className="w-full py-3 rounded-2xl bg-white/20 border border-white/40 font-bold text-sm shadow-sm transition-all hover:bg-white/30 hover:scale-[1.02]">
            Leave Group
          </button>
          {isAdmin && (
            <button onClick={() => setConfirmBox("delete")} className="w-full py-3 rounded-2xl bg-red-600/10 border border-red-500/30 font-bold text-red-600 text-sm shadow-sm transition-all hover:bg-red-600/20 hover:scale-[1.02]">
              Dissolve Group
            </button>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmBox && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] w-full max-w-[340px] text-white shadow-2xl text-center animate-in zoom-in duration-200">
            <p className="font-black text-lg mb-2 uppercase tracking-tight">Are you sure?</p>
            <p className="text-sm opacity-50 mb-8 lowercase leading-tight">This action regarding the {confirmBox} process cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={confirmAction} className="flex-1 py-4 bg-red-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all active:scale-95">Confirm</button>
              <button onClick={() => setConfirmBox(null)} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-700 transition-all active:scale-95">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT GROUP INFO MODAL */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white border border-black/10 p-8 rounded-[32px] w-full max-w-[360px] shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-black text-xl text-black mb-6 uppercase tracking-tighter">Group Settings</h3>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Group name" className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-black transition-all outline-none text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2">Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Describe this group..." className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-black transition-all outline-none text-sm font-bold resize-none h-24" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2">Group Icon</label>
                <input type="file" accept="image/*" onChange={handleIconChange} className="w-full text-xs font-bold text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-black file:text-white" />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={saveGroupEdit} className="flex-1 py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl">Update</button>
                <button onClick={() => setEditOpen(false)} className="flex-1 py-4 bg-gray-100 text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 active:scale-95 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;

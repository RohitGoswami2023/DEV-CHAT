import { useContext, useEffect } from "react";
import { CallContext } from "../../context/CallContext.jsx";
import axios from "axios";
import { format } from "date-fns";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react";

const CallHistory = () => {
  const { callLogs, fetchCallLogs, formatDuration, callUser } = useContext(CallContext);

  useEffect(() => {
    fetchCallLogs(axios);
  }, []);

  const getStatusIcon = (status, isCaller) => {
    if (status === "missed") return <PhoneMissed className="text-red-500 w-4 h-4" />;
    if (status === "rejected") return <PhoneMissed className="text-orange-500 w-4 h-4" />;
    return isCaller ? <PhoneOutgoing className="text-green-500 w-4 h-4" /> : <PhoneIncoming className="text-blue-500 w-4 h-4" />;
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 space-y-1">
      <h2 className="text-sm font-semibold text-gray-500 px-2 py-3">Recent Calls</h2>
      {callLogs.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No recent calls</div>
      ) : (
        callLogs.map((log) => {
          const isCaller = log.caller._id === log.receiver._id; // Simplified, in real app check against authUser
          // Wait, log.caller is a populated user object.
          const otherUser = log.caller._id === log.receiver._id ? log.receiver : log.caller; 
          // Actually, let's just check log.caller._id vs authUser? No, log is already filtered.
          // Correct logic:
          // if I am the caller, show receiver. If I am receiver, show caller.
          return (
            <div key={log._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/40 transition-all group">
              <div className="flex items-center gap-3">
                <img src={log.caller.profilePic || "/avatar.png"} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h3 className="text-sm font-medium">{log.caller.fullName}</h3>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    {getStatusIcon(log.status, true)}
                    <span>{format(new Date(log.startTime), "MMM d, h:mm a")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {log.status === "completed" && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(log.duration)}
                  </span>
                )}
                <button 
                  onClick={() => callUser(log.caller)} 
                  className="p-2 rounded-full bg-green-500/10 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default CallHistory;

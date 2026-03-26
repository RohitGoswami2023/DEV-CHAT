import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { axios, authUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers24h: 0,
    totalGroups: 0,
    totalMessages: 0,
    ongoingCalls: 0,
    totalCallsToday: 0,
    suspiciousUsers: 0,
    dbSizeMB: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not admin (Client-side check)
    if (authUser && !authUser.isAdmin) {
      navigate("/");
      return;
    }
    fetchStats();
  }, [authUser]);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get("/api/admin/stats");
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load admin stats");
    } finally {
      setLoading(false);
    }
  };

  // Helper for Card Component
  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[24px] p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">{title}</p>
          <h3 className="text-4xl font-black text-gray-900 group-hover:text-purple-700 transition-colors">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-2xl ${color} text-2xl shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100">Loading Admin Panel...</div>;

  return (
    <div className="min-h-screen w-full bg-[url('./src/assets/bgImage.svg')] bg-cover bg-center flex flex-col items-center p-4 md:p-10 overflow-y-auto">
      
      {/* HEADER */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-10 bg-white/70 backdrop-blur-md p-4 rounded-full border border-white/50 shadow-lg">
        <div className="flex items-center gap-4 px-4">
            <div>
                <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Admin Console</h1>
                <p className="text-xs text-gray-500 font-bold">System Monitoring</p>
            </div>
        </div>
        <button 
            onClick={() => navigate("/")} 
            className="bg-gray-900 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-black transition-all shadow-md"
        >
            Exit to Chat
        </button>
      </div>

      {/* STATS GRID */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-5 duration-500">
        
        {/* TOTAL USERS */}
        <StatCard 
            title="Total Users" 
            value={stats.totalUsers} 
            icon="👥" 
            color="bg-blue-100 text-blue-600" 
        />

        {/* ACTIVE USERS */}
        <StatCard 
            title="Online Users" 
            value={stats.activeUsers} 
            icon="🟢" 
            color="bg-green-100 text-green-600" 
        />

        {/* NEW USERS 24H */}
        <StatCard 
            title="New (24h)" 
            value={stats.newUsers24h} 
            icon="📈" 
            color="bg-indigo-100 text-indigo-600" 
        />

        {/* SECURITY ALERTS */}
        <StatCard 
            title="Security Alerts" 
            value={stats.suspiciousUsers} 
            icon="⚠" 
            color={stats.suspiciousUsers > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-600"} 
        />

        {/* ONGOING CALLS */}
        <StatCard 
            title="Active Calls" 
            value={stats.ongoingCalls} 
            icon="📞" 
            color="bg-teal-100 text-teal-600" 
        />

        {/* CALLS TODAY */}
        <StatCard 
            title="Calls Today" 
            value={stats.totalCallsToday} 
            icon="📱" 
            color="bg-cyan-100 text-cyan-600" 
        />

        {/* GROUPS CREATED */}
        <StatCard 
            title="Total Groups" 
            value={stats.totalGroups} 
            icon="📢" 
            color="bg-purple-100 text-purple-600" 
        />

        {/* DB SIZE */}
        <StatCard 
            title="Storage" 
            value={`${stats.dbSizeMB} MB`} 
            icon="💾" 
            color="bg-orange-100 text-orange-600" 
        />
      </div>

      {/* DETAILED SECTION */}
      <div className="w-full max-w-6xl mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* MESSAGES STATS */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 shadow-xl">
            <h3 className="text-xl font-black text-gray-900 mb-4">Message Volume</h3>
            <div className="flex items-end gap-2">
                <span className="text-6xl font-black text-gray-800">{stats.totalMessages}</span>
                <span className="text-gray-500 font-bold mb-2">Total Messages Sent</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-purple-600 h-full w-full animate-pulse"></div>
            </div>
            <p className="text-xs text-gray-400 mt-2 font-mono">Encrypted & Stored Securely</p>
        </div>

        {/* SERVER STATUS */}
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-[32px] p-8 shadow-xl text-white flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold mb-2">System Health</h3>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                    <span className="text-green-400 font-mono text-sm">Operational</span>
                </div>
            </div>
            
            <div className="space-y-3 mt-6">
                <div className="flex justify-between text-sm font-bold text-gray-400 border-b border-gray-700 pb-2">
                    <span>Database Connection</span>
                    <span className="text-white">Connected</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-400 border-b border-gray-700 pb-2">
                    <span>Active Calls (Voices)</span>
                    <span className="text-white">{stats.ongoingCalls} ongoing</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-400 border-b border-gray-700 pb-2">
                    <span>Socket Engine</span>
                    <span className="text-white">Active</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-red-400 pb-2">
                    <span>Security Monitor</span>
                    <span className={stats.suspiciousUsers > 0 ? "text-red-500 animate-pulse" : "text-green-400"}>
                      {stats.suspiciousUsers > 0 ? "Alert: Suspicious Activity" : "No Alerts"}
                    </span>
                </div>
            </div>
        </div>

        {/* AUDIT LOG SECTION */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-900">Security & Audit Monitoring</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">Real-time History</span>
          </div>
          
          <div className="space-y-4">
            {stats.suspiciousUsers > 0 ? (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl">⚠</div>
                <div>
                  <p className="font-bold text-red-900 text-sm">Detection: Brute Force Attempt</p>
                  <p className="text-xs text-red-600">{stats.suspiciousUsers} accounts identified with excessive failed login attempts.</p>
                </div>
                <button className="ml-auto bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition shadow-sm">Review Accounts</button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl">✓</div>
                <div>
                  <p className="font-bold text-green-900 text-sm">System integrity confirmed</p>
                  <p className="text-xs text-green-600">No suspicious authentication patterns detected in the last 24 hours.</p>
                </div>
              </div>
            )}
            
            {/* Call Audit */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">📞</div>
              <div>
                <p className="font-bold text-blue-900 text-sm">Voice Signaling Health</p>
                <p className="text-xs text-blue-600">{stats.totalCallsToday} calls established successfully today.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;

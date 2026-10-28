import React, { useState, useContext } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ShieldCheck,
    Zap,
    PhoneCall,
    EyeOff,
    Lock,
    Bell,
    Users,
    Calendar,
    MapPin,
    Sparkles,
    ExternalLink,
    Mail,
    Loader2,
    CheckCircle2,
    Layers,
    Activity,
    Phone
} from "lucide-react";

// ====================================================================
// 👇 PROJECT & DEVELOPER METADATA
// ====================================================================
const PROJECT_DETAILS = {
    name: "Dev Chat",
    edition: "Enterprise Grade 1.1",
    tagline: "Ultra-Fast, Secure & Intelligent Real-Time Collaboration.",
    description: "Dev Chat is an end-to-end encrypted messaging workspace built for modern software teams and developers. Engineered with high-fidelity WebRTC voice calls, view-once media self-destruction, scheduled delivery, and live geo-collaboration.",
    features: [
        { label: "Google OAuth 2.0", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { label: "WebRTC HD Voice", icon: PhoneCall, color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { label: "View-Once Media", icon: EyeOff, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { label: "Socket.io Engine", icon: Zap, color: "text-purple-600", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { label: "E2E Encryption", icon: Lock, color: "text-indigo-600", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
        { label: "Cloud Push FCM", icon: Bell, color: "text-rose-600", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        { label: "Group Channels", icon: Users, color: "text-teal-600", bg: "bg-teal-500/10", border: "border-teal-500/20" },
        { label: "Timed Delivery", icon: Calendar, color: "text-cyan-600", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
        { label: "Live Geolocation", icon: MapPin, color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/20" }
    ],
    stats: [
        { value: "< 25ms", label: "Socket Latency" },
        { value: "256-bit", label: "AES Security" },
        { value: "99.9%", label: "Uptime SLA" }
    ]
};

const DEVELOPER_DETAILS = {
    name: "Rohit Raj",
    role: "Full-Stack Engineer & B.Tech CSE",
    university: "Graphic Era Hill University",
    bio: "Passionate software engineer specializing in scalable distributed web applications, WebSockets, real-time protocols, and cloud computing architectures.",
    contact: "+91 9693220586",
    linkedin: "https://www.linkedin.com/in/rohit-raj-7ba581322",
    instagram: "https://www.instagram.com/rohit__goswami._?igsh=MTIyYTVjaWNxZW1uMA==",
    email: "mailto:goswamirohit2830@gmail.com"
};

const LoginPage = () => {
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const navigate = useNavigate();
    const { googleLoginSuccess } = useContext(AuthContext);

    // ---------------- GOOGLE LOGIN HANDLER ----------------
    const handleGoogleLogin = async (credentialResponse) => {
        setIsAuthenticating(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
            const res = await axios.post(
                `${backendUrl}/api/auth/google-login`,
                { token: credentialResponse.credential }
            );

            if (res.data.success) {
                toast.success("Welcome back to Dev Chat!");
                googleLoginSuccess(res.data.token, res.data.userData);
                navigate("/");
            } else {
                toast.error(res.data.message || "Authentication failed");
            }
        } catch (error) {
            console.error("Google login error:", error);
            toast.error(error.response?.data?.message || "Google sign-in failed. Please try again.");
        } finally {
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-[url('/bgImage.svg')] bg-cover bg-center bg-fixed flex flex-col items-center justify-between p-4 md:p-8 lg:p-12 overflow-x-hidden">
            
            {/* Ambient Multi-Layer Glow Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-purple-500/20 via-indigo-500/15 to-cyan-400/10 rounded-full blur-[140px] animate-pulse"></div>
                <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-blue-500/15 rounded-full blur-[120px]"></div>
                <div className="absolute top-10 right-10 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[130px]"></div>
            </div>

            {/* Top Glass Brand Header */}
            <header className="w-full max-w-6xl flex items-center justify-between py-4 px-6 md:px-8 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-20 mb-8 transition-all hover:bg-white/50">
                <div className="flex items-center gap-3">
                    <img 
                        src={assets.logo_big} 
                        alt="Dev Chat" 
                        className="w-9 h-9 object-contain drop-shadow"
                    />
                    <div>
                        <span className="text-lg font-black tracking-tight text-gray-900 flex items-center gap-1.5">
                            DevChat <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                        </span>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 -mt-0.5">Workspace</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>SSO Operational</span>
                    </div>
                    <span className="text-xs font-bold text-gray-600 bg-white/80 border border-gray-200/80 px-3 py-1 rounded-full shadow-sm">
                        v1.1 Stable
                    </span>
                </div>
            </header>

            {/* === MAIN LOGIN HERO CONTAINER === */}
            <main className="w-full max-w-xl z-20 flex flex-col items-center my-auto">
                <div className="w-full bg-white/70 backdrop-blur-3xl border border-white/80 rounded-[40px] shadow-[0_25px_60px_-15px_rgba(79,70,229,0.18)] p-8 sm:p-12 flex flex-col items-center text-center relative overflow-hidden transition-all duration-500 hover:shadow-[0_30px_70px_-10px_rgba(79,70,229,0.25)]">
                    
                    {/* Glass Specular Top Highlight */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl pointer-events-none"></div>

                    {/* Logo with Glow Ring */}
                    <div className="relative mb-6 group cursor-pointer">
                        <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition-all duration-700"></div>
                        <div className="relative w-24 h-24 rounded-3xl bg-white/90 p-4 shadow-xl border border-white flex items-center justify-center transform transition-transform duration-500 group-hover:scale-105">
                            <img 
                                src={assets.logo_big} 
                                alt="Dev Chat Icon" 
                                className="w-full h-full object-contain drop-shadow" 
                            />
                        </div>
                    </div>

                    {/* Typography */}
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight mb-2">
                        Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-indigo-700 to-cyan-600">Dev Chat</span>
                    </h1>
                    
                    <p className="text-gray-600 text-sm sm:text-base font-medium max-w-md mb-8 leading-relaxed">
                        Seamless real-time messaging, crystal-clear voice calling, and encrypted team collaboration.
                    </p>

                    {/* === GOOGLE SIGN IN CARD === */}
                    <div className="w-full max-w-md bg-white/80 border border-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col items-center gap-4 relative">
                        
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Instant One-Click Login</span>
                        </div>

                        {isAuthenticating ? (
                            <div className="flex items-center justify-center gap-3 py-3.5 px-8 rounded-full bg-purple-50 border border-purple-200 text-purple-800 font-bold text-sm w-full animate-pulse shadow-sm">
                                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                                <span>Authenticating with Google...</span>
                            </div>
                        ) : (
                            <div className="w-full flex justify-center transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                                <GoogleLogin 
                                    theme="filled_blue" 
                                    shape="pill" 
                                    size="large" 
                                    text="continue_with" 
                                    width="340" 
                                    onSuccess={handleGoogleLogin} 
                                    onError={() => toast.error("Google authentication failed. Please try again.")} 
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-500 pt-1">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Protected by Google Identity Services & OAuth 2.0</span>
                        </div>
                    </div>

                    {/* Stats Strip */}
                    <div className="grid grid-cols-3 gap-4 w-full mt-8 pt-6 border-t border-gray-200/70">
                        {PROJECT_DETAILS.stats.map((stat, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <span className="text-sm sm:text-base font-black text-gray-900 tracking-tight">{stat.value}</span>
                                <span className="text-[10px] sm:text-xs font-semibold text-gray-500">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                </div>
            </main>

            {/* ========================================================== */}
            {/* 👇 SECONDARY GLASS SHOWCASE PANELS (PROJECT & DEVELOPER) */}
            {/* ========================================================== */}
            <footer className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12 z-20">

                {/* === PLATFORM CAPABILITIES CARD === */}
                <div className="lg:col-span-7 bg-white/60 backdrop-blur-2xl border border-white/70 rounded-[32px] p-7 md:p-8 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-700">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Core Capabilities</h3>
                                    <p className="text-xs text-gray-500 font-semibold">{PROJECT_DETAILS.tagline}</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-full border border-purple-200">
                                9 Modules
                            </span>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6 font-medium">
                            {PROJECT_DETAILS.description}
                        </p>
                    </div>

                    {/* Features Matrix Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                        {PROJECT_DETAILS.features.map((feature, idx) => {
                            const IconComponent = feature.icon;
                            return (
                                <div 
                                    key={idx} 
                                    className={`flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl border backdrop-blur-md bg-white/80 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-white ${feature.border}`}
                                >
                                    <div className={`p-1.5 rounded-lg ${feature.bg} ${feature.color}`}>
                                        <IconComponent className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="truncate text-gray-800">{feature.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* === DEVELOPER PROFILE CARD === */}
                <div className="lg:col-span-5 bg-white/60 backdrop-blur-2xl border border-white/70 rounded-[32px] p-7 md:p-8 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-700 to-slate-900 flex items-center justify-center text-xl font-black shadow-lg text-white ring-4 ring-purple-100/80">
                                {DEVELOPER_DETAILS.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-2">
                                    {DEVELOPER_DETAILS.name}
                                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                </h3>
                                <p className="text-xs font-bold text-purple-700">
                                    {DEVELOPER_DETAILS.role}
                                </p>
                                <p className="text-[11px] text-gray-500 font-semibold uppercase mt-0.5">
                                    {DEVELOPER_DETAILS.university}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-5 border-l-4 border-purple-500 pl-4 font-medium italic">
                            "{DEVELOPER_DETAILS.bio}"
                        </p>

                        <div className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-xl bg-white/80 border border-gray-200/80 w-fit">
                            <span className="text-[10px] font-black uppercase bg-gray-900 text-white px-2 py-0.5 rounded-md">Direct</span>
                            <span className="text-xs font-mono font-bold text-gray-800">{DEVELOPER_DETAILS.contact}</span>
                        </div>
                    </div>

                    {/* Developer Social Links */}
                    <div className="flex flex-wrap gap-2.5 pt-4 border-t border-gray-200/70">
                        {DEVELOPER_DETAILS.linkedin && (
                            <a 
                                href={DEVELOPER_DETAILS.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-800 bg-white/90 border border-gray-200 hover:bg-white hover:border-purple-300 px-3.5 py-2.5 rounded-xl transition-all shadow-sm group"
                            >
                                <span>LinkedIn</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                            </a>
                        )}

                        {DEVELOPER_DETAILS.instagram && (
                            <a 
                                href={DEVELOPER_DETAILS.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-800 bg-white/90 border border-gray-200 hover:bg-white hover:border-purple-300 px-3.5 py-2.5 rounded-xl transition-all shadow-sm group"
                            >
                                <span>Instagram</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                            </a>
                        )}

                        {DEVELOPER_DETAILS.email && (
                            <a 
                                href={DEVELOPER_DETAILS.email} 
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gray-950 hover:bg-black hover:shadow-lg px-3.5 py-2.5 rounded-xl transition-all shadow-md"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email Me</span>
                            </a>
                        )}
                    </div>
                </div>

            </footer>

        </div>
    );
};

export default LoginPage;

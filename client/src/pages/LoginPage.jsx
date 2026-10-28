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
    Loader2 
} from "lucide-react";

// ====================================================================
// 👇 PROJECT & DEVELOPER DETAILS
// ====================================================================
const PROJECT_DETAILS = {
    name: "Dev Chat",
    version: "Let's Connect",
    tagline: "Connect, Share, and Collaborate in Real-Time.",
    description: "Dev Chat is a secure, premium messaging platform designed for seamless collaboration. Version 1.1 introduces High-Quality Voice Calls, View Once Media, and Advanced Privacy Controls like user blocking and message scheduling.",
    features: [
        { label: "Google OAuth 2.0", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
        { label: "Voice Calls (WebRTC)", icon: PhoneCall, color: "text-blue-500 bg-blue-50 border-blue-200" },
        { label: "View Once Media", icon: EyeOff, color: "text-amber-500 bg-amber-50 border-amber-200" },
        { label: "Real-Time Socket.io", icon: Zap, color: "text-purple-500 bg-purple-50 border-purple-200" },
        { label: "End-to-End Encryption", icon: Lock, color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
        { label: "Firebase Notifications", icon: Bell, color: "text-rose-500 bg-rose-50 border-rose-200" },
        { label: "Group Management", icon: Users, color: "text-teal-500 bg-teal-50 border-teal-200" },
        { label: "Message Scheduling", icon: Calendar, color: "text-cyan-500 bg-cyan-50 border-cyan-200" },
        { label: "Live Location", icon: MapPin, color: "text-orange-500 bg-orange-50 border-orange-200" }
    ]
};

const DEVELOPER_DETAILS = {
    name: "Rohit Raj",
    role: "B.Tech CSE Student",
    university: "Graphic Era Hill University",
    bio: "Aspiring Computer Science Engineer passionate about building scalable, secure web applications. Currently developing Dev Chat to connect people reliably.",
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
                toast.success("Welcome to Dev Chat!");
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
        <div className="min-h-screen w-full bg-[url('/bgImage.svg')] bg-cover bg-center bg-fixed flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
            
            {/* Ambient Background Glow Effect */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center -z-10">
                <div className="w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[120px] animate-pulse"></div>
                <div className="w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] -translate-x-32 translate-y-20"></div>
            </div>

            {/* === MAIN LOGIN HERO CONTAINER === */}
            <div className="w-full max-w-lg bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[36px] shadow-2xl p-8 md:p-10 flex flex-col items-center text-center relative z-10 my-8 transition-all duration-300 hover:shadow-purple-500/10">
                
                {/* Status Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider mb-6">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3"></span>
                    <span>{PROJECT_DETAILS.version} • Google OAuth Verified</span>
                </div>

                {/* Logo & Branding */}
                <div className="relative mb-5 group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition duration-500"></div>
                    <img 
                        src={assets.logo_big} 
                        alt="Dev Chat Logo" 
                        className="relative w-36 h-auto drop-shadow-2xl transition-transform duration-300 group-hover:scale-105" 
                    />
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-2">
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600">Dev Chat</span>
                </h1>
                
                <p className="text-gray-600 text-sm md:text-base font-medium max-w-sm mb-8 leading-relaxed">
                    Fast, secure, real-time collaboration. Sign in instantly with your verified Google account.
                </p>

                {/* === GOOGLE SIGN IN SECTION === */}
                <div className="w-full max-w-sm flex flex-col items-center gap-4 p-5 rounded-2xl bg-gradient-to-b from-gray-50/80 to-white/90 border border-gray-200/80 shadow-inner">
                    
                    {isAuthenticating ? (
                        <div className="flex items-center gap-3 py-3 px-6 text-purple-700 font-semibold text-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                            <span>Verifying Google account...</span>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center transform transition-transform hover:scale-[1.02] active:scale-[0.98]">
                            <GoogleLogin 
                                theme="filled_blue" 
                                shape="pill" 
                                size="large" 
                                text="continue_with" 
                                width="320" 
                                onSuccess={handleGoogleLogin} 
                                onError={() => toast.error("Google authentication failed. Please try again.")} 
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-500 mt-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>256-bit encrypted • Direct Google OAuth 2.0</span>
                    </div>
                </div>

                {/* Security Trust Badges */}
                <div className="grid grid-cols-3 gap-3 w-full mt-6 pt-6 border-t border-gray-200/60">
                    <div className="flex flex-col items-center text-center p-2">
                        <ShieldCheck className="w-5 h-5 text-purple-600 mb-1" />
                        <span className="text-[11px] font-bold text-gray-700">Zero Passwords</span>
                        <span className="text-[10px] text-gray-400">One-click login</span>
                    </div>
                    <div className="flex flex-col items-center text-center p-2">
                        <Zap className="w-5 h-5 text-indigo-600 mb-1" />
                        <span className="text-[11px] font-bold text-gray-700">Instant Access</span>
                        <span className="text-[10px] text-gray-400">No email OTP delays</span>
                    </div>
                    <div className="flex flex-col items-center text-center p-2">
                        <Sparkles className="w-5 h-5 text-emerald-600 mb-1" />
                        <span className="text-[11px] font-bold text-gray-700">Google Verified</span>
                        <span className="text-[10px] text-gray-400">Secure ecosystem</span>
                    </div>
                </div>

            </div>

            {/* ========================================================== */}
            {/* 👇 ABOUT PROJECT & DEVELOPER SECTION */}
            {/* ========================================================== */}
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12 z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* === ABOUT PROJECT CARD === */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/70 rounded-[32px] p-7 md:p-8 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                                    {PROJECT_DETAILS.name}
                                </h2>
                                <span className="inline-block mt-1 bg-purple-100 text-purple-700 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-purple-200">
                                    {PROJECT_DETAILS.version}
                                </span>
                            </div>
                            <div className="text-3xl p-2 rounded-2xl bg-purple-50 border border-purple-100">🚀</div>
                        </div>

                        <p className="text-gray-800 font-bold text-base mb-2 italic">
                            "{PROJECT_DETAILS.tagline}"
                        </p>

                        <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">
                            {PROJECT_DETAILS.description}
                        </p>
                    </div>

                    {/* Feature Chips */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Key Features</h3>
                        <div className="flex flex-wrap gap-2">
                            {PROJECT_DETAILS.features.map((feature, idx) => {
                                const IconComponent = feature.icon;
                                return (
                                    <span 
                                        key={idx} 
                                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border shadow-sm ${feature.color}`}
                                    >
                                        <IconComponent className="w-3.5 h-3.5" />
                                        {feature.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* === ABOUT DEVELOPER CARD === */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/70 rounded-[32px] p-7 md:p-8 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-700 to-black flex items-center justify-center text-xl font-black shadow-lg text-white ring-4 ring-purple-100">
                                {DEVELOPER_DETAILS.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                    {DEVELOPER_DETAILS.name}
                                </h2>
                                <p className="text-xs font-bold text-purple-700 uppercase tracking-widest">
                                    {DEVELOPER_DETAILS.role}
                                </p>
                                <p className="text-[11px] text-gray-500 font-semibold uppercase mt-0.5">
                                    {DEVELOPER_DETAILS.university}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed mb-5 border-l-4 border-purple-500 pl-4 font-medium italic">
                            "{DEVELOPER_DETAILS.bio}"
                        </p>

                        {/* Contact Info Pill */}
                        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-xl bg-gray-100/90 border border-gray-200">
                            <span className="text-[10px] font-black uppercase bg-gray-900 text-white px-2 py-0.5 rounded-md">Direct</span>
                            <span className="text-xs font-mono font-bold text-gray-800">{DEVELOPER_DETAILS.contact}</span>
                        </div>
                    </div>

                    {/* Developer Social Links */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200/60">
                        {DEVELOPER_DETAILS.linkedin && (
                            <a 
                                href={DEVELOPER_DETAILS.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 hover:border-purple-300 px-4 py-3 rounded-xl transition-all shadow-sm"
                            >
                                <span>LinkedIn</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </a>
                        )}

                        {DEVELOPER_DETAILS.instagram && (
                            <a 
                                href={DEVELOPER_DETAILS.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 hover:border-purple-300 px-4 py-3 rounded-xl transition-all shadow-sm"
                            >
                                <span>Instagram</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </a>
                        )}

                        {DEVELOPER_DETAILS.email && (
                            <a 
                                href={DEVELOPER_DETAILS.email} 
                                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-black hover:shadow-lg px-4 py-3 rounded-xl transition-all shadow-md"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email Me</span>
                            </a>
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
};

export default LoginPage;

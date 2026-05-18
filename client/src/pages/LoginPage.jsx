import React, { useState, useContext } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";
import OtpPage from "./OtpPage.jsx";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// ====================================================================
// 👇👇👇 PROJECT & DEVELOPER DETAILS 👇👇👇
// ====================================================================
const PROJECT_DETAILS = {
    name: "Dev Chat",
    version: "Stable Version 1.1",
    tagline: "Connect, Share, and Collaborate in Real-Time.",
    description: "Dev Chat is a secure, premium messaging platform designed for seamless collaboration. Version 1.1 introduces High-Quality Voice Calls, View Once Media, and Advanced Privacy Controls like user blocking and message scheduling.",
    features: [
        " Firebase Notification",
        " Google Sign In",
        " Real-Time Socket.io",
        " High-Quality Voice Calls",
        " View Once Feature",
        " Block & Mute Users",
        " Privacy Protection",
        " TXT & PDF Doc Viewer",
        " Live Location Sharing",
        " Advanced Group Mgmt",
        " Message Scheduling",
        " End-to-End Encryption"
    ]
};

/*const DEVELOPER_DETAILS = {
    name: "Rohit Raj",
    role: "B.Tech CSE Student",
    university: "Graphic Era Hill University",
    bio: "Aspiring Computer Science Engineer passionate about building scalable web applications. Currently developing Dev Chat to connect people securely.",
    contact: "+91 9693220586",
    linkedin: "https://www.linkedin.com/in/rohit-raj-7ba581322",
    instagram: "https://www.instagram.com/rohit__goswami._?igsh=MTIyYTVjaWNxZW1uMA==",
    email: "mailto:goswamirohit2830@gmail.com"
};
// ====================================================================
*/

const LoginPage = () => {
    const [currState, setCurrState] = useState("Sign Up");

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [bio, setBio] = useState("");

    const [newPassword, setNewPassword] = useState("");
    const [resetOtp, setResetOtp] = useState("");
    const [isResetOtpSent, setIsResetOtpSent] = useState(false);

    const [isDataSubmitted, setIsDataSubmitted] = useState(false);
    const [otpStep, setOtpStep] = useState(false);

    const navigate = useNavigate();

    const {
        signup,
        login,
        otpUserId,
        otpType,
        googleLoginSuccess,
        sendResetOtp,
        resetPassword
    } = useContext(AuthContext);

    // ---------------- FORM SUBMIT ----------------
    const onSubmitHandler = async (e) => {
        e.preventDefault();

        if (currState === "Reset Password") {
            if (!isResetOtpSent) {
                const success = await sendResetOtp(email);
                if (success) setIsResetOtpSent(true);
            } else {
                const success = await resetPassword(email, resetOtp, newPassword);
                if (success) {
                    setCurrState("Login");
                    setIsResetOtpSent(false);
                    setResetOtp("");
                    setNewPassword("");
                    setPassword("");
                }
            }
            return;
        }

        if (currState === "Sign Up" && !isDataSubmitted) {
            setIsDataSubmitted(true);
            return;
        }

        let res;
        if (currState === "Sign Up") {
            res = await signup(fullName, email, password, bio);
        } else {
            res = await login(email, password);
        }

        if (res?.userId) {
            setOtpStep(true);
        } else if (res?.success) {
            navigate("/");
        }
    };

    // ---------------- GOOGLE LOGIN ----------------
    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/auth/google-login`,
                { token: credentialResponse.credential }
            );

            if (res.data.success) {
                googleLoginSuccess(res.data.token, res.data.userData);
                navigate("/");
            }
        } catch (error) {
            toast.error("Google login failed");
        }
    };

    // ---------------- OTP PAGE ----------------
    if (otpStep && otpUserId && otpType) {
        return (
            <OtpPage
                userId={otpUserId}
                type={otpType}
                goBack={() => setOtpStep(false)}
            />
        );
    }

    const switchState = (state) => {
        setCurrState(state);
        setIsDataSubmitted(false);
        setIsResetOtpSent(false);
        setResetOtp("");
        setNewPassword("");
    };

    // ---------------- UI ----------------
    return (
        <div className="min-h-screen w-full bg-[url('./src/assets/bgImage.svg')] bg-cover bg-center flex flex-col items-center justify-center p-4 overflow-y-auto custom-scrollbar">

            {/* === LOGIN CARD === */}
            <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[32px] shadow-2xl overflow-hidden relative z-10 p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-300 mb-10 mt-10 md:mt-0">

                {/* HEADER */}
                <div className="text-center">
                    <img src={assets.logo_big} alt="Logo" className="w-32 mx-auto mb-4 drop-shadow-xl" />
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                        {currState === "Sign Up" ? "Create Account" : currState === "Login" ? "Welcome Back" : "Reset Password"}
                    </h2>
                    <p className="text-gray-600 font-medium text-sm mt-2">
                        {currState === "Sign Up" ? "Join the Dev Chat Beta today" : currState === "Login" ? "Login to continue chatting" : "Recover your account access"}
                    </p>
                </div>

                <form onSubmit={onSubmitHandler} className="flex flex-col gap-4">
                    {currState === "Sign Up" && !isDataSubmitted && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase ml-1">Full Name</label>
                            <input type="text" placeholder="" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 transition-all" required />
                        </div>
                    )}

                    {(currState === "Sign Up" || currState === "Login") && !isDataSubmitted && (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600 uppercase ml-1">Email Address</label>
                                <input type="email" placeholder="" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 transition-all" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600 uppercase ml-1">Password</label>
                                <input type="password" placeholder="" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 transition-all" required />
                            </div>
                        </>
                    )}

                    {currState === "Sign Up" && isDataSubmitted && (
                        <div className="space-y-1 animate-in slide-in-from-right duration-300">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-600 uppercase ml-1">Profile Bio</label>
                                <button type="button" onClick={() => setIsDataSubmitted(false)} className="text-[10px] text-gray-500 hover:text-purple-600 uppercase font-bold">Go Back</button>
                            </div>
                            <textarea rows={4} placeholder="" value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none" required />
                        </div>
                    )}

                    {currState === "Reset Password" && (
                        <div className="space-y-4 animate-in slide-in-from-right duration-300">
                            {!isResetOtpSent ? (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Enter Registered Email</label>
                                    <input type="email" placeholder="" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 transition-all" required />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600 uppercase ml-1">OTP Code</label>
                                        <input type="text" placeholder="" value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-mono tracking-widest text-center text-lg font-bold focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 transition-all" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600 uppercase ml-1">New Password</label>
                                        <input type="password" placeholder="" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 transition-all" required />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {currState === "Login" && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => switchState("Reset Password")} className="text-sm text-purple-600 hover:text-purple-800 hover:underline transition-colors font-bold">Forgot Password?</button>
                        </div>
                    )}

                    <button type="submit" className="mt-2 w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-xl transform transition-all hover:-translate-y-1 active:scale-95">
                        {currState === "Sign Up" ? (isDataSubmitted ? "Create Account" : "Next Step") : currState === "Login" ? "Login" : isResetOtpSent ? "Set New Password" : "Send OTP"}
                    </button>
                </form>

                {currState !== "Reset Password" && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-gray-300"></div>
                            <span className="text-gray-400 text-xs font-bold uppercase">Or continue with</span>
                            <div className="h-px flex-1 bg-gray-300"></div>
                        </div>
                        <div className="flex justify-center">
                            <GoogleLogin theme="outline" shape="pill" size="large" text="continue_with" width="300" onSuccess={handleGoogleLogin} onError={() => toast.error("Google Login Failed")} />
                        </div>
                    </div>
                )}

                <div className="text-center mt-2">
                    {currState === "Sign Up" ? (
                        <p className="text-gray-600 text-sm font-medium">Already have an account? <button onClick={() => switchState("Login")} className="text-purple-700 font-black hover:underline ml-1">Login</button></p>
                    ) : currState === "Login" ? (
                        <p className="text-gray-600 text-sm font-medium">Don't have an account? <button onClick={() => switchState("Sign Up")} className="text-purple-700 font-black hover:underline ml-1">Sign Up</button></p>
                    ) : (
                        <button onClick={() => switchState("Login")} className="text-purple-700 font-black hover:underline text-sm">Back to Login</button>
                    )}
                </div>
            </div>

            {/* ========================================================== */}
            {/* 👇 ABOUT PROJECT & DEVELOPER SECTION 👇 */}
            {/* ========================================================== */}

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-10 duration-700 delay-100 pb-10">

                {/* === ABOUT PROJECT CARD === */}
                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 text-gray-900 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                                {PROJECT_DETAILS.name}
                            </h3>
                            <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider border border-purple-200">
                                {PROJECT_DETAILS.version}
                            </span>
                        </div>
                        <div className="text-4xl opacity-20 grayscale">🚀</div>
                    </div>

                    <p className="text-gray-700 font-bold text-lg mb-2 italic">
                        "{PROJECT_DETAILS.tagline}"
                    </p>

                    <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">
                        {PROJECT_DETAILS.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                        {PROJECT_DETAILS.features.map((feature, idx) => (
                            <span key={idx} className="text-xs font-bold text-gray-700 bg-white border-2 border-gray-100 px-3 py-1.5 rounded-lg shadow-sm">
                                {feature}
                            </span>
                        ))}
                    </div>
                </div>

                {/* === ABOUT DEVELOPER CARD === */}
                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 text-gray-900 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-gray-800 to-black flex items-center justify-center text-xl font-bold shadow-lg text-white">
                                {DEVELOPER_DETAILS.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                    {DEVELOPER_DETAILS.name}
                                </h3>
                                <p className="text-xs font-bold text-purple-700 uppercase tracking-widest">
                                    {DEVELOPER_DETAILS.role}
                                </p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                                    {DEVELOPER_DETAILS.university}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed mb-4 border-l-4 border-purple-500 pl-4 font-medium">
                            {DEVELOPER_DETAILS.bio}
                        </p>

                        {/* Contact Info Row */}
                        <div className="flex items-center gap-2 mb-6 opacity-80">
                            <span className="text-xs font-black uppercase bg-gray-200 text-gray-700 px-2 py-1 rounded">Contact</span>
                            <span className="text-sm font-mono font-bold">{DEVELOPER_DETAILS.contact}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {DEVELOPER_DETAILS.linkedin && (
                            <a href={DEVELOPER_DETAILS.linkedin} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-bold text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-3 rounded-xl transition-all shadow-sm">
                                LinkedIn ↗
                            </a>
                        )}

                        {DEVELOPER_DETAILS.instagram && (
                            <a href={DEVELOPER_DETAILS.instagram} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-bold text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-3 rounded-xl transition-all shadow-sm">
                                Instagram ↗
                            </a>
                        )}

                        {DEVELOPER_DETAILS.email && (
                            <a href={DEVELOPER_DETAILS.email} className="flex-1 text-center text-xs font-bold text-white bg-gray-900 hover:bg-black px-4 py-3 rounded-xl transition-all shadow-lg">
                                Email Me
                            </a>
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
};

export default LoginPage;

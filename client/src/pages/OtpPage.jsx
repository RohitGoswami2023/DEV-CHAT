import React, { useState, useContext, useRef, useEffect } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const OtpPage = ({ userId, type, goBack }) => {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { verifyOtp, signupData, loginData } = useContext(AuthContext);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // ---------------- HANDLE INPUT CHANGE ----------------
  const handleChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    // Allow only last entered character
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  // ---------------- HANDLE BACKSPACE ----------------
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  // ---------------- HANDLE PASTE ----------------
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.length === 6 && pastedData.every(char => !isNaN(char))) {
        setOtp(pastedData);
        inputRefs.current[5].focus();
    }
  };

  // ---------------- VERIFY OTP ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) return toast.error("Please enter a 6-digit OTP");

    setLoading(true);
    try {
      const res = await verifyOtp(otpCode);
      if (res.success) {
        navigate("/");
      }
    } catch (error) {
      console.error("OTP submit error:", error.message);
    }
    setLoading(false);
  };

  // ---------------- RESEND OTP ----------------
  const handleResendOtp = async () => {
    setResending(true);
    try {
      const credentials = type === "signup" ? (signupData || loginData) : loginData;
      if (!credentials) throw new Error("Credentials missing. Cannot resend.");

      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/login`, {
        email: credentials.email,
        password: credentials.password
      });

      toast.success("OTP resent successfully");
      setOtp(new Array(6).fill(""));
      inputRefs.current[0].focus();
    } catch (error) {
      toast.error(error.message || "Failed to resend OTP");
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen w-full bg-[url('./src/assets/bgImage.svg')] bg-cover bg-center flex items-center justify-center p-4">
      
      <div className="w-full max-w-md bg-black/20 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 flex flex-col gap-8 animate-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="text-center relative">
            <button 
                onClick={goBack} 
                className="absolute top-0 left-0 text-white/50 hover:text-white transition-colors"
            >
                <img src={assets.arrow_icon} alt="Back" className="w-6 rotate-180" />
            </button>
            
            <img src={assets.logo_big} alt="Logo" className="w-28 mx-auto mb-4 drop-shadow-lg" />
            
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">
                Verification Code
            </h2>
            <p className="text-white/60 text-sm mt-2">
                
 We have sent a verification code to your email.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          
            {/* OTP INPUTS */}
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:bg-white/20 transition-all shadow-inner"
                    />
                ))}
            </div>

            {/* ACTION BUTTON */}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transform transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Verifying..." : "Verify & Continue"}
            </button>

            {/* RESEND LINK */}
            <div className="text-center">
                <p className="text-white/60 text-sm">
                    Didn't receive code?{" "}
                    <button 
                        type="button"
                        onClick={!resending ? handleResendOtp : undefined}
                        className={`font-bold ml-1 transition-colors ${resending ? "text-gray-400 cursor-not-allowed" : "text-white hover:underline hover:text-purple-300"}`}
                    >
                        {resending ? "Resending..." : "Resend"}
                    </button>
                </p>
            </div>
        </form>

      </div>
    </div>
  );
};

export default OtpPage;

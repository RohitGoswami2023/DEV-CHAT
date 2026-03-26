import { createContext, useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { requestFirebaseToken, onMessageListener } from "../lib/firebase";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Loading state to prevent blank screen/redirects on refresh
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const socketRef = useRef(null);

  // OTP State
  const [otpUserId, setOtpUserId] = useState(null);
  const [otpType, setOtpType] = useState(null);

  // Temp Data for Resend
  const [signupData, setSignupData] = useState(null);
  const [loginData, setLoginData] = useState(null);

  // ================= AXIOS TOKEN =================
  const applyAxiosToken = (jwt) => {
    if (jwt) {
      axios.defaults.headers.common.Authorization = `Bearer ${jwt}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  };

  // ================= SOCKET =================
  const connectSocket = (user) => {
    if (!user || socketRef.current) return;

    socketRef.current = io(backendUrl, {
      query: { userId: user._id },
      transports: ["websocket"],
    });

    socketRef.current.on("getOnlineUsers", setOnlineUsers);
  };

  const disconnectSocket = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setOnlineUsers([]);
  };

  // ================= CHECK AUTH (UPDATED) =================
  const checkAuth = async () => {
    setIsCheckingAuth(true); // Start loading
    try {
      const { data } = await axios.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      setAuthUser(null);
      localStorage.removeItem("token");
      setToken(null);
      delete axios.defaults.headers.common.Authorization;
    } finally {
      setIsCheckingAuth(false); // Stop loading when done
    }
  };

  // ================= LOGIN =================
  const login = async (email, password) => {
    try {
      setLoginData({ email, password });

      const { data } = await axios.post("/api/auth/login", { email, password });

      toast.success(data.message);

      if (data.userId) {
        setOtpUserId(data.userId);
        setOtpType(data.requiresSignupVerify ? "signup" : "login");
        return data;
      }

      finalizeAuth(data.token, data.userData);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      throw err;
    }
  };

  // ================= SIGNUP =================
  const signup = async (fullName, email, password, bio) => {
    try {
      setSignupData({ fullName, email, password, bio });

      const { data } = await axios.post("/api/auth/signup", {
        fullName,
        email,
        password,
        bio,
      });

      toast.success(data.message);

      if (data.userId) {
        setOtpUserId(data.userId);
        setOtpType("signup");
        return data;
      }

      finalizeAuth(data.token, data.userData);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      throw err;
    }
  };

  // ================= VERIFY OTP =================
  const verifyOtp = async (otp) => {
    try {
      const url =
        otpType === "signup"
          ? "/api/auth/verify-signup-otp"
          : "/api/auth/verify-login-otp";

      const { data } = await axios.post(url, {
        userId: otpUserId,
        otp,
      });

      toast.success(data.message);
      finalizeAuth(data.token, data.userData);

      setOtpUserId(null);
      setOtpType(null);

      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
      throw err;
    }
  };

  // ================= PASSWORD RESET =================
  const sendResetOtp = async (email) => {
    try {
      const { data } = await axios.post("/api/auth/send-reset-otp", { email });
      if (data.success) {
        toast.success(data.message);
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
      return false;
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const { data } = await axios.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      if (data.success) {
        toast.success(data.message);
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
      return false;
    }
  };

  // ================= GOOGLE LOGIN =================
  const googleLoginSuccess = (jwt, userData) => {
    finalizeAuth(jwt, userData);
  };

  // ================= FINALIZE AUTH =================
  const finalizeAuth = (jwt, user) => {
    localStorage.setItem("token", jwt);
    setToken(jwt);
    applyAxiosToken(jwt);
    setAuthUser(user);
    connectSocket(user);
  };

  // ================= LOGOUT =================
  const logout = (notify = true) => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    applyAxiosToken(null);
    disconnectSocket();
    if (notify) toast.success("Logged out");
  };

  // ================= UPDATE PROFILE =================
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // ================= INIT =================
  useEffect(() => {
    if (token) {
      applyAxiosToken(token);
      checkAuth();
    } else {
      setIsCheckingAuth(false); // No token, stop loading immediately
    }
  }, []);

  // ================= FIREBASE PUSH NOTIFICATION SYNC =================
  useEffect(() => {
    let unsubscribe = null;

    if (authUser) {
       const syncFCM = async () => {
          const fcmToken = await requestFirebaseToken();
          if (fcmToken) {
             try {
                await axios.put("/api/auth/fcm-token", { token: fcmToken });
                console.log("✅ FCM Token Synced Natively");
             } catch (err) {
                console.error("FCM Sync Error:", err);
             }
          }
       };
       syncFCM();
       
       // Handle foreground pushes
       unsubscribe = onMessageListener((payload) => {
           toast.success(
              `${payload.notification.title}: ${payload.notification.body}`, 
              { duration: 5000, icon: '🔔' }
           );
       });
    }

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [authUser]);

  return (
    <AuthContext.Provider
      value={{
        axios,
        authUser,
        setAuthUser,
        onlineUsers,
        socket: socketRef.current,
        token,
        isCheckingAuth, // 🔥 Exposed for App.jsx

        login,
        signup,
        verifyOtp,
        sendResetOtp,
        resetPassword,
        googleLoginSuccess,
        logout,
        updateProfile,

        otpUserId,
        otpType,
        signupData,
        loginData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

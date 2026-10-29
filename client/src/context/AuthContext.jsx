import { createContext, useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { requestFirebaseToken, onMessageListener } from "../lib/firebase";
import { flushOutbox, hasUnsentMessages } from "../lib/outbox";
import { clearMessageCache } from "../lib/messageCache";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Loading state to prevent blank screen/redirects on refresh
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const socketRef = useRef(null);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== "undefined" ? Notification.permission : "default"
  );

  const requestPermission = async () => {
    const fcmToken = await requestFirebaseToken();
    setNotificationPermission(Notification.permission);
    if (fcmToken && authUser) {
      try {
        await axios.put("/api/auth/fcm-token", { token: fcmToken });
        console.log("✅ FCM Token Synced after manual request");
      } catch (err) {
        console.error("FCM Sync Error:", err);
      }
    }
  };

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

    socketRef.current.on("connect", () => {
      console.log("⚡ Socket connected, flushing outbox...");
      flushOutbox();
    });

    socketRef.current.on("getOnlineUsers", setOnlineUsers);
  };

  const disconnectSocket = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setOnlineUsers([]);
  };

  // ================= CHECK AUTH (OFFLINE SAFE) =================
  const checkAuth = async () => {
    setIsCheckingAuth(true);

    // If completely offline, keep existing cached auth user from localStorage!
    if (!navigator.onLine) {
      setIsCheckingAuth(false);
      return;
    }

    try {
      const { data } = await axios.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        connectSocket(data.user);
      }
    } catch (error) {
      // Only clear credentials if the server explicitly responded with 401 Unauthorized
      if (error.response?.status === 401) {
        setAuthUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        delete axios.defaults.headers.common.Authorization;
      }
    } finally {
      setIsCheckingAuth(false);
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
    if (user) localStorage.setItem("user", JSON.stringify(user));
    setToken(jwt);
    applyAxiosToken(jwt);
    setAuthUser(user);
    connectSocket(user);
  };

  // ================= LOGOUT =================
  const logout = async (notify = true) => {
    if (await hasUnsentMessages()) {
      const confirmed = window.confirm(
        "Some messages haven't been sent yet. Log out anyway? They will be lost."
      );
      if (!confirmed) return false;
    }

    try {
      await clearMessageCache();
    } catch (e) {
      console.warn("Failed to clear message cache on logout:", e);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setAuthUser(null);
    applyAxiosToken(null);
    disconnectSocket();
    if (notify) toast.success("Logged out");
    return true;
  };

  // ================= UPDATE PROFILE =================
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
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
      setIsCheckingAuth(false);
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
        isCheckingAuth,

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
        notificationPermission,
        requestPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

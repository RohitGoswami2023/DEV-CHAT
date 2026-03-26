import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "../context/AuthContext.jsx";
import { ChatProvider } from "../context/ChatContext.jsx";
import { CallProvider } from "../context/CallContext.jsx";
import CallModal from "./components/CallModal.jsx";

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <CallProvider>
            <CallModal />
            <App />
          </CallProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);

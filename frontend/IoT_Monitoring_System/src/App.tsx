import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import AppRoutes from "@/routes/AppRoutes";
import "./App.css";
import { useEffect } from "react";
import favicon from "@/assets/logo/iot-monitoring-system-favicon.png";

function App() {
  useEffect(() => {
    const existing = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (existing) {
      existing.href = favicon;
      return;
    }
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    document.head.appendChild(link);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import AppRoutes from "@/routes/AppRoutes";
import "./App.css";
import "./features/auth/styles/auth.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
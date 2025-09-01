import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { Navigate } from "react-router-dom";

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout(); // clear context + localStorage
  }, []);

  return <Navigate to="/login" replace />;
}

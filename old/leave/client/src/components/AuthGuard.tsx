import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Login from "./Login";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const authStatus = localStorage.getItem("isAuthenticated");
      const user = localStorage.getItem("user");
      
      // Consider authenticated if both exist and auth is true
      const authenticated = authStatus === "true" && user !== null;
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    // Listen for storage changes (for logout from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "isAuthenticated" || e.key === "user") {
        checkAuth();
      }
    };

    // Check auth status periodically to catch login state changes
    const authCheckInterval = setInterval(checkAuth, 1000);

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(authCheckInterval);
    };
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, show login
  if (!isAuthenticated && location !== "/login") {
    return <Login />;
  }

  // If authenticated and on login page, redirect to dashboard
  if (isAuthenticated && location === "/login") {
    window.location.href = "/";
    return null;
  }

  // If on login page, show login component directly (no layout)
  if (location === "/login") {
    return <Login />;
  }

  // If authenticated, show protected content
  return <>{children}</>;
}
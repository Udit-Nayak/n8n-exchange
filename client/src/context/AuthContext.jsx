import { createContext, useContext, useState, useEffect } from "react";
import { signInWithPopup, signInWithCustomToken } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount and set up token refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    // Migration: Clear old custom tokens
    // Custom tokens start with "eyJ" but are much longer than ID tokens
    // and don't have proper JWT structure for our use case
    if (token && token.length > 500) {
      console.log("🔄 Detected old token format, clearing...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setLoading(false);
      return;
    }

    if (token && savedUser && savedUser !== "undefined") {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);

    // Set up Firebase auth state listener for token refresh
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get fresh ID token
          const idToken = await firebaseUser.getIdToken(true);
          localStorage.setItem("token", idToken);
        } catch (error) {
          console.error("Failed to refresh token:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      // Step 1: Call backend to get custom token
      const response = await authAPI.login({ email, password });
      const { user: userData, token: customToken } = response.data.data;

      // Step 2: Sign in to Firebase with custom token to get ID token
      const userCredential = await signInWithCustomToken(auth, customToken);

      // Step 3: Get the ID token (this is what we'll use for API calls)
      const idToken = await userCredential.user.getIdToken();

      // Step 4: Store ID token (not custom token) and user data
      localStorage.setItem("token", idToken);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Login failed",
      };
    }
  };

  const register = async (email, password, displayName) => {
    try {
      // Step 1: Call backend to create user and get custom token
      const response = await authAPI.register({ email, password, displayName });
      const { user: userData, token: customToken } = response.data.data;

      // Step 2: Sign in to Firebase with custom token to get ID token
      const userCredential = await signInWithCustomToken(auth, customToken);

      // Step 3: Get the ID token (this is what we'll use for API calls)
      const idToken = await userCredential.user.getIdToken();

      // Step 4: Store ID token (not custom token) and user data
      localStorage.setItem("token", idToken);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Registration failed",
      };
    }
  };

  const logout = async () => {
    try {
      if (user?.uid) {
        await authAPI.logout({ uid: user.uid });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Sign out from Firebase Auth
      await auth.signOut();

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Sign in with Google popup
      const result = await signInWithPopup(auth, googleProvider);

      // Get the ID token from Google
      const idToken = await result.user.getIdToken();

      // Send the ID token to your backend
      const response = await authAPI.googleSignIn({ idToken });
      const { user, token } = response.data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error("Google sign-in error:", error);

      // Handle specific Firebase errors
      if (error.code === "auth/operation-not-allowed") {
        return {
          success: false,
          message:
            "Google Sign-In is not enabled. Please enable it in Firebase Console > Authentication > Sign-in method.",
        };
      }

      if (error.code === "auth/popup-closed-by-user") {
        return {
          success: false,
          message: "Sign-in cancelled",
        };
      }

      if (error.code === "auth/popup-blocked") {
        return {
          success: false,
          message: "Pop-up was blocked. Please allow pop-ups for this site.",
        };
      }

      if (error.code === "auth/unauthorized-domain") {
        return {
          success: false,
          message:
            "This domain is not authorized. Add it to Firebase Console > Authentication > Settings > Authorized domains.",
        };
      }

      if (error.code === "auth/configuration-not-found") {
        return {
          success: false,
          message: "Firebase configuration is missing. Please check your .env file.",
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || error.message || "Google sign-in failed",
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    signInWithGoogle,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { adminAuth } from "../config/firebase.js";

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Bad request",
        message: "Email and password are required",
      });
    }

    // Create user in Firebase
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || null,
      emailVerified: false,
    });

    // Generate custom token for immediate login
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      token: customToken,
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({
        error: "Email already exists",
        message: "This email is already registered",
      });
    }

    res.status(500).json({
      error: "Server error",
      message: "Failed to register user",
    });
  }
};

/**
 * Login user (creates custom token)
 */
export const login = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Bad request",
        message: "Email is required",
      });
    }

    // Get user by email
    const userRecord = await adminAuth.getUserByEmail(email);

    // Generate custom token
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
      },
      token: customToken,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        error: "User not found",
        message: "No user found with this email",
      });
    }

    res.status(500).json({
      error: "Server error",
      message: "Failed to login",
    });
  }
};

/**
 * Logout user (revoke refresh tokens)
 */
export const logout = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        error: "Bad request",
        message: "User ID is required",
      });
    }

    // Revoke all refresh tokens for the user
    await adminAuth.revokeRefreshTokens(uid);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    res.status(500).json({
      error: "Server error",
      message: "Failed to logout",
    });
  }
};

/**
 * Forgot password (send password reset email)
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Bad request",
        message: "Email is required",
      });
    }

    // Verify user exists
    await adminAuth.getUserByEmail(email);

    // Generate password reset link
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    // In production, send this link via email service
    // For now, return it in the response
    res.json({
      success: true,
      message: "Password reset link generated",
      resetLink, // In production, send via email instead of returning
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    if (error.code === "auth/user-not-found") {
      // Don't reveal if user exists or not (security best practice)
      return res.json({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
    }

    res.status(500).json({
      error: "Server error",
      message: "Failed to process password reset",
    });
  }
};

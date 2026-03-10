import { User } from "../models/index.js";

/**
 * Update user profile
 * PUT /api/user/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { displayName, preferences } = req.body;

    // Build update object
    const updateData = {};

    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }

    if (preferences) {
      if (preferences.timezone !== undefined) {
        updateData["preferences.timezone"] = preferences.timezone;
      }
      if (preferences.notifications !== undefined) {
        updateData["preferences.notifications"] = preferences.notifications;
      }
      if (preferences.theme !== undefined) {
        updateData["preferences.theme"] = preferences.theme;
      }
    }

    // Update user in database
    const user = await User.findOneAndUpdate(
      { uid: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("uid email displayName photoURL preferences wallet");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          preferences: user.preferences,
          wallet: user.wallet,
        },
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
      message: error.message,
    });
  }
};

/**
 * Get user profile
 * GET /api/user/profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.uid;

    const user = await User.findOne({ uid: userId }).select(
      "uid email displayName photoURL provider preferences wallet isActive lastLogin"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
      message: error.message,
    });
  }
};

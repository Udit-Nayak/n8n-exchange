import express from "express";
import {
  register,
  login,
  logout,
  forgotPassword,
} from "../controllers/auth.controllers.js";

const auth_route = express.Router();

// Auth routes
auth_route.post("/register", register);
auth_route.post("/login", login);
auth_route.post("/logout", logout);
auth_route.post("/forgot-password", forgotPassword);

export default auth_route;

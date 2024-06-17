import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserAvatar,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verify } from "jsonwebtoken";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);

//securedRoutes

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refreshToken").post(refreshAccessToken);

router.route("/profile").get(verifyJWT, getCurrentUser);

router.route("/changePassword").post(verifyJWT, changeCurrentPassword);

router
  .route("/avatarChange")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/channelProfile/:username").get(verifyJWT, getUserChannelProfile);

router.route("/watchHistory").get(verifyJWT, getWatchHistory);

export default router;

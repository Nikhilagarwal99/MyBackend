import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteVideo,
  getAllVideo,
  publishVideo,
  searchVideo,
  videoPlay,
  videoUpload,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

//secured Route

router.route("/upload").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  videoUpload
);
router.route("/play/:videoId").get(verifyJWT, videoPlay);

router.route("/search").get(searchVideo);

router.route("/publishVideo/:videoId").patch(verifyJWT, publishVideo);

router.route("/deleteVideo/:videoId").delete(verifyJWT, deleteVideo);

router.route("/getAllVideos").get(getAllVideo);
export default router;

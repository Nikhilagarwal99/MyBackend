import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Task to Performed
// 1 Upload a video

const videoUpload = asyncHandler(async (req, res) => {
  // 1 take the POST request from the user -done
  // Validate the required Body-done
  // take exception Handling in all requests-done
  // Upload the files in temp folder,-done
  // Take the user details from the cookies and assign the video to the user-done
  // check validation of the files types is user is updated successfully-done
  // Send the request to cloudinary to upload the files-done
  // wait for the response from clodinary-done
  // take the duration field from cloudinary response and assign into a variable-done
  // send the create request in DB-done
  // Wait for the response & send to the USER-done

  const { title, description, isPublished } = req.body;
  // all fields are mandatory ,validate them

  if ([title, description, isPublished].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All field are required");
  }
  const userId = req?.user._id;
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, "You are nor Authorized, Please logged in first");
  }

  //Upload the files from user
  let videoFileLocalPath, thumbnailLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoFileLocalPath = req.files.videoFile[0].path;
  } else {
    throw new ApiError(400, "Video File is required to upload");
  }
  // replicate the same for thumbnail

  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  } else {
    throw new ApiError(400, "Thumbnail is required to upload");
  }

  // check the files extension before send to cloudinary
  const extCheckVideoFile = videoFileLocalPath.substring(
    videoFileLocalPath.lastIndexOf(".")
  );
  if (extCheckVideoFile !== ".mp4") {
    throw new ApiError(403, "File type is not allowed");
  }

  // check files for thumbnails
  const allowedFilesForThumbnail = ["jpg", "jpeg", "png"];
  const extCheckThumbnail = thumbnailLocalPath.split("\\").pop().split(".")[1];

  if (!allowedFilesForThumbnail.includes(extCheckThumbnail.toLowerCase())) {
    throw new ApiError(403, `${extCheckThumbnail} file is not allowed`);
  }

  // upload the files on cloudinary

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const duration = videoFile.duration;
  const owner = user._id;
  //Uploading the video data in database
  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration,
    isPublished,
    owner,
  });

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video Uploaded Successfully"));
});

// Play the Video
const videoPlay = asyncHandler(async (req, res) => {
  // USer must be logged in
  // Need a video _id to play take the id from params
  // we have to show list of video id to the user and based on the choosen video we have to fetch it from DB
  try {
    if (!req.user) {
      throw new ApiError(401, "Please login first");
    }
    const loggedInUser = req.user?._id;

    const { videoId } = req?.params;
    if (!videoId.trim()) {
      throw new ApiError(400, "Invalid URL ");
    }
    const video = await Video.findById(videoId).select("-isPublished");
    if (!video) {
      throw new ApiError(404, "File is not present");
    }
    //check the flag for isPublished if not then only owner is able to play the video
    if (video.isPublished !== true && loggedInUser === video.owner) {
      throw new ApiError(403, "Video is not published yet ");
    }

    //increse the views count for every request

    video.views = video.views + 1;
    const successFlag = await video.save({ validateBeforeSave: false });
    if (!successFlag) {
      throw new ApiError(400, "Unable to update views");
    }

    //need to update the user watch history also and like & comments

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          video,
          `Please play the video from here directly ${video.videoFile}`
        )
      );
  } catch (error) {
    throw new ApiError(500, error, "Internal Issue please check");
  }
});

//publish a video

// Delete a vidoe

// get all Video

export { videoUpload, videoPlay };

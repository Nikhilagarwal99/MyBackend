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
const publishVideo = asyncHandler(async (req, res) => {
  // ?fetch the video id from params
  const { videoId } = req.params;
  // Take the login user details from cookie
  const loggedInUserId = req?.user._id;
  // check if user is enter any video id or not
  if (!videoId) {
    return new ApiError(404, "Please Enter a valid video Id");
  }
  // get the video details from DB
  const video = await Video.findById(videoId);
  // Few Validations
  if (!loggedInUserId) {
    return new ApiError(401, "User is not Logged In");
  }

  if (video.owner !== loggedInUserId) {
    return new ApiError(
      401,
      "Please login with the Owner Account, You are not authorized"
    );
  }
  const publishStatus = video.isPublished;
  if (publishStatus) {
    return new ApiError(406, "Video is Already Published");
  }
  video.isPublished = true;
  const successFlag = await video.save({ validateBeforeSave: false });

  if (!successFlag) {
    return new ApiError(500, "Server issue, Please try again later");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video is published Sucessfully"));
});

// Delete a video

const deleteVideo = asyncHandler(async (req, res) => {
  //Take the video Id from the request parameter
  const { videoId } = req.params;
  if (!videoId) return new ApiError(404, "Please provide a video Id");
  // Its a delete Operation

  //check if user is logeed in

  const loggedInUserId = req?.user._id;
  if (!loggedInUserId) {
    return new ApiError(401, "Unauthorized Request, Please login");
  }

  //Get the video document from the database
  const video = await Video.findById(videoId);
  if (!video) {
    return new ApiError(404, "Invalid Video Id or Video is already deleted");
  }

  // check the loggedin user is the owner of the video
  if (video.owner !== loggedInUserId) {
    return new ApiError(
      401,
      "Please login with the Admin account, you are not authorized to perform this operation"
    );
  }
  // perform the delete operation in the db
  Video.deleteOne({ _id: videoId })
    .then((deleteResponse) => {
      if (deleteResponse) {
        return res
          .status(203)
          .json(
            new ApiResponse(
              203,
              deleteResponse,
              "Video is deleted Successfully"
            )
          );
      } else {
        return res
          .status(404)
          .json(new ApiResponse(404, {}, "Video is not found"));
      }
    })
    .catch((error) => {
      return new ApiError(500, error);
    });
  // send the response to the user
});

// get all Video

const getAllVideo = asyncHandler(async (req, res) => {
  // We need to use Aggregate Paginate here to handle the large data
  //Login is not needed for this operation
  // get the response from the Video DB

  const video = await Video.find({ isPublished: true }).select(
    "-isPublished -owner"
  );
  // use select operation to hide sensitive information and send the data to the user
  return res
    .status(200)
    .json(new ApiResponse(200, video, "All video is fetched"));
});

// Search a video with title
const searchVideo = asyncHandler(async (req, res) => {
  const { title, description, id, sort } = req.query;
  const queryObject = {};
  if (title) {
    queryObject.title = { $regex: title, $options: "i" };
  }
  if (description) {
    queryObject.description = { $regex: description, $options: "i" };
  }
  if (id) {
    queryObject._id = id;
  }
  let video = Video.find(queryObject);

  //SORTING fUNCTIONALITY
  if (sort) {
    let sortFix = sort.replace(",", " ");
    video = video.sort(sortFix);
  }
  const videoOutput = await video;

  return res
    .status(200)
    .json(new ApiResponse(200, videoOutput, "Output Fetch Successfully"));
});

export {
  videoUpload,
  videoPlay,
  publishVideo,
  searchVideo,
  deleteVideo,
  getAllVideo,
};

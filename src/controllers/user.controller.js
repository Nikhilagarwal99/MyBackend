import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// err, req, res, next;
const registerUser = asyncHandler(async (req, res) => {
  // GET user details from frontend
  const { fullname, email, username, password } = req.body;
  // Validation - not empty
  if (
    [fullname, email, username, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All Fields is required");
  }
  // Check if user already exists: username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User Already Created");
  }
  // Check for images, check for avatar

  let coverImageLocalPath, avatarLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Upload them to cloudinary, avatar

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Create user object - create entry in db
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Remove password & Refresh token field from response

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // Check for user creation

  if (!createdUser) {
    throw new ApiError(500, "Something went wront while registering the user");
  }

  // Return response- User created successfully

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Succesfully"));
});

export { registerUser };

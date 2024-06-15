import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Generate Access & Refresh Token Methods

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating Tokens");
  }
};
// err, req, res, next;
//Register a new User
const registerUser = asyncHandler(async (req, res) => {
  // GET user details from frontend
  const { fullname, email, username, password } = req.body;
  // Validation - not empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    console.log("Nhi chal rha bhai");
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
  // console.log(req.files)

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
  // console.log(avatarLocalPath, coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Upload them to cloudinary, avatar

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  // console.log(avatar);

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
// Login the user
const loginUser = asyncHandler(async (req, res) => {
  // get username or password from user req.body -> data

  const { username, password, email } = req.body;
  // validate if user is enter username or password, both field is required (username oe email)
  if (!(username || email || password)) {
    throw new ApiError(400, "Username or password is required");
  }
  // Find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User doesn't Exists");
  }

  // If entered, validate the username and password with the server,
  const ispasswordValid = await user.isPasswordCorrect(password);
  if (!ispasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }
  // If the entered credentials are validated, generate the accesss token & refresh token for the application
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Sent the token in secure cookies
  const options = { httpOnly: true, secure: true };

  // send the response

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User LoggedIn Successfully"
      )
    );
});
// Logout the User
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );
  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successfully"));
});

// Refresh Access Token End Point
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh Token Invalid");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    console.log(user?.refreshToken);
    console.log("\n New le le ");
    console.log(incomingRefreshToken);
    if (incomingRefreshToken !== (await user?.refreshToken)) {
      throw new ApiError(401, "Refresh Token is expired or Invalid");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Token response ");
  }
});

//Change the Password Functionality
const changeCurrentPassword = asyncHandler(async (req, res) => {
  //Take the user Input of old password & new Password
  const { oldPassword, newPassword } = req.body;
  // find the user in db
  const user = await User.findById(req.user?._id);
  // Validate the Old password
  if (!(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, "Please Enter correct password ");
  }
  //if old passsword is validated, change the current password of the user & update in the DB
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: { password: newPassword },
    },
    {
      new: true,
    }
  );
  // user.password = newPassword;
  // const successFlag = await user.save({ validateBeforeSave: false });

  // if (!successFlag) {
  //   throw new ApiError(500, "Some issue with the DB, Plase try again later");
  // }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { password: "Password changed successfully" },
        "Password is changed"
      )
    );
});
// Get the details of loggedin User
const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(
    new ApiResponse(
      200,
      {
        user: req.user,
      },
      "Current User Fetched Successfully"
    )
  );
});
// Update the profile avatar of user
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avataLocalPath = req.file?.path;
  if (!avataLocalPath) {
    throw new ApiError(400, "Avatar File is missing");
  }
  const avatar = await uploadOnCloudinary(avataLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading file on  cloudinary avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(201)
    .json(new ApiResponse(201, user, "Profile picture updated Successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
};

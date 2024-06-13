import { asyncHandler } from "../utils/asyncHandler.js";

// err, req, res, next;
const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "OK",
  });
});

export { registerUser };

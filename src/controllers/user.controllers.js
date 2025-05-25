import { asyncHandler } from "../utils/asyncHandler.js"
import APIerror from "../utils/APIerrors.js"
import APIresponse from "../utils/APIresponse.js"
import { User } from "../models/user.models.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
const generateRefreshAndAccessTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessTokens()
        const refreshToken = user.generateRefreshTokens()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { refreshToken, accessToken }
    } catch (error) {
        throw new APIerror(500, "Something went wrong while genrating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend  -
    // validation - not empty  -
    // check if user already exists: username, email -
    // check for images, check for avatar -
    // upload them to cloudinary, avatar -
    // create user object - create entry in db -
    // remove password and refresh token field from response -
    // check for user creation -
    // return res -
    const { fullName, email, userName, password } = req.body
    if (userName == "") {
        throw new APIerror(400, "UserName is required !!")
    }
    if (email == "") {
        throw new APIerror(400, "Email is required !!")
    }
    if (fullName == "") {
        throw new APIerror(400, "FullName is required !!")
    }
    if (password == "") {
        throw new APIerror(400, "Password is required !!")
    }

    /*you also use this format rather then if confitions
 if (
        [fullName, email, userName, password].some((field) => field?.trim() === "")
    ) {
        throw new APIerror(400, "All fields are required")
    }
*/
    const uniqueUser = await User.findOne({
        $or: [{ userName }, { email }],
    })
    if (uniqueUser) {
        throw new APIerror(409, "User already exists ")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path
    if (!avatarLocalPath) {
        throw new APIerror(400, "Avatar image is required")
    }
    const avatarUpload = await uploadToCloudinary(avatarLocalPath)
    const coverImageUpload = await uploadToCloudinary(coverImageLocalPath)
    if (!avatarUpload) {
        throw new APIerror(400, " Avatar is required")
    }
    const user = await User.create({
        fullName,
        userName,
        avatar: avatarUpload.url,
        coverImage: coverImageUpload?.url || "",
        password,
        email,
    })
    const isUserCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!isUserCreated) {
        throw new APIerror(
            500,
            "Something went wrong while registering the user"
        )
    }
    return res
        .status(200)
        .json(new APIresponse(200, isUserCreated, "User created successfully"))
})
const loginUser = asyncHandler(async (req, res) => {
    // get data for login -
    // check username or email are there -
    //find the user -
    //password check -
    //access and referesh token
    //send cookie
    const { userName, email, password } = req.body

    if (!(userName || email)) {
        throw new APIerror(400, "UserName or Email is required")
    }
    const getUser = await User.findOne({
        $or: [{ userName }, { email }],
    })
    if (!getUser) {
        throw new APIerror(404, "User not found")
    }
    const isPasswordCorrect = await getUser.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
        throw new APIerror(401, "Password Incorrect")
    }
    const { refreshToken, accessToken } = await generateRefreshAndAccessTokens(
        getUser._id
    )
    const userLoginStatus = await User.findById(getUser._id).select(
        "-password -refreshToken"
    )
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new APIresponse(
                200,
                {
                    user: userLoginStatus,
                    accessToken,
                    refreshToken,
                },
                "User logged in succesfully"
            )
        )
})
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._conditions._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new APIresponse(200, {}, "User logged Out"))
})
const getRefreshToken = asyncHandler(async (req, res) => {
    const gettingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken
    if (!gettingRefreshToken) {
        throw new APIerror(401, "Unauthorised request")
    }
    try {
        const decodedToken = jwt.verify(
            gettingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new APIerror(401, "Cannot find user (Invalid refresh token)")
        }
        if (gettingRefreshToken != user.refreshToken) {
            throw new APIerror(401, "Refresh token expired or is invalid")
        }
        const { accessToken, newRefreshToken } = generateRefreshAndAccessTokens(
            user._id
        )
        const options = {
            httpOnly: true,
            secure: true,
        }
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new APIresponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new APIerror(401, error.message || "Invalid refresh token")
    }
})
const changePassword = asyncHandler(async (req, res) => {
    const { password, newPassword } = req.body
    const user = await User.findById(req.user._conditions._id)
    const checkingOldPassword = await user.isPasswordCorrect(password)
    if (!checkingOldPassword) {
        throw new APIerror(400, "Current password is incorrect")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res
        .status(200)
        .json(new APIresponse(200, {}, "Password updated successfully"))
})
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._conditions._id).select(
        "-password -refreshToken"
    )
    return res
        .status(200)
        .json(new APIresponse(200, user, "User fetched Successfully "))
})
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName) {
        throw new APIerror(400, "New fullname required")
    }
    if (!email) {
        throw new APIerror(400, "New email required")
    }
    const userId = req.user._conditions._id
    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                fullName: fullName,
                email: email,
            },
        },
        {
            new: true,
        }
    ).select("-password")
    return res
        .status(200)
        .json(
            new APIresponse(200, user, "Account details updated successfully")
        )
})
const changeAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new APIerror(400, "Avatar not found ")
    }
    const avatar = await uploadToCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new APIerror(400, "Avatar is required")
    }
    const user = await User.findByIdAndUpdate(
        req.user._conditions._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(new APIresponse(200, user, "Avatar image updated successfully"))
})
const changeCoverImage = asyncHandler(async (req, res) => {
    const CoverImageLocalPath = req.file?.path
    if (!CoverImageLocalPath) {
        throw new APIerror(400, "CoverImage not found ")
    }
    const CoverImage = await uploadToCloudinary(CoverImageLocalPath)
    if (!CoverImage) {
        throw new APIerror(400, "CoverImage is required")
    }
    const user = await User.findByIdAndUpdate(
        req.user._conditions._id,
        {
            $set: {
                coverImage: CoverImage.url,
            },
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new APIresponse(200, user, "CoverImage image updated successfully")
        )
})
const getUserChannelInfo = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new APIerror(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                userName: username,
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subsciber",
                as: "subscibedTo",
            },
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers",
                },
                channelSubscribedToCount: {
                    $size: "$subscibedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [
                                new mongoose.Types.ObjectId(
                                    `${req.user._conditions._id}`
                                ),
                                "$subscribers.subsciber",
                            ],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ])
    if (!channel?.length) {
        throw new APIerror(404, "channel does not exists")
    }
    return res
        .status(200)
        .json(
            new APIresponse(200, channel[0], "User channel fetching succesful")
        )
})
const getWatchHistory = asyncHandler(async (req, res) => {
    const userId = req.user._conditions._id
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(`${userId}`),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ])
    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    getRefreshToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    changeAvatar,
    changeCoverImage,
    getUserChannelInfo,
    getWatchHistory,
}

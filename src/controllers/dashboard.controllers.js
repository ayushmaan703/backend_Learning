import mongoose from "mongoose"
import { Video } from "../models/video.models.js"
import { Subscription } from "../models/subscription.models.js"
import { Likes } from "../models/likes.model.js"
import APIerror from "../utils/APIerrors.js"
import APIresponse from "../utils/APIresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._conditions._id
    const totalSubsciber = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(`${userId}`),
            },
        },
        {
            $group: {
                _id: null,

                subscriberCount: {
                    $sum: 1,
                },
            },
        },
    ])
    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(`${userId}`),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedVideos",
                as: "likes",
            },
        },
        {
            $project: {
                viwes: "$views",
                totalLikes: {
                    $size: "$likes",
                },
                totalVideos: 1,
            },
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes",
                },
                totalViews: {
                    $sum: "$viwes",
                },
                totalVideos: {
                    $sum: 1,
                },
            },
        },
    ])
    const channelStats = {
        totalSubscribers: totalSubsciber[0]?.subscriberCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0,
    }

    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                channelStats,
                "channel stats fetched successfully"
            )
        )
})


const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._conditions._id
    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(`${userId}`),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedVideos",
                as: "likes",
            },
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: { date: "$createdAt" },
                },
                likesCount: {
                    $size: "$likes",
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                discription: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1,
                },
                isPublished: 1,
                likesCount: 1,
            },
        },
    ])
    return res
        .status(200)
        .json(new APIresponse(200, video, "channel stats fetched successfully"))
})

export { getChannelStats, getChannelVideos }

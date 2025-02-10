import mongoose, { isValidObjectId } from "mongoose"
import APIerror from "../utils/APIerrors.js"
import APIresponse from "../utils/APIresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Likes } from "../models/likes.model.js"
import { Video } from "../models/video.models.js"
import { Comments } from "../models/comments.model.js"
import { Tweets } from "../models/tweets.model.js"
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new APIerror(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new APIerror(400, "Video not found by the given Id")
    }
    const alreadyLiked = await Likes.findOne({
        likedVideos: videoId,
        likedBy: req.user._conditions._id,
    })
    if (alreadyLiked) {
        await Likes.findByIdAndDelete(alreadyLiked?._id)
        return res
            .status(200)
            .json(new APIresponse(200, { isliked: false }, "Video unliked"))
    }
    await Likes.create({
        likedVideos: videoId,
        likedBy: req.user._conditions._id,
    })

    return res
        .status(200)
        .json(new APIresponse(200, { isLiked: true }, "Video liked"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new APIerror(400, "Invalid comment id")
    }
    const comment = await Comments.findById(commentId)
    if (!comment) {
        throw new APIerror(400, "Comment not found by the given Id")
    }
    const alreadyLiked = await Likes.findOne({
        likedComments: commentId,
        likedBy: req.user._conditions._id,
    })
    if (alreadyLiked) {
        await Likes.findByIdAndDelete(alreadyLiked?._id)
        return res
            .status(200)
            .json(new APIresponse(200, { isliked: false }, "Comment unliked"))
    }
    await Likes.create({
        likedComments: commentId,
        likedBy: req.user._conditions._id,
    })

    return res
        .status(200)
        .json(new APIresponse(200, { isLiked: true }, "Comment liked"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new APIerror(400, "Invalid tweet id")
    }
    const tweet = await Tweets.findById(tweetId)
    if (!tweet) {
        throw new APIerror(400, "Tweet not found by the given Id")
    }
    const alreadyLiked = await Likes.findOne({
        likedTweets: tweetId,
        likedBy: req.user._conditions._id,
    })
    if (alreadyLiked) {
        await Likes.findByIdAndDelete(alreadyLiked?._id)
        return res
            .status(200)
            .json(new APIresponse(200, { isliked: false }, "Tweet unliked"))
    }
    await Likes.create({
        likedTweets: tweetId,
        likedBy: req.user._conditions._id,
    })

    return res
        .status(200)
        .json(new APIresponse(200, { isLiked: true }, "Tweet liked"))
})
const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._conditions._id
    const likedVideosAggregrate = await Likes.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(`${userId}`),
            },
        },
        {
            $lookup: {
                from: "videos",
                foreignField: "_id",
                localField: "likedVideos",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                // id: 0,//inclusion and exclusion are not possible at the same time but if written at last then its ok 
                likedVideo: {
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    discription: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    _id: 1,
                    ownerDetails: {
                        userName: 1,
                        fullName: 1,
                        avatar: 1,
                    },
                },
                _id: 0,
            },
        },
    ])
    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                likedVideosAggregrate,
                "liked videos fetched successfully"
            )
        )
})

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos }

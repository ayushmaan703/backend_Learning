import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import APIerror from "../utils/APIerrors.js"
import APIresponse from "../utils/APIresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {
    uploadToCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js"
import { Comments } from "../models/comments.model.js"
import { Likes } from "../models/likes.model.js"
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, discription } = req.body
    if (!title) {
        throw new APIerror(404, "Title of video is not there")
    }
    if (!discription) {
        throw new APIerror(404, "Description of video is not there")
    }
    const videoLocalPath = req.files.videoFile[0].path
    const thumbnailLocalPath = req.files.thumbnail[0].path
    if (!(videoLocalPath && thumbnailLocalPath)) {
        throw new APIerror(400, "Video and thumbnail required for upload")
    }
    const videoUpload = await uploadToCloudinary(videoLocalPath)
    const thumbnailUpload = await uploadToCloudinary(thumbnailLocalPath)
    if (!(videoUpload && thumbnailUpload)) {
        throw new APIerror(500, "Error uploading")
    }
    const video = await Video.create({
        videoFile: { url: videoUpload.url, public_id: videoUpload.public_id },
        thumbnail: {
            url: thumbnailUpload.url,
            public_id: thumbnailUpload.public_id,
        },
        title,
        discription,
        isPublished: false,
        owner: req.user._conditions._id,
        duration: videoUpload.duration,
    })
    const isVideoUploaded = await Video.findById(video._id)
    if (!isVideoUploaded) {
        throw new APIerror(500, "videoUpload failed please try again")
    }

    return res
        .status(200)
        .json(new APIresponse(200, video, "Video uploaded successfully"))
})
const getAllVideos = asyncHandler(async (req, res) => {
    const {
        limit = 10,
        query,
        userId,
        lastCreatedAt,
        sortBy,
        sortType,
    } = req.query

    const limitInt = parseInt(limit, 10)

    const pipeline = []

    if (query) {
        const searchStage = {
            $search: {
                index: "searchVideos",
                text: {
                    query: query || "",
                    path: ["title", "discription"],
                    fuzzy: {
                        maxEdits: 2,
                        prefixLength: 0,
                    },
                },
            },
        }

        if (lastCreatedAt) {
            searchStage.$search.searchAfter = [new Date(lastCreatedAt)]
        }

        pipeline.push(searchStage)
    }

    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1,
            },
        })
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1,
            },
        })
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new APIerror(400, "Invalid user")
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        })
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [{ $project: { userName: 1, avatar: 1 } }],
            },
        },
        { $unwind: "$ownerDetails" },
        { $limit: limitInt }
    )

    const results = await Video.aggregate(pipeline)

    // Find `lastCreatedAt` for next page
    const nextCursor =
        results.length > 0 ? results[results.length - 1].createdAt : null

    return res.status(200).json(
        new APIresponse(
            200,
            {
                docs: results,
                nextCursor, // Pass to client to fetch next page
                hasNextPage: results.length === limitInt,
            },
            "Videos fetched successfully"
        )
    )
})
//comments are not showing in getVideoById
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user._conditions._id
    if (!isValidObjectId(videoId)) {
        throw new APIerror(400, "Invalid video id")
    }
    if (!isValidObjectId(userId)) {
        throw new APIerror(400, "Invalid user id")
    }
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(`${videoId}`),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedVideos",
                as: "totalLikes",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers",
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
                            userName: 1,
                            avatar: 1,
                            isSubscribed: 1,
                            subscriberCount: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$totalLikes",
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                new mongoose.Types.ObjectId(
                                    `${req.user._conditions._id}`
                                ),
                                "$totalLikes.likedBy",
                            ],
                        },
                        then: true,
                        else: false,
                    },
                },
                owner: {
                    $first: "$ownerDetails",
                },
            },
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                discription: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comment: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            },
        },
    ])
    if (!video) {
        throw new APIerror(500, "failed to fetch video")
    }
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        },
    })

    await User.findByIdAndUpdate(req.user._conditions._id, {
        $addToSet: {
            watchHistory: videoId,
        },
    })
    return res
        .status(200)
        .json(
            new APIresponse(200, video[0], "video details fetched successfully")
        )
})
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, discription } = req.body
    const video = await Video.findById(videoId)
    const oldThumbnailId = video.thumbnail.public_id
    if (!(title && discription)) {
        throw new APIerror(400, "New title and discription required")
    }
    if (!isValidObjectId(videoId)) {
        throw new APIerror(400, "Video not found")
    }
    var updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title,
                discription: discription,
            },
        },
        {
            new: true,
        }
    )
    const newThumbnailLocalPath = req.file?.path
    if (newThumbnailLocalPath) {
        await deleteFromCloudinary(oldThumbnailId)
        const newThumbnail = await uploadToCloudinary(newThumbnailLocalPath)
        updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            {
                $set: {
                    thumbnail: {
                        url: newThumbnail.url,
                        public_id: newThumbnail.public_id,
                    },
                },
            },
            {
                new: true,
            }
        )
    }
    if (!updatedVideo) {
        throw new APIerror(500, "Failed to upload")
    }
    return res
        .status(200)
        .json(new APIresponse(200, updatedVideo, "Updation successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new APIerror(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new APIerror(400, "Video not found")
    }
    if (video?.owner.toString() !== req.user._conditions._id.toString()) {
        throw new APIerror(
            400,
            "You can't delete the video as you ae not the owner "
        )
    }
    const deletedVideo = await Video.findByIdAndDelete(videoId)
    if (!deletedVideo) {
        throw new APIerror(400, "Failed to delete the video ")
    }
    await deleteFromCloudinary(video.videoFile.public_id, "video")
    await deleteFromCloudinary(video.thumbnail.public_id)
    await Likes.deleteMany({
        likedVideos: videoId,
    })

    await Comments.deleteMany({
        videos: videoId,
    })

    return res
        .status(200)
        .json(new APIresponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new APIerror(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new APIerror(400, "Video not found")
    }
    if (video?.owner.toString() !== req.user._conditions._id.toString()) {
        throw new APIerror(
            400,
            "You can't delete the video as you ae not the owner "
        )
    }
    const videoPublishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished,
            },
        },
        {
            new: true,
        }
    )
    if (!videoPublishStatus) {
        throw new APIerror(500, "Failed to toogle video publish status")
    }

    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                { isPublished: videoPublishStatus.isPublished },
                "Video publish toggled successfully"
            )
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
}

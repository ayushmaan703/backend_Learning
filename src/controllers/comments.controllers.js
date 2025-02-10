import mongoose from "mongoose"
import { isValidObjectId } from "mongoose"
import { Comments } from "../models/comments.model.js"
import { Likes } from "../models/likes.model.js"
import APIerror from "../utils/APIerrors.js"
import APIresponse from "../utils/APIresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    if (!isValidObjectId(videoId)) {
        throw new APIerror(200, "Invalid video id")
    }
    const commentAggregate = Comments.aggregate([
        {
            $match: {
                videos: new mongoose.Types.ObjectId(`${videoId}`),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedComments",
                as: "likedComments",
            },
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likedComments",
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                new mongoose.Types.ObjectId(
                                    `${req.user._conditions._id}`
                                ),
                                "$likedComments.likedBy",
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
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likeCount: 1,
                owner: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1,
                },
                isLiked: 1,
            },
        },
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const comments = await Comments.aggregatePaginate(commentAggregate, options)

    return res
        .status(200)
        .json(new APIresponse(200, comments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body
    if (!content) {
        throw new APIerror(400, "Comment is required")
    }
    const comment = await Comments.create({
        content: content,
        videos: videoId,
        owner: req.user._conditions._id,
    })
    if (!comment) {
        throw new APIerror(500, "failed to upload comment")
    }
    return res
        .status(200)
        .json(new APIresponse(200, comment, "Comment uploaded successfully"))
})
const updateComment = asyncHandler(async (req, res) => {
    const { newComment } = req.body
    const { commentId } = req.params
    if (!newComment) {
        throw new APIerror(400, "Comment required")
    }
    if (!isValidObjectId(commentId)) {
        throw new APIerror(400, "Invalid comment id")
    }
    const comment = await Comments.findById(commentId)
    if (comment?.owner.toString() !== req.user._conditions._id.toString()) {
        throw new APIerror(400, "only comment owner can edit their comment")
    }

    const updatedComment = await Comments.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: newComment,
            },
        },
        {
            new: true,
        }
    )
    if (!updatedComment) {
        throw new APIerror(500, "Failed to update comment")
    }
    return res
        .status(200)
        .json(
            new APIresponse(200, updatedComment, "Comment updated sucessfully")
        )
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new APIerror(400, "Invaid comment id")
    }
    const comment = await Comments.findById(commentId)
    if (!comment) {
        throw new APIerror(400, "Comment not found")
    }
    if (comment?.owner.toString() !== req.user._conditions._id.toString()) {
        throw new APIerror(400, "only comment owner can edit their comment")
    }
    await Comments.findByIdAndDelete(commentId)

    await Likes.deleteMany({
        likedComments: commentId,
        likedBy: req.user._conditions._id,
    })

    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                { ID: commentId },
                "Comment deleted successfully"
            )
        )
})

export { getVideoComments, addComment, updateComment, deleteComment }

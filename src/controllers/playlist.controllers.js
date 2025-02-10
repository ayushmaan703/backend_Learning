import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import APIerror from "../utils/APIerrors.js"
import APIresponse from "../utils/APIresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { json } from "express"
import { Video } from "../models/video.models.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name = "playlist", description = "playlist" } = req.body
    const playlist = await Playlist.create({
        playlistName: name,
        playlistDiscription: description,
        owner: req.user._conditions._id,
    })
    if (!playlist) {
        throw new APIerror(500, "Error while creating playlist")
    }
    return res
        .status(200)
        .json(new APIresponse(200, playlist, "Playlist created"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!isValidObjectId(userId)) {
        throw new APIerror(400, "Invalid user id")
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(
                    `${req.user._conditions._id}`
                ),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videosInPlaylist",
            },
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videosInPlaylist",
                },
                thumbnail: {
                    $first: "$videosInPlaylist.thumbnail.url",
                },
            },
        },
        {
            $project: {
                playlistName: 1,
                playlistDiscription: 1,
                totalVideos: 1,
                updatedAt: 1,
                createdAt: 1,
                thumbnail: 1,
            },
        },
    ])
    if (!playlist) {
        throw new APIerror(500, "Failed to retrive user playlist")
    }
    return res
        .status(200)
        .json(new APIresponse(200, playlist, "users playlist"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new APIerror(400, "Invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new APIerror(400, "No playlist found by this id")
    }
    const playlistAggregrate = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(`${playlistId}`),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videoOwnerDetails",
                        },
                    },
                    {
                        $unwind: "$videoOwnerDetails",
                    },
                ],
            },
        },
        // {
        //     $match: {
        //         "videos.isPublished": true,
        //     },
        // },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$playlistVideo",
                },
                owner: {
                    $first: "$ownerDetails",
                },
            },
        },
        {
            $project: {
                playlistName: 1,
                playlistDiscription: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                playlistVideo: {
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    discription: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1,
                    _id: 1,
                    isPublished: 1,
                    videoOwnerDetails: {
                        fullName: 1,
                        userName: 1,
                        avatar: 1,
                    },
                },
                owner: {
                    userName: 1,
                },
            },
        },
    ])
    if (!playlistAggregrate) {
        throw new APIerror(500, "Failed to retrive playlist")
    }
    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                playlistAggregrate[0],
                "playlist fetched successfully"
            )
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
        throw new APIerror(400, "Invalid playlist or video id")
    }
    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)
    if (!video) {
        throw new APIerror(400, "Video not found")
    }
    if (!playlist) {
        throw new APIerror(400, "Playlist not found")
    }
    if (playlist.owner?.toString() !== req.user._conditions._id.toString()) {
        throw new APIerror(400, "only owner can add video to thier playlist")
    }
    const addingVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    )
    if (!addingVideo) {
        throw new APIerror(
            400,
            "failed to add video to playlist please try again"
        )
    }

    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                addingVideo,
                "Added video to playlist successfully"
            )
        )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
        throw new APIerror(400, "Invalid playlist or video id")
    }
    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)
    if (!video) {
        throw new APIerror(400, "Video not found")
    }
    if (!playlist) {
        throw new APIerror(400, "Playlist not found")
    }
    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user._conditions._id.toString()
    ) {
        throw new APIresponse(
            400,
            "only owner can delete video to thier playlist"
        )
    }
    const deletingVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    )
    if (!deletingVideo) {
        throw new APIerror(
            400,
            "failed to delete video from playlist please try again"
        )
    }

    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                deletingVideo,
                "Deleting video from playlist successfully"
            )
        )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new APIerror(400, "Invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new APIerror(400, "Playlist not found")
    }
    if (playlist.owner.toString() !== req.user._conditions._id.toString()) {
        throw new APIerror(400, "only owner can delete the playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)
    return res
        .status(200)
        .json(new APIresponse(200, "Playlist deleted succsefully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    if (!isValidObjectId(playlistId)) {
        throw new APIerror(400, "Invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new APIerror(400, "Playlist not found")
    }
    if (!(name || description)) {
        throw new APIerror(400, "Name and discription required")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                playlistName: name,
                playlistDiscription: description,
            },
        },
        {
            new: true,
        }
    )
    if (!updatePlaylist) {
        throw new APIerror(500, "Failed to update playlist")
    }
    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                updatedPlaylist,
                "playlist updated successfully"
            )
        )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
}

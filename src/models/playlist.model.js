import mongoose, { Schema } from "mongoose"
const playlistSchema = new Schema(
    {
        playlistName: {
            type: String,
            required: true,
        },
        playlistDiscription: {
            type: String,
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
    },
    { timestamps: true }
)
export const Playlist = mongoose.model("Playlist", playlistSchema)

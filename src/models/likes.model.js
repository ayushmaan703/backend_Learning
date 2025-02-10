import mongoose, { Schema } from "mongoose"

const likesSchema = new Schema(
    {
        likedVideos: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        likedComments: {
            type: Schema.Types.ObjectId,
            ref: "Comments",
        },
        likedTweets: {
            type: Schema.Types.ObjectId,
            ref: "Tweets",
        },
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
)
export const Likes = mongoose.model("Likes", likesSchema)

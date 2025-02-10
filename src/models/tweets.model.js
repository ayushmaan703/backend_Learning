import mongoose, { Schema } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const tweetSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        tweetContent: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
)
tweetSchema.plugin(mongooseAggregatePaginate)
export const Tweets = mongoose.model("Tweets", tweetSchema)

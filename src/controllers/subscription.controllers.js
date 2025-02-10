import mongoose, { isValidObjectId } from "mongoose"
import { Subscription } from "../models/subscription.models.js"
import APIerror from "../utils/APIerrors.js"
import APIresponse from "../utils/APIresponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if (!isValidObjectId(channelId)) {
        throw new APIerror(400, "Invaild channel id")
    }
    const isSubscribed = await Subscription.findOne({
        subsciber: req.user._conditions._id,
        channel: channelId,
    })
    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed?._id)
        return res
            .status(200)
            .json(
                new APIresponse(
                    200,
                    { Subscribed: false },
                    "Unsubscribed the channel"
                )
            )
    }
    await Subscription.create({
        subsciber: req.user._conditions._id,
        channel: channelId,
    })
    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                { subscribed: true },
                "subscribed successfully"
            )
        )
})

const getChannelSubscribersListOfTheUser = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if (!isValidObjectId(channelId)) {
        throw new APIerror(400, "Invaild channel id")
    }
    const channel = await Subscription.findOne({
        channel: channelId,
    })
    if (!channel) {
        throw new APIerror(404, "Channel not found")
    }
    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(`${channelId}`),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subsciber",
                foreignField: "_id",
                as: "subscribedUser",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "numberOfUserSubscribedToTheSubscriberOfTheGivenChannelId",
                        },
                    },
                    {
                        $addFields: {
                            subscribercount: {
                                $size: "$numberOfUserSubscribedToTheSubscriberOfTheGivenChannelId",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscribedUser",
        },
        {
            $project: {
                subscribedUser: {
                    userName: 1,
                    fullName: 1,
                    _id: 1,
                    subscribercount: 1,
                    avatar: 1,
                },
            },
        },
    ])

    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                subscribers,
                "subscribers fetched successfully"
            )
        )
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new APIerror(400, "Invaild subscriber id")
    }
    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subsciber: new mongoose.Types.ObjectId(`${subscriberId}`),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos",
                            },
                        },
                    },
                ],
            },
        },

        {
            $unwind: "$subscribedChannel",
        },
        {
            $project: {
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    userName: 1,
                    fullName: 1,
                    avatar: 1,
                    latestVideo: {
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                        isPublished:1
                    },
                },
            },
        },
    ])
    return res
        .status(200)
        .json(
            new APIresponse(
                200,
                subscribedChannels,
                "subscribed channels fetched successfully"
            )
        )
})

export {
    toggleSubscription,
    getChannelSubscribersListOfTheUser,
    getSubscribedChannels,
}

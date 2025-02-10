import { Router } from "express"
import {
    getSubscribedChannels,
    getChannelSubscribersListOfTheUser,
    toggleSubscription,
} from "../controllers/subscription.controllers.js"
import { verifyJWT } from "../middlewares/authentication.middleware.js"

const router = Router()
router.use(verifyJWT) // Apply verifyJWT middleware to all routes in this file

router.route("/c/:subscriberId").get(getSubscribedChannels)
router.route("/toggle/:channelId").post(toggleSubscription)

router.route("/u/:channelId").get(getChannelSubscribersListOfTheUser)

export default router

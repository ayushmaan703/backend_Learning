import { Router } from "express"
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
    getAllTweets
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/authentication.middleware.js"

const router = Router()
router.use(verifyJWT)

router.route("/").post(createTweet)
router.route("/get-tweets").get(getAllTweets)
router.route("/user/:userId").get(getUserTweets)
router.route("/update/:tweetId").patch(updateTweet)
router.route("/delete/:tweetId").delete(deleteTweet)

export default router

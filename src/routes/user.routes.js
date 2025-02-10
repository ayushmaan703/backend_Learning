import { Router } from "express"
import {
    registerUser,
    loginUser,
    logoutUser,
    getRefreshToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    changeAvatar,
    changeCoverImage,
    getUserChannelInfo,
    getWatchHistory,
} from "../controllers/user.controllers.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/authentication.middleware.js"
const router = Router()
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(getRefreshToken)
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/current-user").post(verifyJWT, getCurrentUser)
router.route("/update-details").patch(verifyJWT, updateAccountDetails)
router
    .route("/update-avatar")
    .post(verifyJWT, upload.single("avatar"), changeAvatar)
router
    .route("/update-coverImage")
    .post(verifyJWT, upload.single("coverImage"), changeCoverImage)
router.route("/c/:username").get(verifyJWT, getUserChannelInfo)
router.route("/history").get(verifyJWT, getWatchHistory)
export default router

import { Router } from "express"
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js"
import { verifyJWT } from "../middlewares/authentication.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/").get(getAllVideos)

router.route("/publish-video").post(
    verifyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
    ]),
    publishAVideo
)

router.route("/get-video/:videoId").get(verifyJWT, getVideoById)
router.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo)
router
    .route("/update/:videoId")
    .patch(verifyJWT, upload.single("thumbnail"), updateVideo)

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus)

export default router

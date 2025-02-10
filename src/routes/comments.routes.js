import { Router } from "express"
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comments.controllers.js"
import { verifyJWT } from "../middlewares/authentication.middleware.js"

const router = Router()

router.use(verifyJWT)

router.route("/:videoId").get(getVideoComments)
router.route("/add-comment/:videoId").post(addComment)
router.route("/update-comment/:commentId").patch(updateComment)
router.route("/delete-comment/:commentId").delete(deleteComment)

export default router

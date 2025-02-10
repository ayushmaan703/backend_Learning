import { Router } from "express"
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controllers.js"
import { verifyJWT } from "../middlewares/authentication.middleware.js"

const router = Router()

router.use(verifyJWT)
router.route("/add-playlist").post(createPlaylist)

router.route("/g/:playlistId").get(getPlaylistById)
router.route("/u/:playlistId").patch(updatePlaylist)
router.route("/d/:playlistId").delete(deletePlaylist)

router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist)
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist)

router.route("/user/:userId").get(getUserPlaylists)

export default router

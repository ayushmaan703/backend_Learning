import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import morgan from "morgan"
const app = express()

app.use(
    cors({
        origin: '*',
        // process.env.CORS_ORIGIN,
        credentials: true,
    })
)
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())
app.use(morgan("dev"))

import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comments.routes.js"
import likesRouter from "./routes/likes.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import healthCheckRouter from "./routes/healthCheck.routes.js"
app.use("/api/v1/user", userRouter)
app.use("/api/v1/video", videoRouter)
app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/likes", likesRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/tweet", tweetRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/healthCheck", healthCheckRouter)

export default app

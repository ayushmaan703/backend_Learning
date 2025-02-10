import dotenv from "dotenv"
import connectToDB from "./src/db/db.js"
import app from "./src/app1.js"
dotenv.config({ path: "./.env" })

connectToDB()
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server is running at the port ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log(`Connection failed with DB `, error)
    })

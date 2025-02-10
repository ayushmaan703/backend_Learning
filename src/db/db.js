import mongoose from "mongoose"
import { dbName } from "../constants.js"

const connectToDB = async () => {
    try {
        const connectionDetails = await mongoose.connect(
            `${process.env.MONGODB_URL}/${dbName}`
        )
        console.log(
            `Connection Established Sucessfully DB host: ${connectionDetails.connection.host}`
        )
    } catch (error) {
        console.log("Error Establishing Connection ", error)
        process.exit(1)
    }
}
export default connectToDB

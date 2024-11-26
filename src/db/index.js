import mongoose from "mongoose";

const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}`);
        console.log(`\nMongoDb Connected !! DB HOST: ${connectionInstance.connection.host} `.bgCyan.white);

    } catch (error) {
        console.log("MONGODB Connection error ", error);
        process.exit(1)
    }
}

export default connectDb;
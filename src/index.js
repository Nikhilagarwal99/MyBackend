import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config();
connectDB()
  .then(
    app.on("error", (error) => {
      console.log("Error", error);
      throw error;
    }),
    app.listen(process.env.PORT || 4000),
    () => {
      console.log(`Server is running at PORT ${process.env.PORT || 4000}`);
    }
  )
  .catch((err) => {
    console.log("Mongo DB conection failed!!");
  });

/*
import express from express;
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}`);
    app.on("error", (error)=>{
        console.log("Error", error);
        throw error
    })
    app.listen(process.env.PORT,()=>{
        console.log(`App is listening on PORT ${process.env.PORT}`)
    })
  } catch (error) {
    console.error("ERROR:", error);
    throw error;
  }
})();

*/

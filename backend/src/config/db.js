import mongoose from "mongoose";

let connectionReady = false;
export let useMemoryStore = false;

export async function connectDB(uri) {
  if (!uri) {
    useMemoryStore = true;
    return null;
  }

  if (connectionReady) {
    return mongoose.connection;
  }

  await mongoose.connect(uri, {
    autoIndex: true
  });

  connectionReady = true;
  useMemoryStore = false;
  return mongoose.connection;
}

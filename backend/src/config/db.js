import mongoose from "mongoose";

let connectionReady = false;
export let useMemoryStore = false;

export async function connectDB(uri) {
  if (!uri) {
    useMemoryStore = true;
    // This is a dev/demo-only fallback: no persistence across restarts,
    // and it's easy to accidentally deploy without MONGODB_URI set and
    // not notice until queue data starts disappearing. Make it loud.
    console.warn(
      "=========================================================\n" +
        "  MONGODB_URI is not set - SmartQueue is running with an\n" +
        "  IN-MEMORY store. Data will NOT persist across restarts.\n" +
        "  This mode is for local development/demos only.\n" +
        "========================================================="
    );
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

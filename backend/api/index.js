import "dotenv/config";
import { createApp } from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let appPromise;

export default async function handler(req, res) {
  if (!appPromise) {
    // NOTE: this serverless entry point runs without a Socket.io server
    // (createApp(null)) - Vercel's serverless functions don't support the
    // persistent connections Socket.io needs. That means queue:joined /
    // queue:updated realtime events never fire when deployed this way;
    // only the long-running server in src/server.js (e.g. on Render)
    // supports realtime push. The frontend falls back to polling when it
    // can't establish a socket connection, so the UI still stays
    // reasonably fresh here - just not instantly.
    console.warn(
      "[SmartQueue] Running in serverless mode: realtime Socket.io events are unavailable. " +
        "The frontend will fall back to polling."
    );
    appPromise = (async () => {
      await connectDB(process.env.MONGODB_URI);
      return createApp(null);
    })();
  }
  const app = await appPromise;
  return app(req, res);
}

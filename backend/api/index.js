import "dotenv/config";
import { createApp } from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let app;

export default async function handler(req, res) {
  if (!app) {
    await connectDB(process.env.MONGODB_URI);
    app = createApp(null);
  }
  return app(req, res);
}

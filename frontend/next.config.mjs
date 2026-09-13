--- a/frontend/next.config.mjs
+++ b/frontend/next.config.mjs
@@ -1,6 +1,13 @@
 /** @type {import('next').NextConfig} */
 const nextConfig = {
-  output: "export",
+  // NOTE: this used to be output: "export", paired with postbuild scripts
+  // that copied the static export into public/. That combination broke
+  // clean-URL routing on Vercel: `next export` writes pages as
+  // dashboard.html/about.html rather than dashboard/index.html, and
+  // without a vercel.json rewrite mapping clean paths to those files,
+  // Vercel 404s on /dashboard and /about (confirmed on the live site).
+  // Removing the static export and letting Vercel build this as a normal
+  // Next.js app fixes routing for all pages with zero extra config.
   images: {
     unoptimized: true
   }

import crypto from "node:crypto";

let warnedInsecureMode = false;

function timingSafeEquals(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  // timingSafeEqual throws if buffers differ in length, so pad/compare a
  // fixed-length hash instead of the raw values - this avoids leaking
  // length information via early rejection while still being constant-time
  // with respect to content.
  const hashA = crypto.createHash("sha256").update(bufA).digest();
  const hashB = crypto.createHash("sha256").update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Admin routes require ADMIN_API_KEY to be set. Previously, if the env var
 * was missing, the middleware called next() and let every request through
 * unauthenticated - a "fails open" default that's easy to ship by
 * accident. Now it fails *closed* (403) unless the operator explicitly
 * opts into insecure local-dev mode with ALLOW_INSECURE_ADMIN=true.
 */
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    if (process.env.ALLOW_INSECURE_ADMIN === "true") {
      if (!warnedInsecureMode) {
        console.warn(
          "[SmartQueue] ADMIN_API_KEY is not set and ALLOW_INSECURE_ADMIN=true - " +
            "admin routes are UNAUTHENTICATED. This must never be used in production."
        );
        warnedInsecureMode = true;
      }
      return next();
    }

    return res.status(403).json({
      error:
        "Admin routes are disabled: ADMIN_API_KEY is not configured. " +
        "Set ADMIN_API_KEY, or set ALLOW_INSECURE_ADMIN=true for local development only."
    });
  }

  const provided = req.header("x-admin-key");
  if (!provided || !timingSafeEquals(provided, expected)) {
    return res.status(401).json({ error: "Unauthorized admin access" });
  }

  return next();
}

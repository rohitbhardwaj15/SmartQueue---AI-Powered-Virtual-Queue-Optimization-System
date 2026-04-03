export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return next();
  }

  const provided = req.header("x-admin-key");
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "Unauthorized admin access" });
  }

  return next();
}

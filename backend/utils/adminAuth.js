const crypto = require("crypto");

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || "change-this-admin-secret";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString("hex");

const createPasswordRecord = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return { salt, hash };
};

const verifyPassword = (password, salt, expectedHash) => {
  if (!password || !salt || !expectedHash) {
    return false;
  }

  const hash = hashPassword(password, salt);
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(hash, "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
};

const signToken = (adminId) => {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${adminId}.${expiresAt}`;
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
};

const verifyToken = (token) => {
  if (!token) {
    return null;
  }

  let decoded;

  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch (_error) {
    return null;
  }

  const parts = decoded.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [adminId, expiresRaw, signature] = parts;
  const payload = `${adminId}.${expiresRaw}`;
  const expectedSignature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");

  if (signature !== expectedSignature) {
    return null;
  }

  const expiresAt = Number(expiresRaw);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  return { adminId, expiresAt };
};

const extractBearerToken = (authorizationHeader = "") => {
  const [scheme, token] = String(authorizationHeader).split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
};

module.exports = {
  createPasswordRecord,
  verifyPassword,
  signToken,
  verifyToken,
  extractBearerToken
};

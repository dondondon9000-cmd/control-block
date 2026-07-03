import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'control_block_session';
const SESSION_DAYS = 30;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function createSessionToken() {
  return new SignJWT({ sub: 'donny' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export { COOKIE_NAME, SESSION_DAYS };

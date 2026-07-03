import { NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME, SESSION_DAYS } from '@/lib/auth';

export async function POST(req) {
  const { passcode } = await req.json();

  if (!process.env.CONTROL_BLOCK_PASSCODE) {
    return NextResponse.json({ error: 'Server is not configured with CONTROL_BLOCK_PASSCODE' }, { status: 500 });
  }

  if (passcode !== process.env.CONTROL_BLOCK_PASSCODE) {
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}

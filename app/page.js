import { redirect } from 'next/navigation';
import { sql, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  await ensureSchema();
  const rows = await sql`SELECT onboarded_at FROM profile WHERE id = 1`;
  const profile = rows[0];
  if (!profile || !profile.onboarded_at) {
    redirect('/onboarding');
  }
  redirect('/talk');
}

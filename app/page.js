import { redirect } from 'next/navigation';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function RootPage() {
  const profile = db.prepare('SELECT onboarded_at FROM profile WHERE id = 1').get();
  if (!profile || !profile.onboarded_at) {
    redirect('/onboarding');
  }
  redirect('/talk');
}

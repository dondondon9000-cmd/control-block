'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/talk', label: 'Talk' },
  { href: '/history', label: 'History' },
  { href: '/insights', label: 'Insights' },
  { href: '/weekly', label: 'Weekly' },
  { href: '/monthly', label: 'Monthly' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login' || pathname === '/onboarding') return null;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-white/5 bg-void/80 px-6 py-3 backdrop-blur">
      <Link href="/talk" className="font-semibold tracking-wide text-neuron">
        CONTROL BLOCK
      </Link>
      <div className="flex items-center gap-5 text-sm">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              pathname.startsWith(l.href)
                ? 'text-neuron'
                : 'text-slate-400 hover:text-slate-200 transition-colors'
            }
          >
            {l.label}
          </Link>
        ))}
        <button onClick={logout} className="text-slate-500 hover:text-alert transition-colors">
          Sign out
        </button>
      </div>
    </nav>
  );
}

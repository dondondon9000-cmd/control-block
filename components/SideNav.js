'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useSphere } from './SphereProvider';
import { emotionColor } from './EmotionBadge';

const SphereCanvas = dynamic(() => import('./SphereCanvas'), { ssr: false });

const STATUS_TEXT = {
  idle: 'Sphere is calm',
  listening: 'Sphere is listening…',
  thinking: 'Sphere is thinking…',
  speaking: 'Sphere is responding…',
};

const NAV_ITEMS = [
  {
    href: '/talk',
    label: 'Talk',
    sublabel: 'Chat with Sphere',
    icon: (
      <path
        d="M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: '/insights',
    label: 'Dashboard',
    sublabel: 'Insights & Stats',
    icon: (
      <>
        <path d="M4 20V10" strokeLinecap="round" />
        <path d="M11 20V4" strokeLinecap="round" />
        <path d="M18 20v-7" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: '/history',
    label: 'History',
    sublabel: 'Conversations',
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: '/weekly',
    label: 'Weekly Reflection',
    sublabel: 'Review & Summary',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 9h16M8 3v4M16 3v4" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: '/monthly',
    label: 'Monthly Reflection',
    sublabel: 'Deep Insights',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 9h16M8 3v4M16 3v4" strokeLinecap="round" />
        <circle cx="12" cy="14.5" r="2" />
      </>
    ),
  },
];

function NavIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarBody({
  pathname,
  showSidebarSphere,
  sphereState,
  amplitude,
  emotion,
  onLogout,
  onResetOnboarding,
  onNavigate,
}) {
  return (
    <>
      <Link href="/talk" onClick={onNavigate} className="mb-4 flex items-center gap-3 px-2">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neuron to-neuron2 shadow-glow">
          <span className="h-3 w-3 rounded-full bg-void" />
        </span>
        <span>
          <span className="block text-sm font-bold tracking-wide text-slate-100">CONTROL BLOCK</span>
          <span className="block text-[10px] uppercase tracking-wider text-neuron/70">
            Your Private AI Companion
          </span>
        </span>
      </Link>

      {showSidebarSphere && (
        <div className="mb-4 flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-black py-6">
          <SphereCanvas state={sphereState} amplitude={amplitude} className="h-44 w-44" />
          <div className="glass-panel flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: sphereState === 'idle' ? '#64748b' : '#6ee7ff' }}
            />
            <span className="text-slate-300">{STATUS_TEXT[sphereState]}</span>
          </div>
          {emotion && (
            <div className="glass-panel flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: emotionColor(emotion) }} />
              <span className="capitalize text-slate-300">{emotion}</span>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                active
                  ? 'border border-neuron2/30 bg-gradient-to-r from-neuron/10 to-neuron2/10 text-neuron shadow-glow'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <NavIcon>{item.icon}</NavIcon>
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-[11px] text-slate-500">{item.sublabel}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-pulse/20 bg-pulse/5 px-3 py-2.5 text-pulse">
          <NavIcon>
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 018 0v3" strokeLinecap="round" />
          </NavIcon>
          <span>
            <span className="block text-xs font-medium">Private &amp; Secure</span>
            <span className="block text-[10px] text-pulse/70">All data belongs to you.</span>
          </span>
        </div>
        <button
          onClick={onResetOnboarding}
          className="w-full rounded-xl px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-white/5 hover:text-neuron2"
        >
          Redo onboarding
        </button>
        <button
          onClick={onLogout}
          className="w-full rounded-xl px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-white/5 hover:text-alert"
        >
          Sign out
        </button>
      </div>
    </>
  );
}

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { sphereState, amplitude, emotion } = useSphere();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Desktop-only "just the sphere" mode — starts closed on every load (not
  // read from localStorage until after mount) so there's no server/client
  // hydration mismatch; flips to the saved preference right after mount.
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    setSidebarHidden(localStorage.getItem('controlblock:sidebarHidden') === 'true');
  }, []);

  if (pathname === '/login' || pathname === '/onboarding') return null;

  // The Talk page has its own big hero sphere, so the small sidebar
  // version would just be a redundant duplicate there.
  const showSidebarSphere = pathname !== '/talk';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function resetOnboarding() {
    if (!window.confirm('This clears your current future vision, obstacles, and growth plan so you can redo onboarding from scratch. Your journal history is not affected. Continue?')) {
      return;
    }
    await fetch('/api/profile/reset', { method: 'POST' });
    router.push('/onboarding');
  }

  function setSidebarHiddenPersisted(hidden) {
    setSidebarHidden(hidden);
    localStorage.setItem('controlblock:sidebarHidden', String(hidden));
  }

  return (
    <>
      {/* Mobile top bar — sits in normal document flow (not fixed), so the
          layout's flex-col chain sizes everything without needing manual
          padding to avoid overlapping content. */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-panel/80 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="p-1 text-slate-300">
          <MenuIcon />
        </button>
        <Link href="/talk" className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-neuron to-neuron2 shadow-glow" />
          <span className="text-xs font-bold tracking-wide text-slate-100">CONTROL BLOCK</span>
        </Link>
        <button onClick={logout} aria-label="Sign out" className="p-1 text-slate-500">
          <LogoutIcon />
        </button>
      </header>

      {/* Mobile slide-in drawer with the full nav */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-panel px-4 py-6 shadow-2xl">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 p-1 text-slate-400"
            >
              <CloseIcon />
            </button>
            <SidebarBody
              pathname={pathname}
              showSidebarSphere={showSidebarSphere}
              sphereState={sphereState}
              amplitude={amplitude}
              emotion={emotion}
              onLogout={logout}
              onResetOnboarding={resetOnboarding}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop sidebar — identical to the original design, just hidden below
          lg (and hideable entirely at lg+ via the collapse toggle below, for
          a "just the sphere" view). */}
      <aside
        className={`relative hidden h-screen w-80 shrink-0 flex-col border-r border-white/5 bg-panel/60 px-4 py-6 backdrop-blur ${
          sidebarHidden ? '' : 'lg:flex'
        }`}
      >
        <button
          onClick={() => setSidebarHiddenPersisted(true)}
          aria-label="Hide sidebar"
          title="Hide sidebar"
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-600 transition hover:bg-white/5 hover:text-slate-300"
        >
          <ChevronIcon direction="left" />
        </button>
        <SidebarBody
          pathname={pathname}
          showSidebarSphere={showSidebarSphere}
          sphereState={sphereState}
          amplitude={amplitude}
          emotion={emotion}
          onLogout={logout}
          onResetOnboarding={resetOnboarding}
        />
      </aside>

      {/* Floating restore tab — the only way back once the sidebar's hidden,
          so it has to be outside the aside itself. Desktop only; mobile has
          its own hamburger/drawer that this never touches. */}
      {sidebarHidden && (
        <button
          onClick={() => setSidebarHiddenPersisted(false)}
          aria-label="Show sidebar"
          title="Show sidebar"
          className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 rounded-r-lg border border-l-0 border-white/10 bg-panel/80 px-1.5 py-4 text-slate-500 backdrop-blur transition hover:text-neuron lg:block"
        >
          <ChevronIcon direction="right" />
        </button>
      )}
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname === '/onboarding') return null;

  return (
    <nav className="flex shrink-0 items-center justify-around border-t border-white/5 bg-panel/90 py-2 backdrop-blur lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 ${
              active ? 'text-neuron' : 'text-slate-500'
            }`}
          >
            <NavIcon>{item.icon}</NavIcon>
          </Link>
        );
      })}
    </nav>
  );
}

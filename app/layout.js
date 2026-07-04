import './globals.css';
import SideNav, { MobileBottomNav } from '@/components/SideNav';
import { SphereProvider } from '@/components/SphereProvider';

export const metadata = {
  title: 'Control Block',
  description: 'A private conversational AI journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void text-slate-100">
        <SphereProvider>
          {/* flex-col on mobile stacks [top bar, main, bottom tabs] in normal
              document flow; lg:flex-row restores the original side-by-side
              desktop layout untouched. h-screen (not min-h-screen) gives the
              flex chain a definite height so pages that manage their own
              internal scroll (like Talk) can size against it correctly. */}
          <div className="flex h-screen flex-col lg:flex-row">
            <SideNav />
            {/* On mobile, main is the scroll container for any page taller
                than one screen (Insights, History, etc.) — without its own
                overflow, that content would spill past main's flexbox-
                computed height, and the bottom tab bar (next flex sibling)
                would render on top of it instead of below it. Reset to the
                original (no overflow property) at lg: since desktop never
                had this fixed-bottom-bar sibling to conflict with. */}
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto lg:overflow-visible">{children}</main>
            <MobileBottomNav />
          </div>
        </SphereProvider>
      </body>
    </html>
  );
}

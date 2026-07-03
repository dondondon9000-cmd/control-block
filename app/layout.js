import './globals.css';
import SideNav from '@/components/SideNav';

export const metadata = {
  title: 'Control Block',
  description: 'A private conversational AI journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void text-slate-100">
        <div className="flex min-h-screen">
          <SideNav />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

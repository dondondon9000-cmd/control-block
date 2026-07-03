import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'Control Block',
  description: 'A private conversational AI journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void text-slate-100">
        <NavBar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}

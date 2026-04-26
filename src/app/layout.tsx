import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentic Realm',
  description: 'A multi-agent AI web app for economics, finance, technology, medical, law, and media.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

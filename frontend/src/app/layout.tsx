import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import NavBar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Upstream Literacy — District Community Platform',
  description: 'Connect with district peers facing similar challenges',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body className="min-h-screen bg-gray-50">
        <NavBar />
        {children}
      </body>
    </html>
  );
}

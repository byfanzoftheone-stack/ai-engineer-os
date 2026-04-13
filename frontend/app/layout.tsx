import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Engineer OS — by FanzoftheOne',
  description: 'Your autonomous AI engineering co-pilot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

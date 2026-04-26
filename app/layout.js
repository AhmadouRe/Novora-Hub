import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata = {
  title: 'Novora Hub — Operating System',
  description: 'Novora Capital central hub and tool launcher',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable}`}>
      <body style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }}>
        {children}
      </body>
    </html>
  );
}

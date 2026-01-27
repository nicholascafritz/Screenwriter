import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Screenwriter — AI-Powered Screenplay IDE',
  description: 'Write screenplays with AI assistance. Brainstorm, outline, draft, edit, and revise with real-time AI collaboration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-ui antialiased">
        {children}
      </body>
    </html>
  );
}

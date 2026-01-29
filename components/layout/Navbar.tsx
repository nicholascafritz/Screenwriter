'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/firebase/auth-context';
import { Clapperboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <nav className="flex h-14 items-center justify-between border-b border-border bg-surface px-6 flex-shrink-0">
      {/* Left: Logo + Nav links */}
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Clapperboard className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-foreground">Screenwriter</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'text-foreground bg-secondary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right: User + Sign out */}
      <div className="flex items-center gap-3">
        {user?.email && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
            {user.email}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => signOut()}
        >
          <LogOut className="h-3 w-3" />
          Log Out
        </Button>
      </div>
    </nav>
  );
}

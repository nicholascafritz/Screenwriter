'use client';

import React from 'react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex items-center justify-between px-6 py-4 border-t border-border text-xs text-muted-foreground mt-auto flex-shrink-0">
      <span>&copy; {year} Screenwriter IDE. All rights reserved.</span>
      <div className="flex items-center gap-4">
        <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
        <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
        <a href="#" className="hover:text-foreground transition-colors">Support</a>
      </div>
    </footer>
  );
}

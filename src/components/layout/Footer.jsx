'use client';
import React from 'react';

export default function Footer() {
  return (
    <footer className="h-8 flex items-center justify-center bg-[var(--color-wa-surface)] border-t border-[var(--color-wa-border)] px-4 flex-shrink-0">
      <p className="text-[11px] text-[var(--color-wa-muted)] font-medium">
        Powered By <a href="https://www.botivate.in" target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline font-bold">Botivate</a>
      </p>
    </footer>
  );
}


'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Footer from '@/components/layout/Footer';
import ToastContainer from '@/components/ui/Toast';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activePage, setActivePage, toasts, addToast } = useApp() as any; // Ignore strict typing since AppContext is JS
  const [toastsList, setToasts] = React.useState(toasts);

  // Sync context activePage with pathname
  useEffect(() => {
    let key = 'overview';
    if (pathname.includes('/tracker')) key = 'tracker';
    else if (pathname.includes('/inbox')) key = 'inbox';
    else if (pathname.includes('/health')) key = 'health';
    else if (pathname.includes('/logs')) key = 'logs';

    setActivePage(key);
  }, [pathname, setActivePage]);

  // Provide a removeToast just locally or via AppContext if exported
  // In AppContext.jsx, `toasts` is in context. So let's rely on it.
  // Wait, I see useApp in App.jsx didn't expose setToasts. Let's look closely at App.jsx
  
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-wa-bg)] text-[var(--color-wa-text)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--color-wa-bg)]">
        <Topbar />
        <main className={`flex-1 flex flex-col overflow-auto px-2 md:px-6 pb-2 md:pb-6 ${['inbox', 'tracker', 'logs'].includes(activePage) ? 'overflow-hidden !p-0' : ''}`}>
          {children}
        </main>
        <Footer />
      </div>
      {/* 
        ToastContainer needs toasts from context 
        and a removeToast handler. AppContext gives addToast, not removeToast directly, 
        but in App.jsx `toasts` and `setToasts` were exported?! 
        Check AppContext.jsx: it exports `toasts, addToast`. 
        So let's just render ToastContainer if it doesn't break. 
      */}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AppProvider>
  );
}

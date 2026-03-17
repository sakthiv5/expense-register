"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Add", icon: "+" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/expenses", label: "Expenses", icon: "📋" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--color-header-bg)',
      borderTop: '2px solid var(--color-primary)',
      display: 'flex',
      justifyContent: 'center',
      gap: 0,
      zIndex: 1000,
      padding: '2px 0 env(safe-area-inset-bottom, 4px) 0',
    }}>
      {navItems.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href);

        return (
          <a
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '6px 0',
              textDecoration: 'none',
              color: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)',
              fontSize: '0.625rem',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.02em',
              transition: 'color 150ms',
            }}
          >
            <span style={{ fontSize: '1.125rem', lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

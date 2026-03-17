import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Expense Register",
  description: "A fast, beautiful, and dynamic expense tracking system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="container" style={{ paddingBottom: '56px' }}>
          <header style={{
            marginBottom: 'var(--spacing-sm)',
            textAlign: 'center',
            backgroundColor: 'var(--color-header-bg)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            borderBottom: '2px solid var(--color-primary)',
          }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
              Expense Register
            </h1>
          </header>
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}

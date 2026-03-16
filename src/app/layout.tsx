import type { Metadata } from "next";
import "./globals.css";

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
        <main className="container">
          <header style={{
            marginBottom: 'var(--spacing-xl)',
            textAlign: 'center',
            backgroundColor: 'var(--color-header-bg)',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderRadius: 'var(--radius-lg)',
            borderBottom: '3px solid var(--color-primary)',
          }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
              Expense Register
            </h1>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}

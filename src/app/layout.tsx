import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { PaletteProvider } from '@/providers/palette-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fleucy',
  description: 'Personal finance OS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen antialiased">
          <ThemeProvider>
            <PaletteProvider>
              <QueryProvider>
                {children}
                <Toaster richColors position="top-right" />
              </QueryProvider>
            </PaletteProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

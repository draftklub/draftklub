import type { Metadata } from 'next';
import { Inter, Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider, ThemeScript } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryProvider } from '@/components/query-provider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const geist = Geist({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-geist',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'DraftKlub — Onde o Klub acontece',
    template: '%s | DraftKlub',
  },
  description:
    'Plataforma SaaS para clubes brasileiros de esportes de raquete. Reserve quadras, acompanhe rankings, organize torneios.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? 'https://draftklub.com'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'DraftKlub',
    title: 'DraftKlub — Onde o Klub acontece',
    description:
      'Plataforma SaaS para clubes brasileiros de esportes de raquete. Reserve quadras, acompanhe rankings, organize torneios.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans text-foreground antialiased',
          inter.variable,
          geist.variable,
          jetbrains.variable,
        )}
      >
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
        <ToastProvider />
      </body>
    </html>
  );
}

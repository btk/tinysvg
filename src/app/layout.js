import './globals.css';

const siteTitle = 'TinySVG - Free SVG Optimizer and Simplifier';
const siteDescription = 'Free online tool to optimize and simplify your SVG files. Reduce file size, remove unnecessary elements, and improve SVG performance with precision controls.';

export const metadata = {
  title: {
    default: siteTitle,
    template: '%s | TinySVG'
  },
  description: siteDescription,
  keywords: 'SVG optimizer, SVG simplifier, SVG compression, vector graphics, web optimization, path simplification, SVG tools',
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: 'https://tinysvg.dev',
    siteName: 'TinySVG',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TinySVG - SVG Optimizer and Simplifier',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
} 
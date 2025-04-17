import './globals.css';

export const metadata = {
  title: 'SVG Simplifier',
  description: 'A tool to simplify and optimize SVG files',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
} 
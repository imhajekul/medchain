import '../index.css';
import Script from 'next/script';
import Providers from './providers';

export const metadata = {
  title: 'MedVault | Decentralized Medical Records Vault',
  description: 'Decentralized, end-to-end encrypted medical record storage & verifiable doctor access on blockchain.',
  icons: {
    icon: '/vite.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0f1d',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

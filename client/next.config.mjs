import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-router-dom': path.resolve(__dirname, 'src/navigation/index.jsx'),
    };

    config.plugins.push(
      new webpack.DefinePlugin({
        'import.meta.env.VITE_API_URL': JSON.stringify(process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || ''),
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || ''),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || ''),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || ''),
        'import.meta.env.VITE_CHAIN_ID': JSON.stringify(process.env.NEXT_PUBLIC_CHAIN_ID || process.env.VITE_CHAIN_ID || '80002'),
        'import.meta.env.VITE_CHAIN_NAME': JSON.stringify(process.env.NEXT_PUBLIC_CHAIN_NAME || process.env.VITE_CHAIN_NAME || 'Polygon Amoy'),
        'import.meta.env.VITE_RPC_URL': JSON.stringify(process.env.NEXT_PUBLIC_RPC_URL || process.env.VITE_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com'),
        'import.meta.env.VITE_CONTRACT_ADDRESS': JSON.stringify(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS || '0x38b8AcE4624DEb11568A57866e4a28Ece055D0f6'),
        'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || ''),
        'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '1029791844039-3qk7mh166006ulo3e3f0qoq570jdj6fi.apps.googleusercontent.com'),
      })
    );

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/:path*` : 'http://localhost:3001/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/auth/:path*` : 'http://localhost:3001/auth/:path*',
      },
      {
        source: '/health',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/health` : 'http://localhost:3001/health',
      },
    ];
  },
};

export default nextConfig;

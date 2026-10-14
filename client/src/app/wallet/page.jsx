'use client';

import Wallet from '../../views/Wallet';
import { AuthenticatedRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function WalletPage() {
  return (
    <AuthenticatedRoute>
      <PageTransition>
        <Wallet />
      </PageTransition>
    </AuthenticatedRoute>
  );
}

'use client';

import SecurityPage from '../../views/SecurityPage';
import { AuthenticatedRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function KeysPage() {
  return (
    <AuthenticatedRoute>
      <PageTransition>
        <SecurityPage />
      </PageTransition>
    </AuthenticatedRoute>
  );
}

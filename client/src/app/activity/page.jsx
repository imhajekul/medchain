'use client';

import ActivityPage from '../../views/ActivityPage';
import { AuthenticatedRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function ActivityRoutePage() {
  return (
    <AuthenticatedRoute>
      <PageTransition>
        <ActivityPage />
      </PageTransition>
    </AuthenticatedRoute>
  );
}

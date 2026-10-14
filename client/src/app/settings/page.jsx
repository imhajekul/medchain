'use client';

import SettingsPage from '../../views/SettingsPage';
import { AuthenticatedRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function SettingsRoutePage() {
  return (
    <AuthenticatedRoute>
      <PageTransition>
        <SettingsPage />
      </PageTransition>
    </AuthenticatedRoute>
  );
}

'use client';

import SettingsPage from '../../views/SettingsPage';
import { AuthenticatedRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function ProfilePage() {
  return (
    <AuthenticatedRoute>
      <PageTransition>
        <SettingsPage />
      </PageTransition>
    </AuthenticatedRoute>
  );
}

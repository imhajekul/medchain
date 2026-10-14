'use client';

import AccessGrantsPage from '../../views/AccessGrantsPage';
import { PatientRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function GrantsPage() {
  return (
    <PatientRoute>
      <PageTransition>
        <AccessGrantsPage />
      </PageTransition>
    </PatientRoute>
  );
}

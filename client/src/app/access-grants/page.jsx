'use client';

import AccessGrantsPage from '../../views/AccessGrantsPage';
import { PatientRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function AccessGrantsIndexPage() {
  return (
    <PatientRoute>
      <PageTransition>
        <AccessGrantsPage />
      </PageTransition>
    </PatientRoute>
  );
}

'use client';

import RecordsPage from '../../views/RecordsPage';
import { PatientRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function RecordsIndexPage() {
  return (
    <PatientRoute>
      <PageTransition>
        <RecordsPage />
      </PageTransition>
    </PatientRoute>
  );
}

'use client';

import Dashboard from '../../views/Dashboard';
import { PatientRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function DashboardPage() {
  return (
    <PatientRoute>
      <PageTransition>
        <Dashboard />
      </PageTransition>
    </PatientRoute>
  );
}

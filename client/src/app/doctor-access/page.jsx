'use client';

import DoctorAccess from '../../views/DoctorAccess';
import { DoctorRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function DoctorAccessPage() {
  return (
    <DoctorRoute>
      <PageTransition>
        <DoctorAccess />
      </PageTransition>
    </DoctorRoute>
  );
}

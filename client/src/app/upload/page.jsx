'use client';

import UploadRecord from '../../views/UploadRecord';
import { PatientRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function DirectUploadPage() {
  return (
    <PatientRoute>
      <PageTransition>
        <UploadRecord />
      </PageTransition>
    </PatientRoute>
  );
}

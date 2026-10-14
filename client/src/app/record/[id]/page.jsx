'use client';

import RecordDetail from '../../../views/RecordDetail';
import { PatientRoute, PageTransition } from '../../../components/auth/RouteGuards';

export default function SingleRecordDetailPage() {
  return (
    <PatientRoute>
      <PageTransition>
        <RecordDetail />
      </PageTransition>
    </PatientRoute>
  );
}

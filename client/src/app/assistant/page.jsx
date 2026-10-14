'use client';

import AiAssistant from '../../views/AiAssistant';
import { AuthenticatedRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function AssistantPage() {
  return (
    <AuthenticatedRoute>
      <PageTransition>
        <AiAssistant />
      </PageTransition>
    </AuthenticatedRoute>
  );
}

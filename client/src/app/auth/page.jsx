'use client';

import Auth from '../../views/Auth';
import { GuestRoute, PageTransition } from '../../components/auth/RouteGuards';

export default function AuthPage() {
  return (
    <GuestRoute>
      <PageTransition>
        <Auth />
      </PageTransition>
    </GuestRoute>
  );
}

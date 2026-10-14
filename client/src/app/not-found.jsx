'use client';

import NotFound from '../views/NotFound';
import { PageTransition } from '../components/auth/RouteGuards';

export default function GlobalNotFound() {
  return (
    <PageTransition>
      <NotFound />
    </PageTransition>
  );
}

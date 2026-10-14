'use client';

import Landing from '../views/Landing';
import { PageTransition } from '../components/auth/RouteGuards';

export default function HomePage() {
  return (
    <PageTransition>
      <Landing />
    </PageTransition>
  );
}

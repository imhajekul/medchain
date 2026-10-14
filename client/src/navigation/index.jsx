'use client';

import React, { useEffect, useState, useTransition, useCallback, useMemo } from 'react';
import NextLink from 'next/link';
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useParams as useNextParams
} from 'next/navigation';

/**
 * Next.js-compatible Link component that accepts both `to` (react-router-dom)
 * and `href` (next/link) props.
 */
export const Link = React.forwardRef(function Link(
  { to, href, children, className, style, onClick, replace, scroll, ...rest },
  ref
) {
  const target = to || href || '#';
  return (
    <NextLink
      ref={ref}
      href={target}
      className={className}
      style={style}
      onClick={onClick}
      replace={replace}
      scroll={scroll}
      {...rest}
    >
      {children}
    </NextLink>
  );
});

Link.displayName = 'Link';

/**
 * Hook mimicking react-router-dom's useNavigate() using Next.js useRouter().
 * Supports `navigate('/path')`, `navigate('/path', { replace: true })`, and `navigate(-1)`.
 */
export function useNavigate() {
  const router = useNextRouter();
  const [, startTransition] = useTransition();

  return useCallback(
    (to, options = {}) => {
      if (typeof to === 'number') {
        if (to === -1) {
          router.back();
        } else if (to === 1) {
          router.forward();
        }
        return;
      }

      startTransition(() => {
        if (options?.replace) {
          router.replace(to, { scroll: options?.scroll ?? true });
        } else {
          router.push(to, { scroll: options?.scroll ?? true });
        }
      });
    },
    [router]
  );
}

/**
 * Hook mimicking react-router-dom's useLocation() using Next.js hooks.
 * Returns { pathname, search, hash: '' }.
 * Avoids useSearchParams() during SSR to prevent static prerender deopt.
 */
export function useLocation() {
  const pathname = useNextPathname() || '/';
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearch(window.location.search || '');
    }
  }, [pathname]);

  return useMemo(
    () => ({
      pathname,
      search,
      hash: typeof window !== 'undefined' ? window.location.hash : '',
      state: null,
      key: `${pathname}${search}`
    }),
    [pathname, search]
  );
}

/**
 * Hook mimicking react-router-dom's useParams() using Next.js useParams().
 */
export function useParams() {
  const params = useNextParams();
  return params || {};
}

/**
 * Hook mimicking react-router-dom's useSearchParams() with [searchParams, setSearchParams].
 * Safe across SSR and client navigation.
 */
export function useSearchParams() {
  const [searchParams, setSearchParamsState] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  const router = useNextRouter();
  const pathname = useNextPathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearchParamsState(new URLSearchParams(window.location.search));
    }
  }, [pathname]);

  const setSearchParams = useCallback(
    (newParams) => {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      if (newParams && typeof newParams === 'object') {
        if (typeof newParams.entries === 'function') {
          for (const [key, value] of newParams.entries()) {
            params.set(key, value);
          }
        } else {
          Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              params.delete(key);
            } else {
              params.set(key, String(value));
            }
          });
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
    },
    [pathname, router]
  );

  return [searchParams, setSearchParams];
}

/**
 * Component mimicking react-router-dom's <Navigate to="..." replace />
 */
export function Navigate({ to, replace = false }) {
  const router = useNextRouter();

  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace]);

  return null;
}

/**
 * Stub / Pass-through components for legacy router tree compatibility
 */
export function BrowserRouter({ children }) {
  return <>{children}</>;
}

export function Routes({ children }) {
  return <>{children}</>;
}

export function Route() {
  return null;
}

export default {
  Link,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  Navigate,
  BrowserRouter,
  Routes,
  Route
};

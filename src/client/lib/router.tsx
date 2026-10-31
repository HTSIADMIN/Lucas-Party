"use client";

// Small routing kit on top of Next's App Router, so page components keep a
// simple `to=` / navigate() style.

import { useEffect, type AnchorHTMLAttributes, type ReactNode } from "react";
import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string; children?: ReactNode; replace?: boolean };

export function Link({ to, replace, children, ...rest }: LinkProps) {
  return (
    <NextLink href={to} replace={replace} {...rest}>
      {children}
    </NextLink>
  );
}

export function NavLink({ to, children, ...rest }: LinkProps) {
  const pathname = usePathname();
  const active = pathname === to || (to !== "/" && pathname.startsWith(`${to}/`));
  return (
    <Link to={to} aria-current={active ? "page" : undefined} {...rest}>
      {children}
    </Link>
  );
}

export function useNavigate() {
  const router = useRouter();
  return (to: string, opts: { replace?: boolean } = {}) => (opts.replace ? router.replace(to) : router.push(to));
}

export function useParams<T extends Record<string, string>>(): Partial<T> {
  const params = useNextParams() as Record<string, string | string[]> | null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params ?? {})) out[key] = Array.isArray(value) ? value.join("/") : value;
  return out as Partial<T>;
}

export function useSearchParams(): [URLSearchParams] {
  const params = useNextSearchParams();
  return [new URLSearchParams(params?.toString() ?? "")];
}

export function useLocation() {
  const pathname = usePathname();
  return { pathname, hash: typeof window === "undefined" ? "" : window.location.hash };
}

export function Navigate({ to, replace = true }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return null;
}

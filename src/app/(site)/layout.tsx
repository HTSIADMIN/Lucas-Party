"use client";

import type { ReactNode } from "react";
import { SiteLayout } from "@/client/site/SiteLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

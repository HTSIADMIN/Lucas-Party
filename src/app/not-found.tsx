"use client";

import { NotFoundPage } from "@/client/pages/NotFoundPage";
import { SiteLayout } from "@/client/site/SiteLayout";

export default function NotFound() {
  return (
    <SiteLayout>
      <NotFoundPage />
    </SiteLayout>
  );
}

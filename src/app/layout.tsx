import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/lilita-one/400.css";
import "@fontsource-variable/fredoka/index.css";
import "@/client/styles/tokens.css";
import "@/client/styles/themes.css";
import "@/client/styles/base.css";
import "@/client/styles/components.css";
import "@/client/styles/art.css";
import "@/client/styles/site.css";
import "@/client/styles/tv.css";
import "@/client/styles/phone.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Lucas Games — Party Night",
  description: "Party games for the big screen. Open Lucas Games on your TV and everyone plays on their phone.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1F1250",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="showtime">
      <body>
        <div id="root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}

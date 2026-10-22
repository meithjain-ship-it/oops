import type { ReactNode } from "react";
import type { Viewport } from "next";
import "./globals.css";

export const metadata = {
  title: "OOPS: find exposed keys, understand security alerts",
  description: "Find API keys you left exposed in your code and site, and understand scary security alerts in plain words.",
};

export const viewport: Viewport = {
  themeColor: "#07090d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

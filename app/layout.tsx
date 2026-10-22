import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "OOPS",
  description: "Find exposed API keys and understand security alerts in plain words.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

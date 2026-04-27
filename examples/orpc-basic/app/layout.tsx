import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Fullstack example demonstrating oRPC plugin with Next.js",
  title: "oRPC Example - Type-Safe OpenAPI to oRPC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

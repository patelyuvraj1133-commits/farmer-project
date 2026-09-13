import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MandiMitra | Your mandi, without the wait",
  description: "Book procurement tokens, check mandi capacity, follow your queue, and track your crop from arrival to payment.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

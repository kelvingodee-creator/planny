import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planny",
  description: "Team takenbord voor projecten, taken en sessies.",
  icons: {
    icon: "/assets/planny-tune-logo-rail.png?v=3",
    shortcut: "/assets/planny-tune-logo-rail.png?v=3",
    apple: "/assets/planny-tune-logo-rail.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}

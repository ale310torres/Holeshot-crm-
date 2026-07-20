import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HoleShot OS",
  description: "Dealer management system for HoleShot Power Parts",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

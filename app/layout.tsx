import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O Rio do Seu Jeito | Rio Your Way",
  description: "Roteiro personalizado para o Rio de Janeiro. A personalized Rio de Janeiro itinerary — built around you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

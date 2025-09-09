import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asana Individual Dashboard",
  description: "Individual dashboard for analyzing Asana project data and personal work performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

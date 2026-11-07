import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolveShot AI — Homework help, in a snap.",
  description: "Snap a homework question and get a clear, step-by-step explanation. Math, science, English, history and more.",
  applicationName: "SolveShot AI",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0b10" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

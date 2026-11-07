import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title:"SolveShot AI | Homework help, in a snap",
  description:"Snap your homework question. Learn the answer step by step.",
  applicationName:"SolveShot AI",
};
export const viewport: Viewport = { width:"device-width", initialScale:1, themeColor:"#0b0b11" };
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}

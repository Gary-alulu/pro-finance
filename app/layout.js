import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    template: "%s | ProFinance",
    default: "ProFinance — Personal Wealth Intelligence",
  },
  description:
    "A premium personal wealth intelligence and financial accountability platform. Track assets, liabilities, investments, and documents in one connected financial map.",
  keywords: ["personal finance", "wealth management", "financial tracking", "net worth", "investments"],
  authors: [{ name: "ProFinance" }],
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  openGraph: {
    title: "ProFinance — Personal Wealth Intelligence",
    description: "A premium personal wealth intelligence platform.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}

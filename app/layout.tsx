import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "VendingLink — Vending Machine Link Redeem",
    template: "%s | VendingLink",
  },
  description:
    "Platform penjualan link redeem digital dengan pembayaran online otomatis via Midtrans (QRIS, transfer bank, e-wallet, dan lainnya). Cepat, aman, dan terpercaya.",
  keywords: ["vending machine", "link redeem", "QRIS", "Midtrans", "pembayaran digital"],
  robots: { index: false, follow: false }, // Private app
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className={inter.className}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}

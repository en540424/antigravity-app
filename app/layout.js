// app/layout.js
import "./globals.css";

export const metadata = {
  title: "E-NEXUS",
  description: "越境EC × 物流 × 輸出入のワンストップサービス",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white flex flex-col items-center justify-start">
        {children}
      </body>
    </html>
  );
}

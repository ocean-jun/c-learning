import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C-Learning-Lab · 翁恺C语言刷题系统",
  description: "配套翁恺《C语言程序设计》课程的个人本地刷题系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

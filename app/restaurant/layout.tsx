import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../src/styles.css";
import "./styles-resto.css";

export const metadata: Metadata = {
  title: "RestoCanvas — Схема Зала и Брони",
  description: "Локальная интерактивная схема зала и бронирование столов для сотрудников ресторана",
  manifest: "/manifest.webmanifest",
};

export default function RestaurantLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

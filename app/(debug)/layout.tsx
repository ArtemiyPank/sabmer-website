import { notFound } from "next/navigation";
import "../globals.css";

/**
 * Development-only routes (the 3D debug harness). They sit in their own route
 * group with their own root layout, outside the localized `[locale]` tree, and
 * are not reachable from a production build.
 */
export default function DebugLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}

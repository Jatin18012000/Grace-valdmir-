import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grace OS",
  description: "Local-first AI Influencer Operating System for Grace Vladmir",
};

/** Dashboard sections from the plan that are not built yet. Shown as text, not links. */
const LATER_SECTIONS = ["Generate", "Content", "Assets", "Workflows", "Jobs", "QC", "Settings"];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="side">
            <h1>Grace OS</h1>
            <ul>
              <li><Link href="/">Overview</Link></li>
              <li><Link href="/grace">Grace</Link></li>
            </ul>
            <div className="later">
              Not implemented yet:
              <ul>
                {LATER_SECTIONS.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

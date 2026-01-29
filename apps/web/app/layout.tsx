import "./globals.css";
import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "MuTok",
  description: "Local-first TikTok draft automation"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const styles = {
    shell: { padding: 40, minHeight: "100vh" },
    frame: {
      borderRadius: 36,
      minHeight: "calc(100vh - 80px)",
      overflow: "hidden"
    },
    main: {
      padding: "48px 56px",
      flex: 1,
      minWidth: 0,
      overflowY: "auto"
    },
    content: { maxWidth: 1200, margin: "0 auto" },
    topBar: {}
  } as const;

  return (
    <html lang="en">
      <body className="min-h-screen">
        <div style={styles.shell} className="bg-[var(--bg)]">
          <div
            style={styles.frame}
            className="flex border border-slate-200 bg-white shadow-sm"
          >
            <Sidebar />
            <main
              style={styles.main}
              className="bg-[var(--bg)]"
            >
              <div style={styles.content}>
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

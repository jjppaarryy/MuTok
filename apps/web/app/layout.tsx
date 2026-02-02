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
    shell: { padding: "var(--app-shell-padding)", minHeight: "100vh" },
    frame: {
      borderRadius: "var(--app-frame-radius)",
      minHeight: "100vh",
      overflow: "hidden"
    },
    main: {
      padding: "var(--app-main-padding)",
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

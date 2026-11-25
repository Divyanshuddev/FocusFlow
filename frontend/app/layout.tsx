import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { FocusTimerProvider } from "@/components/providers/FocusTimerProvider";
import { CompletionModal } from "@/components/focus/CompletionModal";

export const metadata: Metadata = {
  title: "FocusFlow – Smart Focus Mode",
  description:
    "Intelligent productivity workspace with Pomodoro deep focus mode, rule-based task prioritization, distraction logging, and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <FocusTimerProvider>
                {children}
                <CompletionModal />
              </FocusTimerProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

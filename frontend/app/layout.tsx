import type { Metadata } from "next";
import "../styles/globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import ToastContainer from "@/components/Toast";

export const metadata: Metadata = {
  title: "Synthetic Facial Expression Generator",
  description: "Identity-preserving synthetic facial expression generation using Stable Diffusion 1.5 img2img.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-purple-500 selection:text-white">
        <AppProvider>
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
          <Navbar />
          {children}
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}

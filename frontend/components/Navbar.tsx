"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, UploadCloud, Layers, Images, History, BookOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Navbar() {
  const pathname = usePathname();
  const { backendHealth, checkHealth } = useApp();

  const navItems = [
    { href: "/", label: "Home", icon: Sparkles },
    { href: "/upload", label: "Upload", icon: UploadCloud },
    { href: "/generate", label: "Studio", icon: Layers },
    { href: "/gallery", label: "Gallery", icon: Images },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Synthetic Expression
            </h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-400">
              Identity-Preserving SD 1.5
            </p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-1.5 backdrop-blur-md">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <a
            href={`${API_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
          >
            <BookOpen className="h-3.5 w-3.5 text-purple-400" />
            API Docs
          </a>

          {/* Health Status Indicator */}
          <button
            type="button"
            onClick={checkHealth}
            title="Click to check API status"
            className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs transition-colors hover:border-slate-700"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  backendHealth === true
                    ? "bg-emerald-400"
                    : backendHealth === false
                    ? "bg-red-400"
                    : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  backendHealth === true
                    ? "bg-emerald-500"
                    : backendHealth === false
                    ? "bg-red-500"
                    : "bg-amber-500"
                }`}
              />
            </span>
            <span className="text-slate-400 text-[11px] font-medium">
              {backendHealth === true ? "API Ready" : backendHealth === false ? "API Offline" : "Checking..."}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

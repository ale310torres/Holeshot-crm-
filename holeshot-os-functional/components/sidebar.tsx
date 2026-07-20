"use client";

import {
  BookOpen,
  Boxes,
  Gauge,
  Menu,
  Settings,
  Users,
  Wrench,
  X,
  Bike,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/vehicles", label: "Vehículos", icon: Bike },
  { href: "/work-orders", label: "Órdenes", icon: Wrench },
  { href: "/parts", label: "Inventario", icon: Boxes },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <>
      <div className="flex h-20 items-center justify-between border-b border-zinc-800 px-5">
        <Link href="/dashboard" onClick={() => setOpen(false)}>
          <div className="text-lg font-black italic tracking-tight">
            HOLESHOT <span className="text-racing-500">OS</span>
          </div>
          <div className="text-[10px] uppercase tracking-[.22em] text-zinc-600">Power Parts</div>
        </Link>
        <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X /></button>
      </div>
      <nav className="space-y-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-racing-500/10 text-racing-400" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <button
        className="fixed left-4 top-4 z-30 rounded-lg border border-zinc-800 bg-zinc-950 p-2 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu />
      </button>
      {open && <button className="fixed inset-0 z-30 bg-black/70 md:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-zinc-800 bg-[#0c0c0d] transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {nav}
      </aside>
    </>
  );
}

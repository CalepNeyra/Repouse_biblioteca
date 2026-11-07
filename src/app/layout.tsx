import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "Biblioteca | Laboratorio 12", description: "Gestión de autores y libros con Next.js, Prisma y PostgreSQL." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es" className="h-full antialiased"><body className="flex min-h-full flex-col">
    <nav className="border-b border-slate-200 bg-white" aria-label="Navegación principal"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-5 sm:px-8"><Link href="/" className="mr-auto flex items-center gap-3 font-semibold tracking-tight"><span className="rounded-xl bg-teal-800 px-3 py-2 text-white" aria-hidden="true">B.</span>Biblioteca<span className="hidden text-xs font-normal text-slate-400 sm:inline">TECSUP / LAB 12</span></Link><Link href="/" className="text-sm font-medium text-slate-600 hover:text-teal-700">Autores</Link><Link href="/books" className="text-sm font-medium text-slate-600 hover:text-teal-700">Libros</Link></div></nav>
    {children}<footer className="mx-auto mt-auto flex w-full max-w-7xl flex-wrap justify-between gap-2 px-4 py-8 text-xs text-slate-400 sm:px-8"><span>Biblioteca · Desarrollo de Aplicaciones Web Avanzado</span><span>Laboratorio N.º 12 · Next.js + PostgreSQL</span></footer>
  </body></html>;
}

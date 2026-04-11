import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border sm:px-6">
        <h1 className="text-xl font-bold sm:text-2xl">EDH Deck Builder</h1>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

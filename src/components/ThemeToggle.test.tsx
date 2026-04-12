import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './ThemeToggle'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.removeItem('edh-theme')
})

describe('ThemeToggle', () => {
  it('defaults to light mode when <html> lacks .dark', () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('defaults to dark mode when <html> has .dark', () => {
    document.documentElement.classList.add('dark')
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('toggles from light to dark: adds class and writes localStorage', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    await user.click(screen.getByRole('button'))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('edh-theme')).toBe('dark')
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('toggles from dark to light: removes class and writes localStorage', async () => {
    const user = userEvent.setup()
    document.documentElement.classList.add('dark')
    render(<ThemeToggle />)
    await user.click(screen.getByRole('button'))

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('edh-theme')).toBe('light')
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('toggles repeatedly and stays in sync', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')

    await user.click(btn) // dark
    await user.click(btn) // light
    await user.click(btn) // dark

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('edh-theme')).toBe('dark')
  })
})

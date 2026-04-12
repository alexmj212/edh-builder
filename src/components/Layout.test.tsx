import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Layout } from './Layout'

describe('Layout', () => {
  it('renders the app title', () => {
    render(
      <Layout>
        <div>child</div>
      </Layout>
    )
    expect(screen.getByRole('heading', { level: 1, name: /EDH Deck Builder/i })).toBeInTheDocument()
  })

  it('renders the ThemeToggle button in the header', () => {
    render(
      <Layout>
        <div>child</div>
      </Layout>
    )
    // ThemeToggle exposes an aria-label starting with "Switch to"
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeInTheDocument()
  })

  it('renders children inside <main>', () => {
    render(
      <Layout>
        <p data-testid="child">Hello children</p>
      </Layout>
    )
    const child = screen.getByTestId('child')
    expect(child).toBeInTheDocument()
    expect(child.closest('main')).not.toBeNull()
  })

  it('uses a banner landmark for the header', () => {
    render(
      <Layout>
        <div />
      </Layout>
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})

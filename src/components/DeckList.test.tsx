import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckList } from "./DeckList";
import { useDeckStore } from "../store/deck-store";
import { db } from "../lib/db";
import type { PersistedDeck } from "../types/deck";

function makeDeck(overrides: Partial<PersistedDeck> = {}): PersistedDeck {
  const now = Date.now();
  return {
    id: 1,
    name: "Test Deck",
    commanderId: null,
    commanderName: null,
    colorIdentity: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  useDeckStore.setState({ decks: [], activeDeckId: null, loading: true, error: null });
});

describe("DeckList — status states", () => {
  it('renders "Loading decks..." when loading is true', () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: true });
    render(<DeckList />);
    expect(screen.getByText("Loading decks...")).toBeInTheDocument();
  });

  it("renders error message when error is set", () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false, error: "Boom!" });
    render(<DeckList />);
    expect(screen.getByText("Boom!")).toBeInTheDocument();
  });

  it("shows empty state when no decks exist", async () => {
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false });
    render(<DeckList />);
    await waitFor(() => {
      expect(screen.getByText(/No decks yet/)).toBeInTheDocument();
    });
  });

  it("empty state New Deck button opens create form", async () => {
    const user = userEvent.setup();
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false });
    render(<DeckList />);

    // Only empty-state "New Deck" button is visible (header one is hidden because no decks)
    const newBtns = await screen.findAllByRole("button", { name: "New Deck" });
    await user.click(newBtns[0]);

    expect(screen.getByPlaceholderText("Deck name...")).toBeInTheDocument();
  });

  it("renders deck names after loading", async () => {
    useDeckStore.setState({
      decks: [makeDeck({ id: 1, name: "Atraxa Superfriends" }), makeDeck({ id: 2, name: "Krenko Goblins" })],
      activeDeckId: null,
      loading: false,
    });
    render(<DeckList />);
    await waitFor(() => {
      expect(screen.getByText("Atraxa Superfriends")).toBeInTheDocument();
      expect(screen.getByText("Krenko Goblins")).toBeInTheDocument();
    });
  });
});

describe("DeckList — create flow", () => {
  it("creates a deck via the Create button", async () => {
    const user = userEvent.setup();
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false });
    render(<DeckList />);

    const newBtns = await screen.findAllByRole("button", { name: "New Deck" });
    await user.click(newBtns[0]);

    const input = screen.getByPlaceholderText("Deck name...");
    await user.type(input, "Edgar Vampires");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(useDeckStore.getState().decks.map((d) => d.name)).toContain("Edgar Vampires");
    });
    // Form closes after create
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Deck name...")).not.toBeInTheDocument();
    });
  });

  it("creates a deck when pressing Enter", async () => {
    const user = userEvent.setup();
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false });
    render(<DeckList />);

    const newBtns = await screen.findAllByRole("button", { name: "New Deck" });
    await user.click(newBtns[0]);

    const input = screen.getByPlaceholderText("Deck name...");
    await user.type(input, "Yuriko{enter}");

    await waitFor(() => {
      expect(useDeckStore.getState().decks.map((d) => d.name)).toContain("Yuriko");
    });
  });

  it("does not create a deck when name is empty/whitespace", async () => {
    const user = userEvent.setup();
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false });
    render(<DeckList />);

    const newBtns = await screen.findAllByRole("button", { name: "New Deck" });
    await user.click(newBtns[0]);

    const input = screen.getByPlaceholderText("Deck name...");
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    // Form stays open; no deck was added
    expect(useDeckStore.getState().decks).toHaveLength(0);
    expect(screen.getByPlaceholderText("Deck name...")).toBeInTheDocument();
  });

  it("Cancel button closes the create form without creating", async () => {
    const user = userEvent.setup();
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false });
    render(<DeckList />);

    const newBtns = await screen.findAllByRole("button", { name: "New Deck" });
    await user.click(newBtns[0]);

    await user.type(screen.getByPlaceholderText("Deck name..."), "Throwaway");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useDeckStore.getState().decks).toHaveLength(0);
    expect(screen.queryByPlaceholderText("Deck name...")).not.toBeInTheDocument();
  });

  it("Escape key cancels the create form", async () => {
    const user = userEvent.setup();
    useDeckStore.setState({ decks: [], activeDeckId: null, loading: false });
    render(<DeckList />);

    const newBtns = await screen.findAllByRole("button", { name: "New Deck" });
    await user.click(newBtns[0]);

    const input = screen.getByPlaceholderText("Deck name...");
    await user.type(input, "Nope{escape}");

    expect(useDeckStore.getState().decks).toHaveLength(0);
    expect(screen.queryByPlaceholderText("Deck name...")).not.toBeInTheDocument();
  });
});

describe("DeckList — rename flow", () => {
  async function setupWithOneDeck() {
    const now = Date.now();
    await db.decks.put({
      id: 7,
      name: "Original",
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: now,
      updatedAt: now,
    });
    useDeckStore.setState({
      decks: [makeDeck({ id: 7, name: "Original" })],
      activeDeckId: null,
      loading: false,
    });
  }

  it("renames a deck on Enter", async () => {
    const user = userEvent.setup();
    await setupWithOneDeck();
    render(<DeckList />);
    await user.click(await screen.findByRole("button", { name: "Rename" }));

    const input = screen.getByDisplayValue("Original");
    await user.clear(input);
    await user.type(input, "Renamed!{enter}");

    await waitFor(() => {
      expect(useDeckStore.getState().decks[0].name).toBe("Renamed!");
    });
  });

  it("Escape cancels rename without saving", async () => {
    const user = userEvent.setup();
    await setupWithOneDeck();
    render(<DeckList />);

    await user.click(await screen.findByRole("button", { name: "Rename" }));
    const input = screen.getByDisplayValue("Original");
    await user.clear(input);
    await user.type(input, "Discarded{escape}");

    // Store name unchanged
    expect(useDeckStore.getState().decks[0].name).toBe("Original");
    // Heading reappears with original text
    expect(screen.getByRole("heading", { level: 3, name: "Original" })).toBeInTheDocument();
  });

  it("does not persist rename when value is unchanged", async () => {
    const user = userEvent.setup();
    await setupWithOneDeck();
    render(<DeckList />);

    await user.click(await screen.findByRole("button", { name: "Rename" }));
    const input = screen.getByDisplayValue("Original");
    // Press Enter without changing — treated as no-op
    await user.type(input, "{enter}");

    expect(useDeckStore.getState().decks[0].name).toBe("Original");
  });

  it("does not persist rename when trimmed value is empty", async () => {
    const user = userEvent.setup();
    await setupWithOneDeck();
    render(<DeckList />);

    await user.click(await screen.findByRole("button", { name: "Rename" }));
    const input = screen.getByDisplayValue("Original");
    await user.clear(input);
    await user.type(input, "   {enter}");

    expect(useDeckStore.getState().decks[0].name).toBe("Original");
  });
});

describe("DeckList — delete flow", () => {
  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    await db.decks.put({
      id: 9,
      name: "Doomed",
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    useDeckStore.setState({
      decks: [makeDeck({ id: 9, name: "Doomed" })],
      activeDeckId: null,
      loading: false,
    });
    render(<DeckList />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this deck?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(useDeckStore.getState().decks).toHaveLength(0);
    });
  });

  it('"No" cancels the deletion', async () => {
    const user = userEvent.setup();
    await db.decks.put({
      id: 9,
      name: "Doomed",
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    useDeckStore.setState({
      decks: [makeDeck({ id: 9, name: "Doomed" })],
      activeDeckId: null,
      loading: false,
    });
    render(<DeckList />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "No" }));

    expect(screen.queryByText("Delete this deck?")).not.toBeInTheDocument();
    expect(useDeckStore.getState().decks).toHaveLength(1);
  });
});

describe("DeckList — selection", () => {
  async function seedDeck(id: number, name: string) {
    const now = Date.now();
    await db.decks.put({
      id,
      name,
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  it("clicking a deck card sets it active", async () => {
    const user = userEvent.setup();
    await seedDeck(1, "First");
    await seedDeck(2, "Second");
    useDeckStore.setState({
      decks: [makeDeck({ id: 1, name: "First" }), makeDeck({ id: 2, name: "Second" })],
      activeDeckId: null,
      loading: false,
    });
    render(<DeckList />);

    // h3 → flex row → card (the element with onClick)
    const heading = await screen.findByRole("heading", { level: 3, name: "Second" });
    const card = heading.parentElement!.parentElement!;
    await user.click(card);
    expect(useDeckStore.getState().activeDeckId).toBe(2);
  });

  it("active deck card has ring indicator", async () => {
    await seedDeck(1, "Active One");
    useDeckStore.setState({
      decks: [makeDeck({ id: 1, name: "Active One" })],
      activeDeckId: 1,
      loading: false,
    });
    const { container } = render(<DeckList />);
    await screen.findByText("Active One");
    await waitFor(() => {
      expect(container.querySelector(".ring-2")).not.toBeNull();
    });
  });

  it("entering rename mode does not trigger selection", async () => {
    const user = userEvent.setup();
    await seedDeck(5, "Click-guard");
    useDeckStore.setState({
      decks: [makeDeck({ id: 5, name: "Click-guard" })],
      activeDeckId: null,
      loading: false,
    });
    render(<DeckList />);

    await user.click(await screen.findByRole("button", { name: "Rename" }));
    // The card's onClick should not fire because of stopPropagation
    expect(useDeckStore.getState().activeDeckId).toBeNull();
  });
});

describe("DeckList — relative time display", () => {
  async function seedBoth(name: string, updatedAt: number) {
    const now = Date.now();
    await db.decks.put({
      id: 1,
      name,
      commanderId: null,
      commanderName: null,
      colorIdentity: [],
      createdAt: now,
      updatedAt,
    });
    useDeckStore.setState({
      decks: [makeDeck({ id: 1, name, updatedAt })],
      activeDeckId: null,
      loading: false,
    });
  }

  it('shows "just now" for very recent updates', async () => {
    await seedBoth("Recent", Date.now() - 1000);
    render(<DeckList />);
    expect(await screen.findByText("just now")).toBeInTheDocument();
  });

  it('shows "X min ago" for minutes-old updates', async () => {
    await seedBoth("Older", Date.now() - 10 * 60 * 1000);
    render(<DeckList />);
    expect(await screen.findByText(/10 min ago/)).toBeInTheDocument();
  });

  it('shows "X hours ago" for hours-old updates', async () => {
    await seedBoth("Older", Date.now() - 3 * 60 * 60 * 1000);
    render(<DeckList />);
    expect(await screen.findByText(/3 hours ago/)).toBeInTheDocument();
  });

  it("shows a locale date for updates older than a day", async () => {
    const updatedAt = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await seedBoth("Ancient", updatedAt);
    render(<DeckList />);
    const expected = new Date(updatedAt).toLocaleDateString();
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });
});

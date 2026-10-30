import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, MapPin, Search, X } from "lucide-react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/library/SiteHeader";
import ThreeLibrary from "@/components/library/ThreeLibrary";
import { BookArtwork } from "@/components/library/BookCard";
import { trpc } from "@/lib/trpc";
import type { LibraryBook } from "@/lib/libraryTypes";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LibraryBook | null>(null);
  const [focusBookId, setFocusBookId] = useState<number | undefined>();
  const [notice, setNotice] = useState("");
  const booksQuery = trpc.library.books.useQuery(undefined, { staleTime: 20_000 });
  const user = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const borrow = trpc.library.borrow.useMutation({ onSuccess: async ({ dueAt }) => { setNotice(`Loan confirmed. Due ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(dueAt)}.`); await Promise.all([utils.library.books.invalidate(), utils.library.myLoans.invalidate()]); }, onError: (error) => setNotice(error.message) });
  const books = booksQuery.data ?? [];
  const matched = useMemo(() => books.filter((book) => !search.trim() || `${book.title} ${book.author} ${book.callNumber}`.toLowerCase().includes(search.trim().toLowerCase())), [books, search]);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("book") ?? localStorage.getItem("shelfwalk:focus-book");
    const id = raw ? Number(raw) : undefined;
    if (id && Number.isFinite(id)) {
      setFocusBookId(id);
      const target = books.find((book) => book.id === id);
      if (target) setSelected(target);
      localStorage.removeItem("shelfwalk:focus-book");
    }
  }, [books]);
  const handleSelect = (book: LibraryBook) => { setSelected(book); setNotice(""); };
  const openLocation = () => { if (selected) { setFocusBookId(selected.id); setNotice(`Shelf ${selected.shelf} · bay ${selected.shelfSlot + 1}`); } };
  const handleBorrow = () => {
    if (!selected) return;
    if (!user.data) { setNotice("Sign in as the demo reader from the header to borrow this book."); return; }
    setNotice(""); borrow.mutate({ bookId: selected.id });
  };
  return <div className="library-view">
    <SiteHeader />
    <ThreeLibrary books={books} focusBookId={focusBookId} onSelect={handleSelect} />
    <div className="scene-info"><span className="eyebrow">THE LEARNING COMMONS · FLOOR 01</span><h2>Room to think.</h2><p>Move through the stacks and study tables. Face a labeled spine and click to inspect it.</p><div className="scene-count"><span>{booksQuery.isLoading ? "LOADING BOOKS" : `${books.length} TITLES IN THE ROOM`}</span><Link href="/browse-books">BROWSE BOOKS <ArrowRight size={12} /></Link></div></div>
    <div className="scene-right-tools"><Link className="scene-tool" href="/browse-books"><Search size={14} />Browse books</Link><Link className="scene-tool" href="/loans"><BookOpen size={14} />My loans</Link></div>
    <div className="scene-prompt"><span className="keycap">W</span><span className="keycap">A</span><span className="keycap">S</span><span className="keycap">D</span><span>walk</span><span>·</span><span>click to look / select a book</span></div>
    {selected && <aside className="scene-panel" aria-label="Selected book details">
      <button type="button" className="scene-dismiss" onClick={() => { setSelected(null); setNotice(""); }} aria-label="Close book details"><X size={19} /></button>
      <div className="scene-book-top"><BookArtwork book={selected} compact /><div><span className="eyebrow">SHELF {selected.shelf} · {selected.category.toUpperCase()}</span><h2>{selected.title}</h2><p className="panel-author">{selected.author}</p><span className={`availability ${selected.status}`}>{selected.status === "available" ? "Available to borrow" : "Currently lent"}</span></div></div>
      <p className="description">{selected.description}</p>
      <div className="scene-panel-meta"><span><small>CALL NUMBER</small>{selected.callNumber}</span><span><small>LOCATION</small>Stack {selected.shelf} · bay {selected.shelfSlot + 1}</span></div>
      <div className="panel-actions"><button className="button button-primary button-small" type="button" onClick={openLocation}><MapPin size={14} />Show on shelf</button><button className="button button-small" type="button" disabled={selected.status !== "available" || borrow.isPending} onClick={handleBorrow}>{selected.status === "available" ? "Borrow for 1 week" : "Currently lent"}</button></div>
      {notice && <div className="notice" role="status">{notice}</div>}
      {!user.data && <p className="login-hint">Demo reader: <strong>reader / Reader2026!</strong> — sign in from the top-right menu to borrow.</p>}
    </aside>}
    {notice && !selected && <div className="scene-location-toast" role="status"><MapPin size={14} />{notice}</div>}
    {booksQuery.error && <div className="scene-location-toast" role="alert">{booksQuery.error.message} — open Browse books to retry.</div>}
  </div>;
}

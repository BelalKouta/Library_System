import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PageFrame } from "@/components/library/SiteHeader";
import { BookCard } from "@/components/library/BookCard";
import { BookDetailModal } from "@/components/library/BookDetailModal";
import { trpc } from "@/lib/trpc";
import { getBrowseBooksReturnPath } from "@/lib/navigation";
import type { LibraryBook } from "@/lib/libraryTypes";

export default function BrowseBooksPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<LibraryBook | null>(null);
  const [notice, setNotice] = useState("");
  const utils = trpc.useUtils();
  const books = trpc.library.books.useQuery(search.trim() ? { search: search.trim() } : undefined, { staleTime: 15_000 });
  const user = trpc.auth.me.useQuery();
  const loans = trpc.library.myLoans.useQuery(undefined, { enabled: user.data?.role === "user" });
  const borrow = trpc.library.borrow.useMutation({
    onSuccess: async ({ dueAt }) => { setNotice(`Borrow request sent to the librarian. You will have one week from approval.`); await Promise.all([utils.library.books.invalidate(), utils.library.myLoans.invalidate()]); },
    onError: (error) => setNotice(error.message),
  });
  const requestedBookIds = useMemo(() => new Set((loans.data ?? []).filter((loan) => loan.status === "pending").map((loan) => loan.bookId)), [loans.data]);
  const filtered = useMemo(() => (books.data ?? []).filter((book) => filter === "all" || book.status === filter), [books.data, filter]);
  const handleBorrow = (book: LibraryBook) => {
    setNotice("");
    if (!user.data) { setNotice("Sign in as a student from the top right to request this title."); return; }
    borrow.mutate({ bookId: book.id });
  };
  return <PageFrame className="catalog-page browse-books-page">
    <main className="page-content">
      <a href="/" className="back-link" onClick={(event) => { event.preventDefault(); navigate(getBrowseBooksReturnPath()); }}>← &nbsp;Back</a>
      <div className="page-heading" style={{ marginTop: 24 }}>
        <div><span className="kicker-line">THE UNIVERSITY COLLECTION</span><h1>Browse books.</h1><p>Search by title, author, subject, or call number. Find availability, inspect details, and locate every title on its shelf in the 3D library.</p></div>
        <div className="page-heading-side"><Link className="button" href="/library"><BookOpen size={15} />Enter the 3D library</Link></div>
      </div>
      <div className="catalog-toolbar">
        <label className="catalog-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles, authors, subjects…" aria-label="Search books" /><span className="mono">⌕</span></label>
        <div className="filter-select"><SlidersHorizontal size={14} /><label htmlFor="availability-filter">Availability</label><select id="availability-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All books</option><option value="available">Available</option><option value="lent">On loan</option></select></div>
        <span className="catalog-count">{books.isLoading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "title" : "titles"}`}</span>
      </div>
      {notice && <div className="notice" role="status">{notice}</div>}
      {books.error && <div className="notice error-notice">{books.error.message} <button type="button" onClick={() => books.refetch()}>Try again</button></div>}
      {books.isLoading ? <div className="loading-block">Loading books…</div> : filtered.length ? <div className="catalog-grid">{filtered.map((book) => <BookCard key={book.id} book={book} onSelect={setSelected} onBorrow={handleBorrow} isBorrowing={borrow.isPending} requested={requestedBookIds.has(book.id)} canBorrow={user.data?.role !== "admin"} />)}</div> : <div className="empty-state"><BookOpen size={24} /><h3>No titles found</h3><p>Try a broader title, author, or subject search.</p></div>}
      <footer className="page-footer"><span>SHELFWALK · UNIVERSITY LIBRARY</span><span>ONE-WEEK LOANS · EXTENSION BY REQUEST</span></footer>
    </main>
    {selected && <BookDetailModal book={selected} onClose={() => setSelected(null)} onBorrow={handleBorrow} isBorrowing={borrow.isPending} requested={requestedBookIds.has(selected.id)} canBorrow={user.data?.role !== "admin"} />}
  </PageFrame>;
}

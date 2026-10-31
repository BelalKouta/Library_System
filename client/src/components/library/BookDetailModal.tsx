import { useEffect } from "react";
import { MapPin, X } from "lucide-react";
import { Link } from "wouter";
import type { LibraryBook } from "@/lib/libraryTypes";
import { BookArtwork } from "./BookCard";

export function BookDetailModal({ book, onClose, onBorrow, isBorrowing = false, requested = false, canBorrow = true }: { book: LibraryBook; onClose: () => void; onBorrow?: (book: LibraryBook) => void; isBorrowing?: boolean; requested?: boolean; canBorrow?: boolean }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="book-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button type="button" className="detail-close" onClick={onClose} aria-label="Close book details"><X size={20} /></button>
      <div className="book-detail-layout">
        <BookArtwork book={book} />
        <div className="book-detail-copy">
          <span className="eyebrow">{book.category.toUpperCase()} · SHELF {book.shelf}</span>
          <h2 id="detail-title">{book.title}</h2>
          <p className="book-byline">{book.author}</p>
          <p className="description">{book.description || "A title from the Shelfwalk university collection."}</p>
          <div className="detail-meta">
            <span><small>CALL NUMBER</small>{book.callNumber}</span>
            <span><small>INVENTORY</small>{book.status === "available" ? `Available now · ${book.totalCopies} copies total` : "All copies currently lent"}</span>
            {book.isbn && <span><small>ISBN</small>{book.isbn}</span>}
            <span><small>SHELF LOCATION</small>Stack {book.shelf} · bay {book.shelfSlot + 1}</span>
          </div>
          <div className="detail-actions">
            <Link className="button button-primary" href={`/library?book=${book.id}`} onClick={() => localStorage.setItem("shelfwalk:focus-book", String(book.id))}><MapPin size={15} />Show it in the library</Link>
            {onBorrow && canBorrow && <button type="button" className="button" onClick={() => onBorrow(book)} disabled={book.status !== "available" || isBorrowing || requested}>{isBorrowing ? "Sending…" : requested ? "Requested" : book.status === "available" ? "Request for one week" : "Currently lent"}</button>}
          </div>
        </div>
      </div>
    </section>
  </div>;
}

import { ArrowUpRight, MapPin, BookOpen, Clock3 } from "lucide-react";
import type { CSSProperties } from "react";
import type { LibraryBook } from "@/lib/libraryTypes";
import { Link } from "wouter";

export function BookArtwork({ book, compact = false }: { book: Pick<LibraryBook, "title" | "author" | "coverColor" | "accentColor" | "callNumber">; compact?: boolean }) {
  return (
    <div className={`book-art ${compact ? "book-art-compact" : ""}`} style={{ "--cover": book.coverColor, "--accent": book.accentColor } as CSSProperties} aria-label={`3D cover preview of ${book.title}`}>
      <div className="book-pages" />
      <div className="book-cover-front">
        <span className="book-cover-mark">S / L</span>
        <span className="book-cover-title">{book.title}</span>
        <span className="book-cover-rule" />
        <span className="book-cover-author">{book.author}</span>
        <span className="book-cover-number">{book.callNumber}</span>
      </div>
      <div className="book-cover-spine"><span>{book.title}</span></div>
    </div>
  );
}

export function BookCard({ book, onSelect, onBorrow, isBorrowing = false }: { book: LibraryBook; onSelect?: (book: LibraryBook) => void; onBorrow?: (book: LibraryBook) => void; isBorrowing?: boolean }) {
  const showDetails = () => onSelect?.(book);
  return (
    <article className="catalog-card">
      <button className="catalog-card-art" type="button" onClick={showDetails} aria-label={`Inspect ${book.title}`}>
        <BookArtwork book={book} compact />
      </button>
      <div className="catalog-card-copy">
        <div className="catalog-card-kicker"><span>{book.category}</span><span className={`availability ${book.status}`}>{book.status === "available" ? "Available" : "On loan"}</span></div>
        <h3>{book.title}</h3>
        <p className="book-byline">{book.author}</p>
        <p className="book-callno">{book.callNumber} <span>·</span> Shelf {book.shelf}</p>
        <div className="catalog-card-actions">
          {onBorrow && <button className="button button-primary button-small" type="button" onClick={() => onBorrow(book)} disabled={book.status !== "available" || isBorrowing}><BookOpen size={14} />{isBorrowing ? "Checking…" : book.status === "available" ? "Borrow for 1 week" : "Currently lent"}</button>}
          {onSelect && <button className="button button-quiet button-small" type="button" onClick={showDetails}>Details <ArrowUpRight size={14} /></button>}
          <Link className="button button-link button-small" href={`/library?book=${book.id}`} onClick={() => localStorage.setItem("shelfwalk:focus-book", String(book.id))}><MapPin size={14} />Show it in the library</Link>
        </div>
      </div>
      <span className="catalog-card-corner"><Clock3 size={13} /> 7 day loan</span>
    </article>
  );
}

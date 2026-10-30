import { ArrowDownRight, ArrowRight, BookOpen, Clock3, MapPin } from "lucide-react";
import { Link } from "wouter";
import { PageFrame } from "@/components/library/SiteHeader";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const books = trpc.library.books.useQuery(undefined, { staleTime: 30_000 });
  const bookCount = books.data?.length ?? 18;
  const available = books.data?.filter((book) => book.status === "available").length ?? bookCount;
  return <PageFrame className="landing-page">
    <main>
      <section className="landing-hero" aria-label="University library entrance">
        <div className="hero-image" />
        <div className="hero-scrim" />
        <div className="hero-index"><span className="status-dot" /> OPEN FOR STUDY <span>·</span> MON–SAT, 08:00–22:00</div>
        <div className="hero-center">
          <span className="hero-overline">A UNIVERSITY LIBRARY, REIMAGINED</span>
          <h1>Room to think.<br /><em>Space to discover.</em></h1>
          <p>Step into the stacks, find a book, and take your time.</p>
          <Link href="/library" className="enter-library"><span className="enter-icon"><ArrowRight size={21} /></span><span><strong>Enter the Library</strong><small>WALK THE STACKS · WASD OR TOUCH</small></span><ArrowDownRight className="enter-corner" size={19} /></Link>
        </div>
        <div className="hero-bottom"><span>THE LEARNING COMMONS</span><span>40° 43′ 12.0″ N&nbsp; / &nbsp;73° 59′ 48.0″ W</span><span>SCROLL TO EXPLORE</span></div>
      </section>
      <section className="landing-lower">
        <div className="landing-note"><span className="eyebrow">THE COLLECTION</span><h2>More than a catalogue.<br /><em>A place to wander.</em></h2><p>Browse a growing collection, explore it at your own pace, and see exactly where a title lives in the room.</p></div>
        <div className="landing-actions">
          <Link href="/browse-books" className="feature-link"><span className="feature-icon"><BookOpen size={18} /></span><span><small>SEARCH THE COLLECTION</small><strong>Browse books</strong></span><ArrowRight size={16} /></Link>
          <Link href="/loans" className="feature-link"><span className="feature-icon"><Clock3 size={18} /></span><span><small>YOUR READING DESK</small><strong>Manage my loans</strong></span><ArrowRight size={16} /></Link>
        </div>
        <div className="collection-stat"><span>{String(bookCount).padStart(2,"0")}</span><small>BOOKS IN THIS<br />DEMO COLLECTION</small><i /><span>{String(available).padStart(2,"0")}</span><small>READY TO<br />TAKE HOME</small></div>
      </section>
    </main>
  </PageFrame>;
}

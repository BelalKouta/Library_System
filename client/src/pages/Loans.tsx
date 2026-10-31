import { useState } from "react";
import { BookOpen, CalendarDays, Clock3, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { PageFrame } from "@/components/library/SiteHeader";
import { trpc } from "@/lib/trpc";

const formatDate = (value: Date | string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));

export default function LoansPage() {
  const utils = trpc.useUtils();
  const user = trpc.auth.me.useQuery();
  const loans = trpc.library.myLoans.useQuery(undefined, { enabled: Boolean(user.data), retry: false });
  const [notice, setNotice] = useState("");
  const extension = trpc.library.requestExtension.useMutation({ onSuccess: async () => { setNotice("Extension request sent to the librarian."); await Promise.all([utils.library.myLoans.invalidate(), utils.library.admin.requests.invalidate()]); }, onError: (error) => setNotice(error.message) });
  const returnBook = trpc.library.returnBook.useMutation({ onSuccess: async () => { setNotice("Return reported. The librarian will confirm the book is physically back."); await Promise.all([utils.library.myLoans.invalidate(), utils.library.books.invalidate()]); }, onError: (error) => setNotice(error.message) });
  const pending = loans.data?.filter((loan) => loan.status === "pending") ?? [];
  const active = loans.data?.filter((loan) => loan.status === "active") ?? []; const returnPending = loans.data?.filter(loan => loan.status === "return_pending") ?? [];
  const returned = loans.data?.filter((loan) => loan.status === "returned") ?? [];
  return <PageFrame>
    <main className="page-content">
      <Link href="/" className="back-link">← &nbsp;The reading room</Link>
      <div className="page-heading" style={{ marginTop: 24 }}><div><span className="kicker-line">YOUR READING DESK</span><h1>My loans.</h1><p>Every checkout runs for one week. Ask once for another week; the librarian will approve or decline it.</p></div><Link className="button" href="/browse-books">Find another book</Link></div>
      {notice && <div className="notice" role="status">{notice}</div>}
      {!user.data ? <div className="empty-state"><Clock3 size={23} /><h3>Sign in to view your loans</h3><p>Sign in with your EUI student ID and password from the top-right menu.</p></div> : loans.isLoading ? <div className="loading-block">Loading your loan history…</div> : <>
        <div className="section-title"><span className="eyebrow">CURRENTLY ON YOUR DESK</span><strong>{active.length.toString().padStart(2,"0")}</strong></div>
        {returnPending.map(item => <article className="loan-row" key={`return-${item.id}`}><div><span className="eyebrow">RETURN AWAITING CONFIRMATION</span><h3>{item.book.title}</h3><p>{item.book.author}</p></div><span className="status-tag pending">Librarian confirming</span></article>)}{pending.length > 0 && <><div className="section-title"><span className="eyebrow">WAITING FOR LIBRARIAN APPROVAL</span><strong>{pending.length.toString().padStart(2,"0")}</strong></div><div className="loans-list">{pending.map(item => <article className="loan-row" key={item.id}><div><span className="eyebrow">REQUEST PENDING · {item.book.callNumber}</span><h3>{item.book.title}</h3><p>{item.book.author}</p></div><span className="status-tag pending">Awaiting approval</span></article>)}</div></>}{active.length ? <div className="loans-list">{active.map((item) => {
          const dueAt = new Date(item.dueAt);
          const extensionStatus = item.extension?.status;
          return <article className="loan-row" key={item.id}>
            <div><span className="eyebrow">{item.book.category} · {item.book.callNumber}</span><h3>{item.book.title}</h3><p>{item.book.author}</p></div>
            <div className="loan-due"><span>CHECKED OUT {formatDate(item.borrowedAt)}</span><strong>Due {formatDate(dueAt)}</strong>{extensionStatus && <span className={`status-tag ${extensionStatus}`}>Extension {extensionStatus}</span>}</div>
            <div className="loan-actions">{!extensionStatus && <button className="button button-small" type="button" onClick={() => extension.mutate({ loanId: item.id })} disabled={extension.isPending}><CalendarDays size={14} />Request +1 week</button>}<button className="button button-quiet button-small" type="button" onClick={() => returnBook.mutate({ loanId: item.id })} disabled={returnBook.isPending}><RotateCcw size={14} />Return book</button></div>
          </article>;
        })} </div> : <div className="empty-state"><BookOpen size={23} /><h3>No active loans</h3><p>Choose a title to request for a one-week loan. The librarian will approve it first.</p><Link className="button button-primary" href="/browse-books">Browse books</Link></div>}
        {returned.length > 0 && <><div className="section-title section-title-returned"><span className="eyebrow">RECENTLY RETURNED</span><strong>{returned.length.toString().padStart(2,"0")}</strong></div><div className="loans-list">{returned.slice(0,8).map((item) => <article className="loan-row returned-row" key={item.id}><div><span className="eyebrow">{item.book.callNumber}</span><h3>{item.book.title}</h3><p>{item.book.author}</p></div><div className="loan-due"><span>RETURNED {item.returnedAt ? formatDate(item.returnedAt) : "—"}</span><strong>Due {formatDate(item.dueAt)}</strong></div><span className="status-tag approved">Returned</span></article>)}</div></>}
      </>}
      <footer className="page-footer"><span>SHELFWALK · UNIVERSITY LIBRARY</span><span>ONE EXTENSION REQUEST PER LOAN</span></footer>
    </main>
  </PageFrame>;
}


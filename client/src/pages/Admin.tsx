import { useMemo, useState } from "react";
import { Check, ClipboardList, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import { PageFrame } from "@/components/library/SiteHeader";
import { trpc } from "@/lib/trpc";

const initialForm = { title: "", author: "", category: "General", isbn: "", description: "", callNumber: "", shelf: "A", shelfRow: "0", shelfSlot: "5", coverColor: "#31546b", accentColor: "#ddc99a" };
const dateLabel = (value: Date | string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));

export default function AdminPage() {
  const [tab, setTab] = useState<"inventory" | "requests">("inventory");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [notice, setNotice] = useState("");
  const utils = trpc.useUtils();
  const user = trpc.auth.me.useQuery();
  const books = trpc.library.books.useQuery(undefined, { enabled: user.data?.role === "admin" });
  const requests = trpc.library.admin.requests.useQuery(undefined, { enabled: user.data?.role === "admin" });
  const addBook = trpc.library.admin.addBook.useMutation({ onSuccess: async () => { setNotice("Book added to the catalogue and assigned its shelf position."); setForm(initialForm); setFormOpen(false); await utils.library.books.invalidate(); }, onError: (error) => setNotice(error.message) });
  const removeBook = trpc.library.admin.removeBook.useMutation({ onSuccess: async () => { setNotice("Book removed from the inventory."); await utils.library.books.invalidate(); }, onError: (error) => setNotice(error.message) });
  const setStatus = trpc.library.admin.setStatus.useMutation({ onSuccess: async () => { setNotice("Inventory status updated."); await utils.library.books.invalidate(); }, onError: (error) => setNotice(error.message) });
  const decide = trpc.library.admin.decideExtension.useMutation({ onSuccess: async () => { setNotice("Extension request decision saved."); await utils.library.admin.requests.invalidate(); await utils.library.myLoans.invalidate(); }, onError: (error) => setNotice(error.message) });
  const availableCount = useMemo(() => books.data?.filter((book) => book.status === "available").length ?? 0, [books.data]);
  const lentCount = (books.data?.length ?? 0) - availableCount;
  const pendingCount = requests.data?.filter((request) => request.status === "pending").length ?? 0;
  const field = (name: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [name]: value }));

  return <PageFrame>
    <main className="page-content">
      <Link href="/" className="back-link">← &nbsp;The reading room</Link>
      <div className="page-heading" style={{ marginTop: 24 }}><div><span className="kicker-line">STAFF ONLY · DEMO WORKSPACE</span><h1>Librarian desk.</h1><p>Maintain the stack inventory, track what is on loan, and decide requests for one additional week.</p></div><div className="page-heading-side"><Link className="button" href="/browse-books">View Browse books</Link></div></div>
      {notice && <div className="notice" role="status">{notice}</div>}
      {!user.data ? <div className="empty-state"><ShieldAlert size={24} /><h3>Librarian access required</h3><p>Use Demo sign in at the top right and choose the demo librarian account: <span className="mono">admin / Shelfwalk2026!</span></p><p>These credentials are for this project demo only.</p></div> : user.data.role !== "admin" ? <div className="empty-state"><ShieldAlert size={24} /><h3>This desk is for librarians</h3><p>The current account is a demo reader. Sign out, then choose the librarian demo account.</p></div> : <>
        <div className="admin-stats"><div className="admin-stat"><small>TOTAL BOOKS</small><strong>{String(books.data?.length ?? 0).padStart(2,"0")}</strong></div><div className="admin-stat"><small>AVAILABLE</small><strong>{String(availableCount).padStart(2,"0")}</strong></div><div className="admin-stat"><small>EXTENSIONS TO REVIEW</small><strong>{String(pendingCount).padStart(2,"0")}</strong></div></div>
        <div className="admin-tabs"><button className={tab === "inventory" ? "admin-tab active" : "admin-tab"} type="button" onClick={() => setTab("inventory")}>Inventory <span>{books.data?.length ?? "—"}</span></button><button className={tab === "requests" ? "admin-tab active" : "admin-tab"} type="button" onClick={() => setTab("requests")}>Extension requests <span>{pendingCount}</span></button></div>
        {tab === "inventory" ? <>
          <div className="inventory-tools"><div className="eyebrow">{lentCount} TITLES CURRENTLY MARKED LENT</div><button className="button button-primary button-small" type="button" onClick={() => setFormOpen((value) => !value)}><Plus size={14} />Add a book</button></div>
          {formOpen && <form className="book-form" onSubmit={(event) => { event.preventDefault(); addBook.mutate({ ...form, shelfRow: Number(form.shelfRow), shelfSlot: Number(form.shelfSlot), isbn: form.isbn || null, description: form.description || null }); }}>
            <label>Title<input required maxLength={240} value={form.title} onChange={(event) => field("title", event.target.value)} /></label><label>Author<input required maxLength={180} value={form.author} onChange={(event) => field("author", event.target.value)} /></label>
            <label>Category<input required maxLength={80} value={form.category} onChange={(event) => field("category", event.target.value)} /></label><label>Call number<input required value={form.callNumber} onChange={(event) => field("callNumber", event.target.value)} /></label>
            <label>ISBN<input value={form.isbn} onChange={(event) => field("isbn", event.target.value)} /></label><label>Shelf label<input required maxLength={24} value={form.shelf} onChange={(event) => field("shelf", event.target.value)} /></label>
            <label>Shelf row (0–5)<select value={form.shelfRow} onChange={(event) => field("shelfRow", event.target.value)}>{[0,1,2,3,4,5].map((row) => <option key={row} value={row}>{row}</option>)}</select></label><label>Shelf bay (0–15)<select value={form.shelfSlot} onChange={(event) => field("shelfSlot", event.target.value)}>{Array.from({length:16},(_,slot)=><option key={slot} value={slot}>{slot}</option>)}</select></label>
            <label>Cover color<input type="color" value={form.coverColor} onChange={(event) => field("coverColor", event.target.value)} /></label><label>Accent color<input type="color" value={form.accentColor} onChange={(event) => field("accentColor", event.target.value)} /></label>
            <textarea placeholder="Short description" value={form.description} onChange={(event) => field("description", event.target.value)} />
            <div className="form-actions"><button type="button" className="button button-quiet button-small" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="button button-primary button-small" disabled={addBook.isPending}>{addBook.isPending ? "Saving…" : "Add to inventory"}</button></div>
          </form>}
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>BOOK</th><th>CALL NO.</th><th>SHELF</th><th>STATUS</th><th>INVENTORY ACTIONS</th></tr></thead><tbody>{books.data?.map((book) => <tr key={book.id}><td><strong>{book.title}</strong><small>{book.author}</small></td><td>{book.callNumber}</td><td>Stack {book.shelf} · bay {book.shelfSlot + 1}</td><td><span className={`availability ${book.status}`}>{book.status === "available" ? "Available" : "Lent"}</span></td><td><div className="table-actions"><button className="button button-small" type="button" onClick={() => setStatus.mutate({ id: book.id, status: book.status === "available" ? "lent" : "available" })}>{book.status === "available" ? "Mark lent" : "Mark available"}</button><button className="button button-quiet button-small" type="button" aria-label={`Remove ${book.title}`} onClick={() => { if (window.confirm(`Remove “${book.title}” from the inventory?`)) removeBook.mutate({ id: book.id }); }}><Trash2 size={14} />Remove</button></div></td></tr>)}</tbody></table>{books.isLoading && <div className="loading-block">Loading book inventory…</div>}</div>
        </> : <div className="admin-list">{requests.isLoading ? <div className="loading-block">Loading extension requests…</div> : requests.data?.length ? requests.data.map((request) => <article className="admin-request" key={request.id}><div><span className="eyebrow">{request.status.toUpperCase()} · {request.book.callNumber}</span><h3>{request.book.title}</h3><p>{request.readerName} · requested {dateLabel(request.requestedAt)}</p></div><div className="loan-due"><span>CURRENT DUE DATE</span><strong>{dateLabel(request.loan.dueAt)}</strong><small>Approve to add seven days</small></div><div className="admin-request-actions">{request.status === "pending" ? <><button className="button button-primary button-small" type="button" onClick={() => decide.mutate({ extensionId: request.id, decision: "approved" })} disabled={decide.isPending}><Check size={14} />Approve</button><button className="button button-quiet button-small" type="button" onClick={() => decide.mutate({ extensionId: request.id, decision: "declined" })} disabled={decide.isPending}><X size={14} />Decline</button></> : <span className={`status-tag ${request.status}`}>{request.status}</span>}</div></article>) : <div className="empty-state"><ClipboardList size={24} /><h3>No extension requests</h3><p>Reader requests will appear here for librarian review.</p></div>}</div>}
      </>}
      <footer className="page-footer"><span>SHELFWALK · STAFF DEMO</span><span>{user.data?.name ?? "SIGN IN TO CONTINUE"}</span></footer>
    </main>
  </PageFrame>;
}

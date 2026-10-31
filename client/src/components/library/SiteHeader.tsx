import { useState } from "react";
import { BookOpen, ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

function formatStudentId(value: string) {
  const compact = value.replace(/\s/g, "").replace(/[^0-9-]/g, "");
  if (compact.length === 8 && !compact.includes("-")) return `${compact.slice(0, 2)}-${compact.slice(2)}`;
  return compact.slice(0, 9);
}

export function SiteHeader({ light = false }: { light?: boolean }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { setMessage("Signed in."); await utils.auth.me.invalidate(); setOpen(false); }, onError: e => setMessage(e.message) });
  const signup = trpc.auth.signup.useMutation({ onSuccess: async () => { setMessage("Student account created."); await utils.auth.me.invalidate(); setOpen(false); }, onError: e => setMessage(e.message) });
  const logout = trpc.auth.logout.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setMessage("Signed out."); } });
  const isLibrarian = me.data?.role === "admin";
  const links = [["Explore", "/library"] as const, ["Browse books", "/browse-books"] as const, ...(me.data && !isLibrarian ? [["My loans", "/loans"] as const] : []), ...(isLibrarian ? [["Librarian", "/admin"] as const] : [])];
  const submit = (event: React.FormEvent) => { event.preventDefault(); setMessage(""); if (mode === "login") login.mutate({ identifier: identifier.trim(), password }); else signup.mutate({ name, studentId: identifier, password }); };

  return <header className={`site-header ${light ? "site-header-light" : ""}`}>
    <Link href="/" className="brand-lockup" aria-label="Shelfwalk home"><span className="brand-symbol"><BookOpen size={19} strokeWidth={1.6} /><i /></span><span><strong>Shelfwalk</strong><small>UNIVERSITY LIBRARY</small></span></Link>
    <nav className="header-links" aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href} className={location === href ? "nav-link current" : "nav-link"}>{label}</Link>)}{location.startsWith("/library") && <Link href="/" className="nav-link">Exit Library</Link>}</nav>
    <div className="header-account">
      {me.data ? <><span className="role-pill"><ShieldCheck size={13} />{isLibrarian ? "Librarian" : "Student"}</span><button className="avatar-button" type="button" onClick={() => logout.mutate()} aria-label="Sign out"><span>{(me.data.name ?? "S").slice(0, 1)}</span><LogOut size={13} /></button></> : <button className="header-signin" type="button" onClick={() => { setMessage(""); setOpen(v => !v); }}><span>Sign in</span><ChevronDown size={14} /></button>}
      {open && !me.data && <div className="login-popover" role="dialog" aria-label="Account access">
        <div className="login-popover-head"><div><span className="eyebrow">EUI LIBRARY ACCESS</span><h3>{mode === "login" ? "Sign in" : "Create account"}</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
        <p>{mode === "login" ? "Students use the ID format 12-345678. Librarians use their fixed staff username." : "Create your student account with your EUI ID. Your university email is generated automatically."}</p>
        <form onSubmit={submit}>
          {mode === "signup" && <label>Full name<input required placeholder="e.g. Sara Ahmed" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>}
          <label>{mode === "login" ? "Student ID or librarian username" : "Student ID number"}<input required type="text" inputMode="text" placeholder={mode === "login" ? "12-345678 or librarian username" : "12-345678"} pattern={mode === "signup" ? "[0-9]{2}-?[0-9]{6}" : undefined} title="Enter your ID as 12-345678" value={identifier} onChange={e => setIdentifier(mode === "signup" ? formatStudentId(e.target.value) : e.target.value)} autoComplete="username" /></label>
          {mode === "signup" && <small className="login-hint">Email: {identifier || "12-345678"}@students.eui.edu.eg</small>}
          <label>Password<input required minLength={mode === "signup" ? 8 : 1} placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          <button className="button button-primary button-small" type="submit" disabled={login.isPending || signup.isPending}>{mode === "login" ? "Sign in" : "Create student account"}</button>
        </form>
        {message && <div className="login-message" role="status">{message}</div>}
        <button className="button button-link button-small" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Create a student account" : "Already have an account? Sign in"}</button>
      </div>}
    </div>
  </header>;
}
export function PageFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`page-frame ${className}`}><SiteHeader />{children}</div>; }

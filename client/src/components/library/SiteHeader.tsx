import { useState } from "react";
import { BookOpen, ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export function SiteHeader({ light = false }: { light?: boolean }) {
  const [location] = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Shelfwalk2026!");
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const login = trpc.library.demoLogin.useMutation({
    onSuccess: async () => { setMessage("Signed in to the demo library."); await utils.auth.me.invalidate(); setLoginOpen(false); },
    onError: (error) => setMessage(error.message),
  });
  const logout = trpc.auth.logout.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setMessage("Signed out."); } });
  const signInAs = (user: "admin" | "reader") => {
    const pass = user === "admin" ? "Shelfwalk2026!" : "Reader2026!";
    setUsername(user); setPassword(pass); setMessage("");
    login.mutate({ username: user, password: pass });
  };
  const links = [
    ["Explore", "/library"],
    ["Browse books", "/browse-books"],
    ["My loans", "/loans"],
    ["Librarian", "/admin"],
  ] as const;
  return (
    <header className={`site-header ${light ? "site-header-light" : ""}`}>
      <Link href="/" className="brand-lockup" aria-label="Shelfwalk home">
        <span className="brand-symbol"><BookOpen size={19} strokeWidth={1.6} /><i /></span>
        <span><strong>Shelfwalk</strong><small>UNIVERSITY LIBRARY</small></span>
      </Link>
      <nav className="header-links" aria-label="Main navigation">
        {links.map(([label, href]) => <Link key={href} href={href} className={location === href ? "nav-link current" : "nav-link"}>{label}</Link>)}
        {location.startsWith("/library") && <Link href="/" className="nav-link exit-library-link" aria-label="Exit the 3D library and return home">Exit Library</Link>}
      </nav>
      <div className="header-account">
        {me.data ? <>
          <span className="role-pill"><ShieldCheck size={13} />{me.data.role === "admin" ? "Librarian" : "Reader"}</span>
          <button className="avatar-button" type="button" onClick={() => logout.mutate()} aria-label="Sign out" title={`Sign out ${me.data.name ?? ""}`}><span>{(me.data.name ?? "S").slice(0,1)}</span><LogOut size={13} /></button>
        </> : <button className="header-signin" type="button" onClick={() => { setMessage(""); setLoginOpen((v) => !v); }}><span>Demo sign in</span><ChevronDown size={14} /></button>}
        {loginOpen && !me.data && <div className="login-popover" role="dialog" aria-label="Demo library sign in">
          <div className="login-popover-head"><div><span className="eyebrow">DEMO ACCESS</span><h3>Choose a desk</h3></div><button type="button" onClick={() => setLoginOpen(false)} aria-label="Close sign in">×</button></div>
          <p>These project-only demo accounts do not represent real students. Do not reuse these passwords.</p>
          <button className="demo-account" type="button" onClick={() => signInAs("admin")}><span><strong>Librarian</strong><small>admin / Shelfwalk2026!</small></span><ShieldCheck size={16} /></button>
          <button className="demo-account" type="button" onClick={() => signInAs("reader")}><span><strong>Reader</strong><small>reader / Reader2026!</small></span><BookOpen size={16} /></button>
          <details className="manual-login"><summary>Enter demo credentials <ChevronDown size={13} /></summary>
            <form onSubmit={(event) => { event.preventDefault(); setMessage(""); login.mutate({ username, password }); }}>
              <label>Username<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
              <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
              <button className="button button-primary button-small" type="submit" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}</button>
            </form>
          </details>
          {message && <div className="login-message" role="status">{message}</div>}
          <div className="demo-warning">Demo accounts only · replace before real-world use</div>
        </div>}
      </div>
    </header>
  );
}

export function PageFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`page-frame ${className}`}><SiteHeader />{children}</div>;
}

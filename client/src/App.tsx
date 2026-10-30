import { lazy, Suspense, useEffect, useRef } from "react";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { clearBrowseBooksReturnPath, getShelfwalkPagePath, rememberBrowseBooksReturnPath } from "@/lib/navigation";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

const LibraryPage = lazy(() => import("./pages/Library"));
const BrowseBooksPage = lazy(() => import("./pages/BrowseBooks"));
const LoansPage = lazy(() => import("./pages/Loans"));
const AdminPage = lazy(() => import("./pages/Admin"));

function Router() {
  const [location] = useLocation();
  const previousLocation = useRef<string | null>(null);
  useEffect(() => {
    const currentPage = getShelfwalkPagePath(location);
    const previousPage = previousLocation.current ? getShelfwalkPagePath(previousLocation.current) : null;
    if (previousLocation.current === null) clearBrowseBooksReturnPath();
    else if (currentPage === "/browse-books" && previousPage) rememberBrowseBooksReturnPath(previousPage);
    previousLocation.current = location;
  }, [location]);

  return <Suspense fallback={<div className="loading-block route-loading">Opening Shelfwalk…</div>}><Switch>
    <Route path="/" component={Home} />
    <Route path="/library" component={LibraryPage} />
    <Route path="/browse-books" component={BrowseBooksPage} />
    <Route path="/loans" component={LoansPage} />
    <Route path="/admin" component={AdminPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><TooltipProvider><Toaster /><Router /></TooltipProvider></ErrorBoundary>;
}

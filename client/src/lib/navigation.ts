const SHELFWALK_PAGE_PATHS = new Set(["/", "/library", "/browse-books", "/loans", "/admin"]);
const BROWSE_BOOKS_RETURN_KEY = "shelfwalk:browse-books-return";

export function getShelfwalkPagePath(value: string): string | null {
  const path = value.split(/[?#]/, 1)[0] || "/";
  return SHELFWALK_PAGE_PATHS.has(path) ? path : null;
}

export function rememberBrowseBooksReturnPath(path: string): void {
  const safePath = getShelfwalkPagePath(path);
  if (!safePath || safePath === "/browse-books") return;
  try {
    window.sessionStorage.setItem(BROWSE_BOOKS_RETURN_KEY, safePath);
  } catch {
    // If session storage is unavailable, Browse books will fall back to home.
  }
}

export function clearBrowseBooksReturnPath(): void {
  try {
    window.sessionStorage.removeItem(BROWSE_BOOKS_RETURN_KEY);
  } catch {
    // If session storage is unavailable, Browse books will fall back to home.
  }
}

export function getBrowseBooksReturnPath(): string {
  try {
    const storedPath = window.sessionStorage.getItem(BROWSE_BOOKS_RETURN_KEY);
    const safePath = storedPath ? getShelfwalkPagePath(storedPath) : null;
    return safePath && safePath !== "/browse-books" ? safePath : "/";
  } catch {
    return "/";
  }
}

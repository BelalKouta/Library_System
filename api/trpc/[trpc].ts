import { handleTrpc } from "../../server/handler.js";

// Vercel Node.js function using Web-standard Request/Response handlers.
export const GET = handleTrpc;
export const POST = handleTrpc;

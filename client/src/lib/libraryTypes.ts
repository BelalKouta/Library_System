import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type LibraryOutputs = inferRouterOutputs<AppRouter>;
export type LibraryBook = LibraryOutputs["library"]["books"][number];
export type LibraryLoan = LibraryOutputs["library"]["myLoans"][number];

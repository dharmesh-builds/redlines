import { redirect } from "next/navigation";
import { libraryAccess } from "../../../lib/library/access";
import { loadLibrary } from "../../../lib/library/library";
import { LibraryView } from "./library-view";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// /app: the signed-in user's library. The proxy already sends signed-out
// visitors (and every visitor when Supabase isn't configured) to /sign-in;
// this check repeats it in case the page is reached another way.
export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const access = await libraryAccess();
  if (access.kind !== "ok") redirect("/sign-in?next=/app");
  const params = await searchParams;
  const list = await loadLibrary(access.repo, access.userId);
  return <LibraryView list={list} deleted={params.deleted === "1"} />;
}

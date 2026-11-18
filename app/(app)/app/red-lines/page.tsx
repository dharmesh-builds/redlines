import { redirect } from "next/navigation";
import { accountAccess } from "../../../../lib/account/access";
import { loadRedLines } from "../../../../lib/red-lines/red-lines";
import { RedLinesView } from "./red-lines-view";

// /app/red-lines: the signed-in user's red lines. The proxy already sends
// signed-out visitors to /sign-in; this check repeats it in case the page is
// reached another way.
export default async function RedLinesPage() {
  const access = await accountAccess();
  if (access.kind !== "ok") redirect("/sign-in?next=/app/red-lines");
  return <RedLinesView list={await loadRedLines(access.redLines, access.userId)} />;
}

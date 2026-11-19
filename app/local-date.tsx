"use client";

import { useEffect, useState } from "react";
import { formatSavedDate } from "../lib/library/library";

// A saved date in the reader's own time zone. The server can't know that zone,
// so the first render shows UTC (matching the server's HTML), and the browser
// swaps in the local date once it runs. Without this, a check made after 18:30
// UTC from India was dated the day before (finding 6).
export function LocalDate({ iso }: { iso: string }) {
  const [text, setText] = useState(() => formatSavedDate(iso));
  useEffect(() => {
    try {
      setText(formatSavedDate(iso, Intl.DateTimeFormat().resolvedOptions().timeZone));
    } catch {
      // Keep the UTC date.
    }
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}

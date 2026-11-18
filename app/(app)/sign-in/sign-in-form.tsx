"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setStatus({ kind: "sending" });

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callback.toString() },
    });

    if (!error) setStatus({ kind: "sent", email: address });
    else if (error.status === 429)
      setStatus({
        kind: "error",
        message: "Too many sign-in emails have gone out in the last hour. Wait a while and try again.",
      });
    else setStatus({ kind: "error", message: "The email didn't send. Check the address and try again." });
  }

  if (status.kind === "sent") {
    return (
      <div className="sent" role="status">
        <h2 className="app-subtitle">Check your email</h2>
        <p>We sent a sign-in link to {status.email}. It works once.</p>
        <button type="button" className="text-button" onClick={() => setStatus({ kind: "idle" })}>
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <form className="sign-in-form" onSubmit={onSubmit}>
      <label htmlFor="email" className="field-label">
        Email address
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        className="text-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {status.kind === "error" ? (
        <p className="form-error" role="alert">
          {status.message}
        </p>
      ) : null}
      <button type="submit" className="cta" disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}

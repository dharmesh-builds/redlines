# ADR 0007: Sign in by email link, no passwords

Status: Accepted, 2026-11-18

## Decision
Users sign in with a one-time link sent to their email (Supabase magic link). There are no passwords in v1.

## Alternatives
- **Email + password.** Familiar, but it means storing passwords and building reset screens, and it still needs confirmation emails.
- **Sign in with Google.** One click, but it needs Google Cloud OAuth setup and excludes users without a Google account.

## Consequences
- **Supabase's built-in mailer sends only a few emails an hour.** That's fine for building and testing. Before real users arrive, a proper email service (custom SMTP) has to be set up, which needs approval.
- **Ticket 01 builds a single-field sign-in page plus the auth callback route.** `/sign-in` and the callback are already public in `lib/auth/protected-paths.ts`.
- **Sign-in copy** ("Check your email", expired-link errors) goes through the humanizer like all user-facing copy.

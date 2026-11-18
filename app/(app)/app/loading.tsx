// Shown while the library or a saved report loads.
export default function LibraryLoading() {
  return (
    <section className="app-panel app-panel-wide">
      <p className="field-note" role="status" aria-live="polite">
        Loading your library&hellip;
      </p>
    </section>
  );
}

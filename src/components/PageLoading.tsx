/**
 * The route shell shown while a dynamic page streams in. Every patient page
 * hits Postgres, so without a loading boundary a tap waits on a full server
 * roundtrip — with one, Next prefetches this shell and the navigation shows
 * it instantly. Deliberately abstract: blocks, not fake content, so nothing
 * looks like real data that then snaps away.
 */
export function PageLoading() {
  return (
    <div className="shell">
      <main className="app">
        <div className="body" aria-busy="true" style={{ paddingTop: 18 }}>
          <div className="skel skelSlip" />
          <div className="skel skelRow" />
          <div className="skel skelRow" />
          <div className="skel skelRow" />
        </div>
      </main>
    </div>
  );
}

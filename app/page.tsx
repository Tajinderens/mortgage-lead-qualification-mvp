const summaryCards = [
  { title: "Lead capture", description: "Manual borrower intake will be added in a later step." },
  { title: "Preliminary DTI", description: "Back-end DTI estimates will be calculated after the scoring module is approved." },
  { title: "Broker review", description: "Recommendations will require broker approval, rejection, or override." },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Phase 1 scaffold</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Mortgage lead qualification dashboard</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          This placeholder dashboard establishes the responsive app shell for Pooja&apos;s fictional demo. Lead entry, scoring logic, storage, and audit workflows have not been built yet.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

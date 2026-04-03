export default function AboutPage() {
  return (
    <div className="mx-auto w-[min(1000px,94vw)] space-y-6 pt-10">
      <section className="glass rounded-2xl p-8">
        <h1 className="section-title">About SmartQueue</h1>
        <p className="mt-5 text-lg text-slate-300">
          SmartQueue is an AI-powered virtual queue optimization platform designed for hospitals,
          banks and government offices. It reduces physical crowding, improves service velocity, and
          gives citizens transparent wait-time visibility.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-xl p-5">
          <h2 className="text-xl font-semibold">Real-World Use</h2>
          <p className="mt-2 text-slate-300">Ideal for high-footfall public service centers across India.</p>
        </div>
        <div className="glass rounded-xl p-5">
          <h2 className="text-xl font-semibold">AI Logic</h2>
          <p className="mt-2 text-slate-300">Queue length + service time + historical peaks = smart prediction.</p>
        </div>
        <div className="glass rounded-xl p-5">
          <h2 className="text-xl font-semibold">Scalable SaaS</h2>
          <p className="mt-2 text-slate-300">Multi-sector architecture with modular APIs and analytics dashboard.</p>
        </div>
      </section>
    </div>
  );
}

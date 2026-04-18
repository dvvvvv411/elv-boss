import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

const BRAND = "#2ed573";

function Index() {
  const title = "ELV BOSS";
  const letters = title.split("");

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white">
      {/* Grid pattern overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      {/* Glow orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl animate-orb-float"
        style={{
          background: `radial-gradient(circle, ${BRAND}55 0%, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full opacity-30 blur-3xl animate-orb-float-delayed"
        style={{
          background: `radial-gradient(circle, ${BRAND}44 0%, transparent 70%)`,
        }}
      />

      {/* Subtle vignette for seriousness */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(255,255,255,0.6) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <h1
          className="flex select-none flex-wrap items-center justify-center font-sans text-6xl font-bold tracking-[0.08em] text-slate-900 sm:text-7xl md:text-8xl lg:text-9xl"
          aria-label={title}
        >
          {letters.map((char, i) => (
            <span
              key={i}
              className="inline-block animate-letter-in opacity-0"
              style={{
                animationDelay: `${i * 80}ms`,
                width: char === " " ? "0.4em" : undefined,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h1>

        {/* Accent line */}
        <div
          className="mt-6 h-[3px] w-40 origin-left animate-accent-grow rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)`,
            animationDelay: `${letters.length * 80 + 100}ms`,
            transform: "scaleX(0)",
          }}
        />

        {/* Tagline */}
        <p
          className="mt-8 animate-tagline-in text-sm font-medium uppercase tracking-[0.4em] text-slate-500 opacity-0 sm:text-base"
          style={{ animationDelay: `${letters.length * 80 + 400}ms` }}
        >
          Die Gelddruckmaschine
        </p>

        {/* CTA Button */}
        <Link
          to="/auth"
          className="mt-10 inline-flex items-center justify-center rounded-full px-10 py-4 text-base font-bold tracking-[0.2em] text-white opacity-0 animate-tagline-in transition-all duration-300 hover:scale-105"
          style={{
            background: BRAND,
            animationDelay: `${letters.length * 80 + 700}ms`,
            boxShadow: `0 10px 30px -10px ${BRAND}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 15px 40px -8px ${BRAND}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 10px 30px -10px ${BRAND}`;
          }}
        >
          LETS GO
        </Link>
      </div>
    </main>
  );
}

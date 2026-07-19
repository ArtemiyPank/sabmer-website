import ElevatorBackdrop from "@/components/elevator/ElevatorBackdrop";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * DEMO page for evaluating the elevator scroll animation.
 * Section lengths roughly match the future site (hero / about / founders /
 * careers / contacts) so the animation timing can be judged realistically.
 * Content cards sit on the start side so the schematic stays visible.
 */

function DemoSection({ title, note }: { title: string; note: string }) {
  return (
    <section className="flex min-h-screen items-center px-6 py-24 md:px-16">
      <div
        className="w-full max-w-md rounded-2xl border p-8 backdrop-blur-md"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--card-border)",
        }}
      >
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-4 text-sm leading-relaxed opacity-80">{note}</p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main>
      <ElevatorBackdrop />
      <ThemeToggle />

      <section className="flex min-h-screen items-center px-6 py-24 md:px-16">
        <div className="max-w-md">
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: "var(--bp-accent)" }}
          >
            Демо анимации
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Монтаж лифтов
            <br />
            под ключ
          </h1>
          <p className="mt-6 leading-relaxed opacity-80">
            Прокрутите страницу вниз: кабина едет вниз по шахте, противовес —
            вверх, а кабина постепенно «разбирается» в технический чертёж.
          </p>
          <p className="mt-4 text-sm opacity-60">↓ scroll</p>
        </div>
      </section>

      <DemoSection
        title="О компании"
        note="~25% прокрутки — двери кабины начинают отделяться от корпуса."
      />
      <DemoSection
        title="Основатели"
        note="~50% — панели, потолок и пол расходятся, заливка растворяется в blueprint-стиль."
      />
      <DemoSection
        title="Карьера"
        note="~70% — рама и ролики; кабина уже почти полностью — чертёж."
      />
      <DemoSection
        title="Контакты"
        note="~90–100% — разобранный чертёж с подписями и размерными линиями; противовес наверху."
      />
    </main>
  );
}

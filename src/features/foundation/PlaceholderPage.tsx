interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <p className="eyebrow">Foundation route</p>
      <h1>{title}</h1>
      <p>This screen is reserved for its numbered implementation step.</p>
    </section>
  )
}

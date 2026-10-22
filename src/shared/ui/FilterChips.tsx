export interface FilterChip<T extends string> {
  value: T
  label: string
}

export function FilterChips<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: readonly FilterChip<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div
      aria-label={label}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
    >
      {items.map((item) => {
        const selected = value === item.value
        return (
          <button
            aria-pressed={selected}
            className={`shrink-0 rounded-full border px-4 py-2 text-[length:var(--text-sm)] font-bold transition-colors ${
              selected
                ? 'border-primary bg-primary text-on-primary'
                : 'border-line bg-surface text-ink-2 hover:border-primary-mid hover:text-ink'
            }`}
            key={item.value || 'all'}
            type="button"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

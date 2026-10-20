import type { ReactNode } from 'react'

export interface ResponsiveDataListItem {
  id: string
  title: ReactNode
  description?: ReactNode
  badge?: ReactNode
  action?: ReactNode
  fields: Array<{ label: string; value: ReactNode }>
}

interface ResponsiveDataListProps {
  ariaLabel: string
  items: ResponsiveDataListItem[]
  hiddenFieldLabels?: string[]
}

export function ResponsiveDataList({
  ariaLabel,
  items,
  hiddenFieldLabels = [],
}: ResponsiveDataListProps) {
  return (
    <div className="mobile-data-list" aria-label={ariaLabel}>
      {items.map((item) => (
        <article className="mobile-data-card" key={item.id}>
          <div className="mobile-data-card-heading">
            <div>
              <strong>{item.title}</strong>
              {item.description && <small>{item.description}</small>}
            </div>
            {item.badge}
          </div>
          <dl>
            {item.fields
              .filter((field) => !hiddenFieldLabels.includes(field.label))
              .map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
          </dl>
          {item.action && <div className="mobile-data-card-action">{item.action}</div>}
        </article>
      ))}
    </div>
  )
}

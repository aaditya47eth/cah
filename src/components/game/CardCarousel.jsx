import { useEffect, useRef } from 'react'

// Swipeable row of cards (native scroll-snap). The centred card is "active";
// cards after it tilt away like a fanned deck. Tapping a side card brings it
// to the centre, tapping the active card calls onActivate.
export default function CardCarousel({
  items, active, onActiveChange, onActivate, renderCard, label, variant = 'hand',
}) {
  const ref = useRef(null)
  const frame = useRef(0)

  const step = () => {
    const el = ref.current
    if (!el || el.children.length < 2) return el?.children[0]?.offsetWidth || 1
    return el.children[1].offsetLeft - el.children[0].offsetLeft
  }

  const scrollTo = (index) => {
    ref.current?.scrollTo({ left: index * step(), behavior: 'smooth' })
  }

  const onScroll = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const index = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / step())))
      if (index !== active) onActiveChange(index)
    })
  }

  // Keep the active index valid when the list shrinks.
  useEffect(() => {
    if (items.length > 0 && active > items.length - 1) onActiveChange(items.length - 1)
  }, [items.length, active, onActiveChange])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollTo(Math.min(items.length - 1, active + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollTo(Math.max(0, active - 1)) }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate?.(items[active], active) }
  }

  return (
    <div
      ref={ref}
      className={`carousel carousel-${variant}`}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={label}
    >
      {items.map((item, i) => {
        const pos = i === active ? 'is-active' : i > active ? 'is-next' : 'is-prev'
        return (
          <div
            key={item.id}
            role="option"
            aria-selected={i === active}
            className={`carousel-item ${pos}`}
            onClick={() => (i === active ? onActivate?.(item, i) : scrollTo(i))}
          >
            {renderCard(item, i)}
            {i === active + 1 && (
              <span className="remaining">{items.length - active - 1} remaining</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

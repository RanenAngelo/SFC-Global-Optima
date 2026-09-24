import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Badge, Button, Card, Checkbox, Chip, Icon, IconButton, Rating, SearchInput, Select, Tooltip, cn,
} from '../../components/ui/primitives'
import { FoodImage } from '../../components/shared'
import { DishCard, DishCardSkeleton } from '../../components/store/DishCard'
import { CATEGORIES, MENU, MenuItem } from '../../lib/data/menu'
import { pkr } from '../../lib/utils'
import { EmptyState } from '../../components/ui/states'

type SortKey = 'popularity' | 'price-asc' | 'price-desc' | 'rating' | 'prep'

const PRICE_BANDS = [
  { label: 'Under Rs. 500', min: 0, max: 499 },
  { label: 'Rs. 500 – Rs. 1,000', min: 500, max: 1000 },
  { label: 'Rs. 1,000 – Rs. 1,500', min: 1001, max: 1500 },
  { label: 'Above Rs. 1,500', min: 1501, max: 99999 },
]

const DIET_TAGS = ['Vegetarian', 'Gluten-Free', 'Spicy', 'Signature', 'Bestseller', 'Chef Special', 'Vegan Option']

export default function MenuPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('popularity')
  const [diets, setDiets] = useState<string[]>([])
  const [bands, setBands] = useState<number[]>([])
  const [hideUnavailable, setHideUnavailable] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const category = params.get('category') ?? 'all'

  const setCategory = (slug: string) => {
    if (slug === 'all') params.delete('category')
    else params.set('category', slug)
    setParams(params, { replace: true })
  }

  const results = useMemo(() => {
    let rows: MenuItem[] = MENU
    if (category !== 'all') rows = rows.filter((m) => m.categorySlug === category)
    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter((m) => m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.tags.join(' ').toLowerCase().includes(q))
    if (diets.length) rows = rows.filter((m) => diets.some((d) => m.tags.includes(d)))
    if (bands.length) {
      const selected = bands.map((i) => PRICE_BANDS[i])
      rows = rows.filter((m) => selected.some((b) => m.price >= b.min && m.price <= b.max))
    }
    if (hideUnavailable) rows = rows.filter((m) => m.available)
    const sorted = [...rows]
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
    else if (sort === 'prep') sorted.sort((a, b) => parseInt(a.prep) - parseInt(b.prep))
    else sorted.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || b.reviews - a.reviews)
    return sorted
  }, [category, query, diets, bands, hideUnavailable, sort])

  const simulateRefresh = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 900)
  }

  const resetAll = () => {
    setQuery('')
    setDiets([])
    setBands([])
    setHideUnavailable(false)
    setCategory('all')
  }

  const activeFilters = diets.length + bands.length + (hideUnavailable ? 1 : 0) + (category !== 'all' ? 1 : 0)

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <p className="label mb-2.5">Categories</p>
        <div className="space-y-0.5">
          {[{ name: 'All dishes', slug: 'all' }, ...CATEGORIES].map((c) => {
            const isActive = category === c.slug
            const count = c.slug === 'all' ? MENU.length : MENU.filter((m) => m.categorySlug === c.slug).length
            return (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors',
                  isActive ? 'bg-ember-50 text-ember-700' : 'text-ink-soft hover:bg-canvas hover:text-ink',
                )}
              >
                <span className="flex items-center gap-2">
                  {'icon' in c ? <span>{(c as any).icon}</span> : <Icon name="LayoutGrid" size={14} />}
                  <span className="truncate">{c.name}</span>
                </span>
                <span className={cn('text-[11.5px] tabular-nums', isActive ? 'text-ember-600' : 'text-ink-faint')}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-line" />

      <div>
        <p className="label mb-2.5">Dietary & badges</p>
        <div className="space-y-2">
          {DIET_TAGS.map((t) => (
            <Checkbox
              key={t}
              label={t}
              checked={diets.includes(t)}
              onChange={() => setDiets((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]))}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-line" />

      <div>
        <p className="label mb-2.5">Price range</p>
        <div className="space-y-2">
          {PRICE_BANDS.map((b, i) => (
            <Checkbox key={b.label} label={b.label} checked={bands.includes(i)} onChange={() => setBands((x) => (x.includes(i) ? x.filter((v) => v !== i) : [...x, i]))} />
          ))}
        </div>
      </div>

      <div className="h-px bg-line" />

      <div className="space-y-2.5">
        <Checkbox label="Hide unavailable dishes" checked={hideUnavailable} onChange={() => setHideUnavailable((v) => !v)} />
        <Button variant="ghost" size="sm" icon="RotateCcw" onClick={resetAll} className="px-0">
          Reset all filters
        </Button>
      </div>
    </div>
  )

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label">Maison Ember · Clifton</p>
              <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">Our Menu</h1>
              <p className="mt-2.5 max-w-xl text-[14.5px] leading-relaxed text-ink-muted">
                {MENU.length} dishes across eight kitchen sections. Everything is prepared to order — tell us about
                allergies or spice tolerance in the special instructions box.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <Rating value={4.6} /> 2,184 reviews
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="Clock" size={14} className="text-ink-faint" /> Open until 11:30 PM
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="Truck" size={14} className="text-ink-faint" /> 20–30 min · Rs. 150
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="MapPin" size={14} className="text-ink-faint" /> Block 7, Clifton
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/offers">
                <Button variant="secondary" icon="BadgePercent">
                  Today’s offers
                </Button>
              </Link>
              <Button variant="secondary" icon="RefreshCw" onClick={simulateRefresh}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-[104px] z-30 border-b border-line bg-white/94 backdrop-blur-md lg:top-[112px]">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-3 sm:px-6">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search dishes, ingredients or tags…"
            className="max-w-sm flex-1"
          />
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="hidden w-[168px] sm:block"
            aria-label="Sort dishes"
          >
            <option value="popularity">Sort: Popularity</option>
            <option value="rating">Sort: Top rated</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="prep">Quickest to prepare</option>
          </Select>
          <div className="hidden items-center gap-1 rounded-xl border border-line-strong p-1 sm:flex">
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={cn('focus-ring rounded-lg p-1.5 transition-colors', view === 'grid' ? 'bg-canvas-deep text-ink' : 'text-ink-faint hover:text-ink')}
            >
              <Icon name="LayoutGrid" size={15} />
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={cn('focus-ring rounded-lg p-1.5 transition-colors', view === 'list' ? 'bg-canvas-deep text-ink' : 'text-ink-faint hover:text-ink')}
            >
              <Icon name="Rows3" size={15} />
            </button>
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-white px-3 text-[13px] font-medium text-ink-soft lg:hidden"
          >
            <Icon name="SlidersHorizontal" size={15} />
            Filters
            {activeFilters > 0 && <span className="rounded-full bg-ember-600 px-1.5 text-[10px] font-bold text-white">{activeFilters}</span>}
          </button>
        </div>

        {/* Category rail */}
        <div className="mx-auto max-w-[1280px] overflow-x-auto px-4 pb-3 sm:px-6">
          <div className="flex gap-2">
            {[{ name: 'All', slug: 'all', icon: '🍽️' }, ...CATEGORIES].map((c) => (
              <Chip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
                <span className="mr-1.5">{c.icon}</span>
                {c.name}
              </Chip>
            ))}
            <Chip active={false} onClick={() => setDiets((d) => (d.includes('Vegetarian') ? d : [...d, 'Vegetarian']))}>
              <Icon name="Leaf" size={13} className="mr-1.5 inline" />
              Vegetarian
            </Chip>
            <Chip active={false} onClick={() => setSort('rating')}>
              <Icon name="Star" size={13} className="mr-1.5 inline" />
              Top rated
            </Chip>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="border-b border-line bg-white px-4 py-4 lg:hidden">
          {FilterPanel}
        </div>
      )}

      {/* Body */}
      <div className="mx-auto max-w-[1280px] gap-8 px-4 py-8 sm:px-6 lg:flex">
        <aside className="hidden w-[248px] shrink-0 lg:block">
          <div className="sticky top-[190px] rounded-2xl border border-line bg-white p-4">{FilterPanel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-ink-muted">
              <span className="font-semibold text-ink">{results.length}</span> {results.length === 1 ? 'dish' : 'dishes'}
              {category !== 'all' && <> in {CATEGORIES.find((c) => c.slug === category)?.name}</>}
              {query && <> matching “{query}”</>}
            </p>
            {activeFilters > 0 && (
              <button onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-full border border-ember-200 bg-ember-50 px-3 py-1 text-[12px] font-semibold text-ember-700">
                <Icon name="Filter" size={12} />
                {activeFilters} filter{activeFilters > 1 ? 's' : ''} active
                <Icon name="X" size={12} />
              </button>
            )}
          </div>

          {loading ? (
            <div className={cn('grid gap-4', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <DishCardSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              variant="search"
              title="No dishes match your search"
              message={query ? <>We couldn’t find anything for “{query}”. Try a shorter search or clear a filter.</> : 'Try removing a filter to see more dishes.'}
              action={
                <Button variant="secondary" size="sm" icon="RotateCcw" onClick={resetAll}>
                  Clear search and filters
                </Button>
              }
            />
          ) : (
            <div className={cn('grid gap-4', view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2')}>
              {results.map((item) => (
                <DishCard key={item.id} item={item} layout={view === 'list' ? 'row' : 'grid'} />
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2 border-t border-line pt-6">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className={cn(
                    'focus-ring h-9 w-9 rounded-xl text-[13px] font-semibold transition-colors',
                    p === 1 ? 'bg-ember-600 text-white' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                  )}
                >
                  {p}
                </button>
              ))}
              <span className="px-1 text-[13px] text-ink-faint">of 3 pages</span>
            </div>
          )}

          {/* Informational note */}
          <div className="mt-8 rounded-2xl border border-line bg-white p-5">
            <h3 className="font-display text-[15px] font-semibold text-ink">Allergen & dietary information</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              Every dish page lists ingredients and allergens. Our kitchen handles gluten, dairy, nuts and shellfish, so
              we cannot guarantee a completely allergen-free plate. Tell us in the special instructions box and the
              kitchen will advise.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Halal certified', 'No pork served', 'Nut-free options', 'Vegetarian friendly'].map((t) => (
                <Badge key={t} tone="sage" icon="Check">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import {
  Badge, Button, Card, CardHeader, Field, Icon, Input, Select, Switch, Textarea, cn,
} from '../../components/ui/primitives'
import { useToast } from '../../components/ui/overlay'
import { PageHeader } from '../../components/admin/PageHeader'
import { DineIQMark, LiveNote, MetricRow } from '../../components/shared'
import { useAuth, useMeta } from '../../lib/api'
import { useWorkspace } from '../../store/app'
import { readPref, writePref } from '../../lib/utils'

const SECTIONS = [
  { key: 'profile', label: 'Restaurant profile', icon: 'Store' },
  { key: 'branches', label: 'Branch management', icon: 'Building2' },
  { key: 'hours', label: 'Operating hours', icon: 'Clock' },
  { key: 'menu', label: 'Menu preferences', icon: 'UtensilsCrossed' },
  { key: 'currency', label: 'Currency & tax', icon: 'Coins' },
  { key: 'notifications', label: 'Notification preferences', icon: 'Bell' },
  { key: 'users', label: 'Users & roles', icon: 'Users' },
  { key: 'appearance', label: 'Appearance', icon: 'Palette' },
  { key: 'security', label: 'Security', icon: 'ShieldCheck' },
  { key: 'support', label: 'Help & support', icon: 'CircleHelp' },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_PROFILE = {
  name: 'DineIQ Network', cuisine: 'grill', phone: '+92 21 111 111 111', email: 'hello@dineiq.example',
  address: '20 branches nationwide', city: 'Karachi', postal: '75600',
  desc: 'Multi-branch restaurant network analysed by DineIQ.',
}
const DEFAULT_HOURS = DAYS.map((d) => ({ day: d, open: '11:00', close: d === 'Friday' || d === 'Saturday' ? '00:30' : '23:00', closed: false }))
const DEFAULT_NOTIF = { margin: true, wastage: true, anomaly: true, rating: false, promotion: true, forecast: false, daily: true }
const DEFAULT_PREFS = { buffer: '10', autoHide: false, calories: true, spice: true, allergens: true, outOfStock: true }
const DEFAULT_TAX = { currency: 'USD', rate: '5', service: '0', rounding: 'nearest' }

const ROLE_MATRIX = [
  { role: 'Viewer', desc: 'Read-only access to dashboards, analytics and report previews.', perms: ['Dashboards', 'Analytics', 'Previews'] },
  { role: 'Analyst', desc: 'Everything a viewer can do, plus scenario simulations and recommendation workflow.', perms: ['What-if lab', 'Recommendation states'] },
  { role: 'Manager', desc: 'Everything an analyst can do, plus menu edits, order status and dataset exports.', perms: ['Menu edits', 'Order status', 'CSV/XLSX export'] },
  { role: 'Admin', desc: 'Full access to every module and management control.', perms: ['All modules', 'All controls'] },
]

export default function Settings() {
  const { push } = useToast()
  const { user, logout, can } = useAuth()
  const { options: meta } = useMeta()
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useWorkspace()
  const [section, setSection] = useState('profile')
  const [profile, setProfile] = useState(() => readPref('settings_profile', DEFAULT_PROFILE))
  const [hiddenBranches, setHiddenBranches] = useState<string[]>(() => readPref<string[]>('settings_hidden_branches', []))
  const [hours, setHours] = useState(() => readPref('settings_hours', DEFAULT_HOURS))
  const [notif, setNotif] = useState(() => readPref('settings_notif', DEFAULT_NOTIF))
  const [prefs, setPrefs] = useState(() => readPref('settings_menu_prefs', DEFAULT_PREFS))
  const [tax, setTax] = useState(() => readPref('settings_tax', DEFAULT_TAX))

  const save = (key: string, value: unknown, label: string) => {
    writePref(key, value)
    push({ title: `${label} saved`, body: 'Stored in this browser', tone: 'success' })
  }

  const branches = meta?.restaurants ?? []

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Settings"
        subtitle="Restaurant profile, branches, operating hours, team access and workspace preferences."
        demoNote="Workspace settings are stored in this browser. Branch and catalogue data is live from the API."
      />

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1.5 overflow-x-auto lg:sticky lg:top-[92px] lg:h-fit lg:flex-col lg:overflow-visible">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={cn(
                'focus-ring flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors',
                section === s.key ? 'bg-ink text-white' : 'text-ink-soft hover:bg-canvas hover:text-ink',
              )}
            >
              <Icon name={s.icon} size={16} />
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          {section === 'profile' && (
            <Card className="p-5">
              <CardHeader title="Restaurant profile" subtitle="How the network appears across DineIQ" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
              <div className="flex flex-wrap items-start gap-5">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-line bg-canvas">
                    <DineIQMark size={44} />
                  </div>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">Network identity</p>
                  <p className="text-[12.5px] text-ink-muted">Stored in this browser — logo upload is not available in this build.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Network name" required>
                  <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </Field>
                <Field label="Cuisine type">
                  <Select
                    value={profile.cuisine}
                    onChange={(e) => setProfile({ ...profile, cuisine: e.target.value })}
                    options={[
                      { label: 'Woodfire & grill', value: 'grill' },
                      { label: 'Italian', value: 'italian' },
                      { label: 'Pakistani', value: 'pakistani' },
                      { label: 'Fusion', value: 'fusion' },
                    ]}
                  />
                </Field>
                <Field label="Primary phone">
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} icon="Phone" />
                </Field>
                <Field label="Email address">
                  <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} icon="Mail" />
                </Field>
                <Field label="Street address" className="sm:col-span-2">
                  <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} icon="MapPin" />
                </Field>
                <Field label="City">
                  <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                </Field>
                <Field label="Postal code">
                  <Input value={profile.postal} onChange={(e) => setProfile({ ...profile, postal: e.target.value })} />
                </Field>
                <Field label="Short description" className="sm:col-span-2">
                  <Textarea value={profile.desc} onChange={(e) => setProfile({ ...profile, desc: e.target.value })} className="min-h-[88px]" />
                </Field>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="secondary" onClick={() => setProfile(readPref('settings_profile', DEFAULT_PROFILE))}>Discard</Button>
                <Button icon="Save" onClick={() => save('settings_profile', profile, 'Profile')}>
                  Save changes
                </Button>
              </div>
            </Card>
          )}

          {section === 'branches' && (
            <Card>
              <CardHeader
                title="Branch management"
                subtitle={`${branches.length} live branches from the API`}
                className="border-b"
              />
              <div className="divide-y divide-line">
                {branches.map((b) => {
                  const hidden = hiddenBranches.includes(b.restaurant_id)
                  return (
                    <div key={b.restaurant_id} className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <p className="text-[14px] font-semibold text-ink">{b.restaurant_name}</p>
                          <Badge tone={hidden ? 'neutral' : 'sage'} dot>
                            {hidden ? 'Hidden' : 'Active'}
                          </Badge>
                        </div>
                        <p className="mt-0.5 font-mono text-[12px] text-ink-muted">{b.restaurant_id} · {b.city}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          checked={!hidden}
                          onChange={(v) => {
                            const next = v ? hiddenBranches.filter((x) => x !== b.restaurant_id) : [...hiddenBranches, b.restaurant_id]
                            setHiddenBranches(next)
                            writePref('settings_hidden_branches', next)
                          }}
                          label="Visible"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-line p-4">
                <LiveNote>Branch list is live API data. Visibility flags are stored in this browser; branches cannot be added or edited here.</LiveNote>
              </div>
            </Card>
          )}

          {section === 'hours' && (
            <Card>
              <CardHeader title="Operating hours" subtitle="Service windows used for reporting reference" className="border-b" />
              <div className="divide-y divide-line">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <span className="w-28 text-[13.5px] font-semibold text-ink">{h.day}</span>
                    {h.closed ? (
                      <span className="text-[12.5px] font-medium text-clay-600">Closed</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={h.open}
                          onChange={(e) => setHours((prev) => prev.map((x, xi) => (xi === i ? { ...x, open: e.target.value } : x)))}
                          className="focus-ring h-9 rounded-lg border border-line-strong px-2.5 text-[13px]"
                        />
                        <span className="text-[12.5px] text-ink-faint">to</span>
                        <input
                          type="time"
                          value={h.close}
                          onChange={(e) => setHours((prev) => prev.map((x, xi) => (xi === i ? { ...x, close: e.target.value } : x)))}
                          className="focus-ring h-9 rounded-lg border border-line-strong px-2.5 text-[13px]"
                        />
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-3">
                      <Switch
                        size="sm"
                        checked={!h.closed}
                        onChange={(v) => setHours((prev) => prev.map((x, xi) => (xi === i ? { ...x, closed: !v } : x)))}
                        label={h.closed ? 'Closed' : 'Open'}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
                <p className="text-[12.5px] text-ink-muted">Stored in this browser.</p>
                <Button icon="Save" onClick={() => save('settings_hours', hours, 'Operating hours')}>
                  Save hours
                </Button>
              </div>
            </Card>
          )}

          {section === 'menu' && (
            <div className="space-y-5">
              <Card className="p-5">
                <CardHeader title="Menu preferences" subtitle="Display defaults for menu modules" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Preparation buffer" hint="Reference value for prep planning">
                    <Select value={prefs.buffer} onChange={(e) => setPrefs({ ...prefs, buffer: e.target.value })} options={[{ label: '5 minutes', value: '5' }, { label: '10 minutes', value: '10' }, { label: '15 minutes', value: '15' }]} />
                  </Field>
                </div>
                <div className="mt-5 divide-y divide-line border-t border-line pt-2">
                  <div className="py-3">
                    <Switch checked={prefs.calories} onChange={(v) => setPrefs({ ...prefs, calories: v })} label="Show calorie information" desc="Display preference for menu cards." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.spice} onChange={(v) => setPrefs({ ...prefs, spice: v })} label="Show spice indicators" desc="Chili icons on dishes with heat." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.allergens} onChange={(v) => setPrefs({ ...prefs, allergens: v })} label="Show allergen warnings" desc="Declared allergens on dish pages." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.outOfStock} onChange={(v) => setPrefs({ ...prefs, outOfStock: v })} label="Hide sold-out items automatically" desc="Unavailable items removed from lists." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.autoHide} onChange={(v) => setPrefs({ ...prefs, autoHide: v })} label="Flag low performers for review" desc="Highlights items classified as Low Performer." />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button icon="Save" onClick={() => save('settings_menu_prefs', prefs, 'Menu preferences')}>
                    Save preferences
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <CardHeader title="Menu sections" subtitle="Live categories from the catalogue" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
                <div className="space-y-2">
                  {(meta?.categories ?? []).map((c, i) => (
                    <div key={c.category_id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
                      <Icon name="GripVertical" size={15} className="text-ink-faint" />
                      <span className="flex-1 text-[13.5px] font-medium text-ink">{c.category_name}</span>
                      <span className="font-mono text-[11.5px] text-ink-faint">{c.category_id} · Position {i + 1}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'currency' && (
            <Card className="p-5">
              <CardHeader title="Currency & tax" subtitle="Display reference for reports and exports" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency" required>
                  <Select value={tax.currency} onChange={(e) => setTax({ ...tax, currency: e.target.value })} options={[{ label: 'USD — US Dollar', value: 'USD' }, { label: 'PKR — Pakistani Rupee', value: 'PKR' }, { label: 'AED — UAE Dirham', value: 'AED' }]} />
                </Field>
                <Field label="Sales tax rate (%)" hint="Reference value used in the preview below">
                  <Input value={tax.rate} onChange={(e) => setTax({ ...tax, rate: e.target.value })} />
                </Field>
                <Field label="Service charge (%)">
                  <Input value={tax.service} onChange={(e) => setTax({ ...tax, service: e.target.value })} />
                </Field>
                <Field label="Rounding">
                  <Select value={tax.rounding} onChange={(e) => setTax({ ...tax, rounding: e.target.value })} options={[{ label: 'Nearest unit', value: 'nearest' }, { label: 'Always round up', value: 'up' }, { label: 'No rounding', value: 'none' }]} />
                </Field>
              </div>
              <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
                <p className="text-[12.5px] font-semibold text-ink">Preview</p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Subtotal 2,450 · Tax {tax.rate || 0}% · Service {tax.service || 0}% · Total{' '}
                  <span className="font-semibold text-ink">
                    {tax.currency} {Math.round(2450 * (1 + Number(tax.rate || 0) / 100 + Number(tax.service || 0) / 100)).toLocaleString()}
                  </span>
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button icon="Save" onClick={() => save('settings_tax', tax, 'Currency settings')}>
                  Save settings
                </Button>
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card className="p-5">
              <CardHeader title="Notification preferences" subtitle="Which alerts you want to see — stored in this browser" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
              <div className="divide-y divide-line">
                {[
                  { k: 'margin' as const, l: 'Margin and profitability alerts', d: 'Contribution margin moves outside range.' },
                  { k: 'wastage' as const, l: 'Wastage alerts', d: 'Prepared quantity exceeds consumption thresholds.' },
                  { k: 'anomaly' as const, l: 'Sales anomaly alerts', d: 'Unusual spikes, drops or high-value orders.' },
                  { k: 'rating' as const, l: 'Rating changes', d: 'New low ratings or unusual rating patterns.' },
                  { k: 'promotion' as const, l: 'Promotion performance', d: 'Redemption and margin alerts during offers.' },
                  { k: 'forecast' as const, l: 'Forecast updates', d: 'When a new model forecast is available.' },
                  { k: 'daily' as const, l: 'Daily summary', d: 'A single digest each morning at 7:00 AM.' },
                ].map((n) => (
                  <div key={n.k} className="py-3">
                    <Switch checked={notif[n.k]} onChange={(v) => setNotif({ ...notif, [n.k]: v })} label={n.l} desc={n.d} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end border-t border-line pt-4">
                <Button icon="Save" onClick={() => save('settings_notif', notif, 'Notification preferences')}>
                  Save preferences
                </Button>
              </div>
            </Card>
          )}

          {section === 'users' && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Your access" subtitle="Signed-in session" className="border-b" />
                <div className="p-5">
                  <div className="divide-y divide-line">
                    <MetricRow label="Username" value={user?.username ?? '—'} />
                    <MetricRow label="Role" value={user?.role ?? '—'} />
                    <MetricRow label="Analytics & previews" value={can('viewer') ? 'Allowed' : 'Denied'} />
                    <MetricRow label="What-if & recommendations" value={can('analyst') ? 'Allowed' : 'Denied'} />
                    <MetricRow label="Menu, orders & exports" value={can('manager') ? 'Allowed' : 'Denied'} />
                    <MetricRow label="Administration" value={can('admin') ? 'Allowed' : 'Denied'} />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Roles & permissions" subtitle="Access levels enforced by the API" className="border-b" />
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {ROLE_MATRIX.map((r) => (
                    <div key={r.role} className="rounded-2xl border border-line p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-semibold text-ink">{r.role}</p>
                        {user?.role === r.role.toLowerCase() && <Badge tone="sage">You</Badge>}
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{r.desc}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {r.perms.map((p) => (
                          <span key={p} className="rounded-md bg-canvas px-2 py-1 text-[11px] font-semibold text-ink-muted">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <LiveNote>User provisioning is handled by the platform admin — accounts cannot be created here.</LiveNote>
            </div>
          )}

          {section === 'appearance' && (
            <Card className="p-5">
              <CardHeader title="Appearance" subtitle="Workspace look and layout" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
              <div className="space-y-5">
                <div>
                  <p className="mb-2.5 text-[13px] font-semibold text-ink">Theme</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { k: 'light', l: 'Warm light', d: 'Warm off-white canvas with charcoal text.' },
                      { k: 'warm', l: 'Warm sand', d: 'Slightly deeper neutral for long sessions.' },
                    ].map((t) => (
                      <button
                        key={t.k}
                        onClick={() => theme !== t.k && toggleTheme()}
                        className={cn(
                          'focus-ring rounded-2xl border p-4 text-left transition-all',
                          theme === t.k ? 'border-ember-600 ring-2 ring-ember-100' : 'border-line hover:border-line-strong',
                        )}
                      >
                        <div className={cn('mb-3 h-14 rounded-xl border', t.k === 'light' ? 'border-line bg-[#FAF7F3]' : 'border-line bg-[#F1ECE4]')}>
                          <div className="flex h-full items-center gap-1.5 px-3">
                            <span className="h-6 w-6 rounded-md bg-[#B54E17]" />
                            <span className="h-2 flex-1 rounded-full bg-[#E9E2D9]" />
                          </div>
                        </div>
                        <p className="text-[13.5px] font-semibold text-ink">{t.l}</p>
                        <p className="text-[12px] text-ink-muted">{t.d}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-line border-t border-line pt-2">
                  <div className="py-3">
                    <Switch checked={sidebarCollapsed} onChange={() => toggleSidebar()} label="Collapse the sidebar by default" desc="Icons only until you expand it." />
                  </div>
                </div>
                <LiveNote>Theme and sidebar apply instantly and are remembered in this browser.</LiveNote>
              </div>
            </Card>
          )}

          {section === 'security' && (
            <div className="space-y-5">
              <Card className="p-5">
                <CardHeader title="Session" subtitle="Your current sign-in" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
                <div className="divide-y divide-line">
                  <MetricRow label="Signed in as" value={user?.username ?? '—'} />
                  <MetricRow label="Role" value={user?.role ?? '—'} />
                  <MetricRow label="Authentication" value="Token session via the DineIQ API" />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" icon="LogOut" onClick={logout}>
                    Sign out
                  </Button>
                </div>
              </Card>
              <LiveNote>Password changes and device management are handled by the platform admin.</LiveNote>
            </div>
          )}

          {section === 'support' && (
            <div className="space-y-5">
              <Card className="p-5">
                <CardHeader title="Frequently asked" subtitle="About this system" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
                <div className="divide-y divide-line">
                  {[
                    { q: 'Is any of this data real?', a: 'Yes. Every dashboard reads from the DineIQ serving database, built by the analytics pipeline from order, menu, customer and wastage records.' },
                    { q: 'Where do the classifications come from?', a: 'The menu pipeline scores every item on demand, margin, wastage and ratings percentiles. Criteria are shown on the Menu Intelligence page.' },
                    { q: 'Why do some pages show “no signal” or empty states?', a: 'Because the pipeline only reports measured evidence. Items without a price revision, or days without orders, are shown honestly instead of filled in.' },
                    { q: 'Do exports produce files?', a: 'Yes. CSV and XLSX exports download the live dataset from the API. Exports require the manager role.' },
                  ].map((f) => (
                    <details key={f.q} className="group py-3">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 text-[13.5px] font-semibold text-ink">
                        {f.q}
                        <Icon name="ChevronDown" size={16} className="shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{f.a}</p>
                    </details>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-canvas">
                    <DineIQMark size={28} />
                  </span>
                  <div>
                    <p className="font-display text-[16px] font-semibold text-ink">DineIQ Analytics</p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">MenuMatrix Dining Intelligence · Live build</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        { l: 'Data window', v: meta ? `${meta.date_range.dmin.slice(0, 7)} → ${meta.date_range.dmax.slice(0, 7)}` : '—' },
                        { l: 'Locations', v: `${branches.length}` },
                        { l: 'Data source', v: 'Live API' },
                      ].map((m) => (
                        <div key={m.l} className="rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                          <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{m.l}</p>
                          <p className="mt-0.5 text-[13px] font-semibold text-ink">{m.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

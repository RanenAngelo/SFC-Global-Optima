import React, { useState } from 'react'
import {
  Avatar, Badge, Button, Card, CardHeader, Checkbox, Field, Icon, Input, Select, Switch, Textarea, Tooltip, cn,
} from '../../components/ui/primitives'
import { Modal, useToast } from '../../components/ui/overlay'
import { EmptyState } from '../../components/ui/states'
import { PageHeader } from '../../components/admin/PageHeader'
import { DemoNote, DineIQMark, MetricRow } from '../../components/shared'
import { ROLES, TEAM } from '../../lib/data/analytics'
import { LOCATIONS } from '../../lib/data/analytics'
import { useWorkspace } from '../../store/app'

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

export default function Settings() {
  const { push } = useToast()
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useWorkspace()
  const [section, setSection] = useState('profile')
  const [branches, setBranches] = useState(LOCATIONS.map((l) => ({ ...l })))
  const [inviteOpen, setInviteOpen] = useState(false)
  const [hours, setHours] = useState(
    DAYS.map((d) => ({ day: d, open: '11:00', close: d === 'Friday' || d === 'Saturday' ? '00:30' : '23:00', closed: false })),
  )
  const [notif, setNotif] = useState({
    margin: true, wastage: true, anomaly: true, rating: false, promotion: true, forecast: false, daily: true,
  })
  const [prefs, setPrefs] = useState({ buffer: '10', autoHide: false, calories: true, spice: true, allergens: true, outOfStock: true })
  const [tax, setTax] = useState({ currency: 'PKR', rate: '5', service: '0', rounding: 'nearest' })

  const save = (label: string) => push({ title: `${label} saved`, body: 'Demo only — nothing is persisted', tone: 'success' })

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Settings"
        subtitle="Restaurant profile, branches, operating hours, team access and workspace preferences."
        demoNote="Settings in this prototype are visual controls only. No configuration is saved to a server."
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
              <CardHeader title="Restaurant profile" subtitle="How Maison Ember appears across DineIQ" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
              <div className="flex flex-wrap items-start gap-5">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-line bg-canvas">
                    <DineIQMark size={44} />
                  </div>
                  <button className="focus-ring absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-ink text-white shadow-card" aria-label="Change logo">
                    <Icon name="Camera" size={15} />
                  </button>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">Restaurant logo</p>
                  <p className="text-[12.5px] text-ink-muted">Square PNG or SVG, at least 256×256 pixels.</p>
                  <div className="mt-2.5 flex gap-2">
                    <Button size="xs" variant="secondary" icon="Upload">
                      Upload logo
                    </Button>
                    <Button size="xs" variant="ghost" icon="Trash2" className="text-clay-600">
                      Remove
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Restaurant name" required>
                  <Input defaultValue="Maison Ember" />
                </Field>
                <Field label="Cuisine type">
                  <Select
                    options={[
                      { label: 'Woodfire & grill', value: 'grill' },
                      { label: 'Italian', value: 'italian' },
                      { label: 'Pakistani', value: 'pakistani' },
                      { label: 'Fusion', value: 'fusion' },
                    ]}
                  />
                </Field>
                <Field label="Primary phone">
                  <Input defaultValue="+92 21 111 362 637" icon="Phone" />
                </Field>
                <Field label="Email address">
                  <Input defaultValue="hello@maisonember.pk" icon="Mail" />
                </Field>
                <Field label="Street address" className="sm:col-span-2">
                  <Input defaultValue="Shop 4, Silk Residences, Block 7, Clifton" icon="MapPin" />
                </Field>
                <Field label="City">
                  <Input defaultValue="Karachi" />
                </Field>
                <Field label="Postal code">
                  <Input defaultValue="75600" />
                </Field>
                <Field label="Short description" className="sm:col-span-2">
                  <Textarea defaultValue="A woodfire kitchen in Karachi. Live fire cooking, 48-hour dough and dum-cooked biryani." className="min-h-[88px]" />
                </Field>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="secondary">Discard</Button>
                <Button icon="Save" onClick={() => save('Profile')}>
                  Save changes
                </Button>
              </div>
            </Card>
          )}

          {section === 'branches' && (
            <Card>
              <CardHeader
                title="Branch management"
                subtitle={`${branches.length} branches in this demo workspace`}
                className="border-b"
                actions={
                  <Button size="sm" icon="Plus" onClick={() => push({ title: 'Branch creation is a demo control', tone: 'info' })}>
                    Add branch
                  </Button>
                }
              />
              <div className="divide-y divide-line">
                {branches.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <p className="text-[14px] font-semibold text-ink">{b.name}</p>
                        <Badge tone="sage" dot>
                          Active
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-ink-muted">{b.area}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-muted">
                        <span>Manager: {b.manager}</span>
                        <span>{b.staff} staff</span>
                        <span>{b.seats} covers</span>
                        <span>Opened {b.opened}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        size="sm"
                        checked
                        onChange={() => push({ title: `${b.name} visibility toggled (demo)`, tone: 'info' })}
                        label="Visible"
                      />
                      <Button size="xs" variant="secondary" icon="Pencil" onClick={() => push({ title: 'Branch edit is a demo control', tone: 'info' })}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-line p-4">
                <DemoNote>Branch changes in this prototype affect the view only.</DemoNote>
              </div>
            </Card>
          )}

          {section === 'hours' && (
            <Card>
              <CardHeader title="Operating hours" subtitle="Service windows used for reporting and ordering availability" className="border-b" />
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
                <p className="text-[12.5px] text-ink-muted">Kitchen closes 30 minutes before the branch on every day.</p>
                <Button icon="Save" onClick={() => save('Operating hours')}>
                  Save hours
                </Button>
              </div>
            </Card>
          )}

          {section === 'menu' && (
            <div className="space-y-5">
              <Card className="p-5">
                <CardHeader title="Menu preferences" subtitle="Defaults applied across the menu modules" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Preparation buffer" hint="Extra minutes added to every prep time">
                    <Select value={prefs.buffer} onChange={(e) => setPrefs({ ...prefs, buffer: e.target.value })} options={[{ label: '5 minutes', value: '5' }, { label: '10 minutes', value: '10' }, { label: '15 minutes', value: '15' }]} />
                  </Field>
                  <Field label="Default currency display">
                    <Select options={[{ label: 'Rs. 1,250 (PKR symbol after code)', value: 'a' }, { label: 'PKR 1,250', value: 'b' }]} />
                  </Field>
                </div>
                <div className="mt-5 divide-y divide-line border-t border-line pt-2">
                  <div className="py-3">
                    <Switch checked={prefs.calories} onChange={(v) => setPrefs({ ...prefs, calories: v })} label="Show calorie information" desc="Displayed on customer menu cards." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.spice} onChange={(v) => setPrefs({ ...prefs, spice: v })} label="Show spice indicators" desc="Chili icons appear on dishes with heat." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.allergens} onChange={(v) => setPrefs({ ...prefs, allergens: v })} label="Show allergen warnings" desc="Declared allergens listed on dish pages." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.outOfStock} onChange={(v) => setPrefs({ ...prefs, outOfStock: v })} label="Hide sold-out items automatically" desc="Items unavailable today are removed from the storefront." />
                  </div>
                  <div className="py-3">
                    <Switch checked={prefs.autoHide} onChange={(v) => setPrefs({ ...prefs, autoHide: v })} label="Flag low performers for review" desc="Highlights items classified as Low Performer." />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button icon="Save" onClick={() => save('Menu preferences')}>
                    Save preferences
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <CardHeader title="Menu sections" subtitle="Order of sections shown to guests" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
                <div className="space-y-2">
                  {['Starters', 'Burgers', 'Pizza', 'Main Course', 'Rice & Bowls', 'Pasta', 'Desserts', 'Beverages'].map((c, i) => (
                    <div key={c} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
                      <Icon name="GripVertical" size={15} className="text-ink-faint" />
                      <span className="flex-1 text-[13.5px] font-medium text-ink">{c}</span>
                      <span className="text-[11.5px] text-ink-faint">Position {i + 1}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'currency' && (
            <Card className="p-5">
              <CardHeader title="Currency & tax" subtitle="Applied across orders, reports and exports" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency" required>
                  <Select value={tax.currency} onChange={(e) => setTax({ ...tax, currency: e.target.value })} options={[{ label: 'PKR — Pakistani Rupee', value: 'PKR' }, { label: 'USD — US Dollar', value: 'USD' }, { label: 'AED — UAE Dirham', value: 'AED' }]} />
                </Field>
                <Field label="Currency symbol">
                  <Input defaultValue="Rs." />
                </Field>
                <Field label="Sales tax rate (%)" hint="Applied at checkout as a demo value">
                  <Input value={tax.rate} onChange={(e) => setTax({ ...tax, rate: e.target.value })} />
                </Field>
                <Field label="Service charge (%)">
                  <Input value={tax.service} onChange={(e) => setTax({ ...tax, service: e.target.value })} />
                </Field>
                <Field label="Rounding">
                  <Select value={tax.rounding} onChange={(e) => setTax({ ...tax, rounding: e.target.value })} options={[{ label: 'Nearest rupee', value: 'nearest' }, { label: 'Always round up', value: 'up' }, { label: 'No rounding', value: 'none' }]} />
                </Field>
                <Field label="Delivery fee (PKR)">
                  <Input defaultValue="150" />
                </Field>
              </div>
              <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
                <p className="text-[12.5px] font-semibold text-ink">Preview</p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Subtotal Rs. 2,450 · Tax {tax.rate || 0}% · Service {tax.service || 0}% · Total{' '}
                  <span className="font-semibold text-ink">
                    Rs. {Math.round(2450 * (1 + Number(tax.rate || 0) / 100 + Number(tax.service || 0) / 100)).toLocaleString()}
                  </span>
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button icon="Save" onClick={() => save('Currency settings')}>
                  Save settings
                </Button>
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card className="p-5">
              <CardHeader title="Notification preferences" subtitle="Choose which demo alerts appear in the workspace" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
              <div className="divide-y divide-line">
                {[
                  { k: 'margin' as const, l: 'Margin and profitability alerts', d: 'Contribution margin moves outside the demo range.' },
                  { k: 'wastage' as const, l: 'Wastage alerts', d: 'Prepared quantity exceeds consumption thresholds.' },
                  { k: 'anomaly' as const, l: 'Sales anomaly alerts', d: 'Unusual spikes, drops or duplicate transactions.' },
                  { k: 'rating' as const, l: 'Rating changes', d: 'New low ratings or unusual rating patterns.' },
                  { k: 'promotion' as const, l: 'Promotion performance', d: 'Redemption and margin alerts during active offers.' },
                  { k: 'forecast' as const, l: 'Forecast updates', d: 'When a new illustrative forecast is available.' },
                  { k: 'daily' as const, l: 'Daily summary email', d: 'A single digest each morning at 7:00 AM.' },
                ].map((n) => (
                  <div key={n.k} className="py-3">
                    <Switch checked={notif[n.k]} onChange={(v) => setNotif({ ...notif, [n.k]: v })} label={n.l} desc={n.d} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end border-t border-line pt-4">
                <Button icon="Save" onClick={() => save('Notification preferences')}>
                  Save preferences
                </Button>
              </div>
            </Card>
          )}

          {section === 'users' && (
            <div className="space-y-5">
              <Card>
                <CardHeader
                  title="Team members"
                  subtitle="Demo user list for Maison Ember"
                  className="border-b"
                  actions={
                    <Button size="sm" icon="UserPlus" onClick={() => setInviteOpen(true)}>
                      Invite member
                    </Button>
                  }
                />
                <div className="divide-y divide-line">
                  {TEAM.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={t.name} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{t.name}</p>
                          <p className="truncate text-[11.5px] text-ink-muted">{t.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[12.5px] text-ink-muted">{t.locations}</span>
                        <Badge tone="neutral">{t.role}</Badge>
                        <Badge tone={t.status === 'Active' ? 'sage' : 'gold'} dot>
                          {t.status}
                        </Badge>
                        <span className="text-[11.5px] text-ink-faint">{t.lastActive}</span>
                        <Button size="xs" variant="ghost" icon="MoreHorizontal" aria-label="More actions" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader title="Roles & permissions" subtitle="Access levels available in this demo workspace" className="border-b" />
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {ROLES.map((r) => (
                    <div key={r.role} className="rounded-2xl border border-line p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-semibold text-ink">{r.role}</p>
                        <Badge tone="neutral">{r.members} member{r.members > 1 ? 's' : ''}</Badge>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{r.desc}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {r.permissions.map((p) => (
                          <span key={p} className="rounded-md bg-canvas px-2 py-1 text-[11px] font-semibold text-ink-muted">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'appearance' && (
            <Card className="p-5">
              <CardHeader title="Appearance" subtitle="Workspace look and layout preferences" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
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
                  <div className="py-3">
                    <Switch defaultChecked label="Compact tables" desc="Reduce row height in data tables." />
                  </div>
                  <div className="py-3">
                    <Switch defaultChecked label="Show demo badges" desc="Display “demo value” hints across analytics." />
                  </div>
                </div>

                <div>
                  <p className="mb-2.5 text-[13px] font-semibold text-ink">Accent colour</p>
                  <div className="flex flex-wrap gap-2">
                    {['#B54E17', '#96352C', '#5E8C4A', '#2F6FA8', '#C08A16'].map((c) => (
                      <button
                        key={c}
                        aria-label={`Accent ${c}`}
                        className={cn('focus-ring h-9 w-9 rounded-xl border-2 transition-all', c === '#B54E17' ? 'border-ink' : 'border-transparent')}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end border-t border-line pt-4">
                  <Button icon="Save" onClick={() => save('Appearance settings')}>
                    Save appearance
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {section === 'security' && (
            <div className="space-y-5">
              <Card className="p-5">
                <CardHeader title="Password" subtitle="Change the password for this demo account" className="-mx-5 -mt-5 mb-5 border-b px-5 py-4" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Current password" required>
                    <Input type="password" placeholder="••••••••" />
                  </Field>
                  <div />
                  <Field label="New password" required hint="At least 10 characters, with a number.">
                    <Input type="password" placeholder="••••••••" />
                  </Field>
                  <Field label="Confirm new password" required>
                    <Input type="password" placeholder="••••••••" />
                  </Field>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button icon="Save" onClick={() => save('Password')}>
                    Update password
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <CardHeader title="Account security" subtitle="Visual controls only — no authentication exists in this prototype" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
                <div className="divide-y divide-line">
                  <div className="py-3">
                    <Switch defaultChecked label="Two-factor authentication" desc="Require a code at sign-in." />
                  </div>
                  <div className="py-3">
                    <Switch defaultChecked label="Sign-in alerts" desc="Email me when a new device signs in." />
                  </div>
                  <div className="py-3">
                    <Switch label="Single sign-on (SSO)" desc="Available on the enterprise plan." />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Active sessions" subtitle="Demo device list" className="border-b" />
                <div className="divide-y divide-line">
                  {[
                    { d: 'Chrome · macOS', l: 'Karachi, PK', t: 'This device', c: 'now' },
                    { d: 'Safari · iPhone', l: 'Karachi, PK', t: 'Active', c: '2 hrs ago' },
                    { d: 'Chrome · Windows', l: 'Clifton Branch', t: 'Active', c: 'Yesterday' },
                  ].map((s) => (
                    <div key={s.d} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                      <div>
                        <p className="text-[13.5px] font-semibold text-ink">{s.d}</p>
                        <p className="text-[11.5px] text-ink-muted">{s.l}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone={s.t === 'This device' ? 'sage' : 'neutral'} dot>
                          {s.t}
                        </Badge>
                        <span className="text-[11.5px] text-ink-faint">{s.c}</span>
                        {s.t !== 'This device' && (
                          <Button size="xs" variant="ghost" className="text-clay-600">
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'support' && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { t: 'Documentation', d: 'Module guides and metric definitions.', i: 'BookOpen', a: 'Open docs' },
                  { t: 'Contact support', d: 'Email the DineIQ support team.', i: 'Mail', a: 'Email support' },
                  { t: 'Book a walkthrough', d: 'A 30-minute guided session.', i: 'CalendarCheck', a: 'Book session' },
                ].map((s) => (
                  <Card key={s.t} className="p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
                      <Icon name={s.i} size={18} />
                    </span>
                    <h3 className="mt-3 font-display text-[15.5px] font-semibold text-ink">{s.t}</h3>
                    <p className="mt-1 text-[12.5px] text-ink-muted">{s.d}</p>
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => push({ title: `${s.a} is a demo control`, tone: 'info' })}>
                      {s.a}
                    </Button>
                  </Card>
                ))}
              </div>

              <Card className="p-5">
                <CardHeader title="Frequently asked" subtitle="About this prototype" className="-mx-5 -mt-5 mb-4 border-b px-5 py-4" />
                <div className="divide-y divide-line">
                  {[
                    { q: 'Is any of this data real?', a: 'No. Every metric, order, customer and forecast in DineIQ Analytics is a hand-written placeholder for interface demonstration.' },
                    { q: 'Can I connect my restaurant data?', a: 'Not in this version. The application is a frontend prototype with no backend, database or integrations.' },
                    { q: 'Why are classifications labelled as demo?', a: 'Because they are static demonstration labels rather than the output of an analytical model.' },
                    { q: 'Do exports produce files?', a: 'No. Export, print and schedule controls are visual only.' },
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
                    <p className="mt-0.5 text-[13px] text-ink-muted">MenuMatrix Dining Intelligence · Prototype build 1.0.0</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        { l: 'Version', v: '1.0.0' },
                        { l: 'Build', v: 'prototype' },
                        { l: 'Data source', v: 'Static demo content' },
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

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a team member"
        subtitle="Demo dialog — no invitation is sent."
        icon="UserPlus"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              icon="Send"
              onClick={() => {
                setInviteOpen(false)
                push({ title: 'Invitation created (demo)', body: 'No email was sent', tone: 'success' })
              }}
            >
              Send invitation
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input placeholder="Ayesha Kamran" />
          </Field>
          <Field label="Email address" required>
            <Input placeholder="name@maisonember.pk" icon="Mail" />
          </Field>
          <Field label="Role" required>
            <Select options={ROLES.map((r) => ({ label: r.role, value: r.role }))} />
          </Field>
          <Field label="Locations">
            <Select
              options={[
                { label: 'All branches', value: 'all' },
                ...LOCATIONS.map((l) => ({ label: l.name, value: l.id })),
              ]}
            />
          </Field>
          <Field label="Personal note" className="sm:col-span-2">
            <Textarea placeholder="Welcome to the team — here is what to look at first…" className="min-h-[80px]" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

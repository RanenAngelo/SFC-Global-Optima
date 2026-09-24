/**
 * Demo analytics content for the DineIQ dashboard.
 *
 * IMPORTANT: Every number, trend, classification, forecast and recommendation in this file is a
 * hand-written UI placeholder. Nothing here is produced by a model, a pipeline, or real data.
 */

export const DEMO_NOTE = 'Demo values shown for interface presentation only.'

// ─────────────────────────────────────────────────────────────────────────────
// Overview KPIs
// ─────────────────────────────────────────────────────────────────────────────
export type Kpi = {
  key: string
  label: string
  value: string
  change: number
  compare: string
  hint: string
  icon: string
  tone: 'ember' | 'sage' | 'clay' | 'gold' | 'sky'
}

export const KPIS: Kpi[] = [
  { key: 'revenue', label: 'Total Revenue', value: 'Rs. 1,248,500', change: 12.4, compare: 'vs previous 30 days', hint: 'Demo value: gross sales across all selected locations and channels.', icon: 'Wallet', tone: 'ember' },
  { key: 'orders', label: 'Total Orders', value: '4,286', change: 8.1, compare: 'vs previous 30 days', hint: 'Demo value: completed orders in the selected period.', icon: 'Receipt', tone: 'sky' },
  { key: 'aov', label: 'Average Order Value', value: 'Rs. 1,140', change: 3.9, compare: 'vs previous 30 days', hint: 'Demo value: revenue divided by order count.', icon: 'TrendingUp', tone: 'gold' },
  { key: 'profit', label: 'Gross Profit', value: 'Rs. 486,900', change: 9.6, compare: 'vs previous 30 days', hint: 'Demo value: revenue less estimated ingredient cost.', icon: 'Coins', tone: 'sage' },
  { key: 'margin', label: 'Contribution Margin', value: '39.0%', change: -1.2, compare: 'vs previous 30 days', hint: 'Demo value: contribution margin across the menu mix.', icon: 'Percent', tone: 'sage' },
  { key: 'customers', label: 'Customer Count', value: '2,914', change: 6.8, compare: 'vs previous 30 days', hint: 'Demo value: unique customers who ordered in the period.', icon: 'Users', tone: 'sky' },
  { key: 'repeat', label: 'Repeat Purchase Rate', value: '41.2%', change: 2.3, compare: 'vs previous 30 days', hint: 'Demo value: share of customers with more than one order.', icon: 'RefreshCw', tone: 'ember' },
  { key: 'wastage', label: 'Food Wastage', value: '6.8%', change: -0.7, compare: 'vs previous 30 days', hint: 'Demo value: estimated prepared quantity not sold.', icon: 'Trash2', tone: 'clay' },
  { key: 'rating', label: 'Average Rating', value: '4.6', change: 0.2, compare: 'vs previous 30 days', hint: 'Demo value: mean of customer ratings across channels.', icon: 'Star', tone: 'gold' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Time series
// ─────────────────────────────────────────────────────────────────────────────
function buildSeries() {
  const base = [
    31200, 29800, 34100, 38900, 46200, 52400, 49800, 32600, 30100, 35800, 41200, 48600, 55100, 52300,
    33900, 31200, 36400, 42100, 49800, 56700, 53900, 34600, 32100, 37600, 43800, 51200, 58100, 55400,
    36400, 41200,
  ]
  const orders = base.map((v) => Math.round(v / 288))
  return base.map((revenue, i) => ({
    day: `Sep ${i + 1}`,
    revenue,
    orders: orders[i],
    profit: Math.round(revenue * 0.39),
    aov: Math.round(revenue / orders[i]),
  }))
}
export const REVENUE_SERIES = buildSeries()

export const ORDERS_BY_HOUR = [
  { hour: '10a', orders: 42 }, { hour: '11a', orders: 86 }, { hour: '12p', orders: 148 },
  { hour: '1p', orders: 232 }, { hour: '2p', orders: 268 }, { hour: '3p', orders: 191 },
  { hour: '4p', orders: 122 }, { hour: '5p', orders: 138 }, { hour: '6p', orders: 204 },
  { hour: '7p', orders: 312 }, { hour: '8p', orders: 386 }, { hour: '9p', orders: 341 },
  { hour: '10p', orders: 246 }, { hour: '11p', orders: 132 }, { hour: '12a', orders: 58 },
]

export const CATEGORY_REVENUE = [
  { category: 'Burgers', revenue: 312400, units: 1860, margin: 42.1 },
  { category: 'Pizza', revenue: 268900, units: 1120, margin: 38.4 },
  { category: 'Rice & Bowls', revenue: 214600, units: 1420, margin: 44.8 },
  { category: 'Main Course', revenue: 192300, units: 820, margin: 33.6 },
  { category: 'Pasta', revenue: 118700, units: 640, margin: 46.2 },
  { category: 'Starters', revenue: 86400, units: 1180, margin: 51.3 },
  { category: 'Desserts', revenue: 38200, units: 690, margin: 55.7 },
  { category: 'Beverages', revenue: 26900, units: 1490, margin: 64.1 },
]

export const TOP_SELLERS = [
  { name: 'Maison Signature Smash', units: 742, revenue: 853_300, margin: 65.0, img: '/img/hero-burger.jpg' },
  { name: 'Chicken Dum Biryani', units: 690, revenue: 614_100, margin: 66.5, img: '/img/biryani.jpg' },
  { name: 'Woodfired Pepperoni', units: 412, revenue: 679_800, margin: 65.4, img: '/img/pizza.jpg' },
  { name: 'Truffle Fettuccine Alfredo', units: 318, revenue: 410_220, margin: 66.8, img: '/img/pasta.jpg' },
  { name: 'Ember Buffalo Wings', units: 466, revenue: 363_480, margin: 60.9, img: '/img/wings.jpg' },
  { name: 'Molten Lava Cake', units: 388, revenue: 252_200, margin: 73.5, img: '/img/dessert.jpg' },
]

export const CHANNEL_MIX = [
  { name: 'Dine-in', value: 38, revenue: 474_430, color: '#B54E17' },
  { name: 'Delivery platform', value: 29, revenue: 362_065, color: '#5E8C4A' },
  { name: 'Website', value: 21, revenue: 262_185, color: '#C08A16' },
  { name: 'Takeaway', value: 12, revenue: 149_820, color: '#2F6FA8' },
]

export const MENU_PERFORMANCE_DIST = [
  { name: 'Profit Driver', value: 22, color: '#4A7139' },
  { name: 'Volume Driver', value: 28, color: '#2F6FA8' },
  { name: 'Hidden Opportunity', value: 19, color: '#C08A16' },
  { name: 'Low Performer', value: 31, color: '#96352C' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────────────────────
export type AdminOrder = {
  id: string
  number: string
  customer: string
  phone: string
  channel: 'Dine-in' | 'Takeaway' | 'Website' | 'Delivery platform'
  location: string
  status: 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled'
  payment: 'Paid' | 'Unpaid' | 'Refunded'
  paymentMethod: string
  total: number
  time: string
  items: { name: string; qty: number; price: number; notes?: string }[]
  table?: string
  address?: string
}

export const ADMIN_ORDERS: AdminOrder[] = [
  { id: 'o1', number: 'ME-24815', customer: 'Zara Mehdi', phone: '+92 300 1234567', channel: 'Website', location: 'Clifton Branch', status: 'Preparing', payment: 'Paid', paymentMethod: 'Visa •••• 4242', total: 3420, time: '20:12', table: undefined, address: 'Apt 4B, Silk Residences, Clifton', items: [{ name: 'Maison Signature Smash', qty: 2, price: 1150 }, { name: 'Truffle Parmesan Fries', qty: 1, price: 420 }, { name: 'Mint Lime Cooler', qty: 2, price: 320 }] },
  { id: 'o2', number: 'ME-24814', customer: 'Hamza Raza', phone: '+92 311 9988776', channel: 'Delivery platform', location: 'Gulshan Branch', status: 'Pending', payment: 'Paid', paymentMethod: 'Foodpanda', total: 2890, time: '20:08', items: [{ name: 'Fajita Chicken Pizza', qty: 1, price: 1700, notes: 'Extra chili' }, { name: 'Mango Lassi', qty: 2, price: 380 }, { name: 'Karak Chai', qty: 1, price: 220 }] },
  { id: 'o3', number: 'ME-24813', customer: 'Ayesha Kamran', phone: '+92 333 4455667', channel: 'Dine-in', location: 'Clifton Branch', status: 'Completed', payment: 'Paid', paymentMethod: 'Card', total: 5240, time: '19:54', table: 'T-12', items: [{ name: 'Grilled Ribeye Steak', qty: 1, price: 1890 }, { name: 'Truffle Fettuccine Alfredo', qty: 1, price: 1290 }, { name: 'Molten Lava Cake', qty: 2, price: 650 }, { name: 'Iced Spanish Latte', qty: 2, price: 520 }] },
  { id: 'o4', number: 'ME-24812', customer: 'Bilal Ahmed', phone: '+92 321 2233445', channel: 'Takeaway', location: 'Downtown Branch', status: 'Ready', payment: 'Unpaid', paymentMethod: 'Cash on pickup', total: 1780, time: '19:47', items: [{ name: 'Chicken Karahi', qty: 1, price: 1450 }, { name: 'Butter Naan ×2', qty: 1, price: 180 }, { name: 'Raita', qty: 1, price: 120 }] },
  { id: 'o5', number: 'ME-24811', customer: 'Sana Iqbal', phone: '+92 345 6677889', channel: 'Website', location: 'Downtown Branch', status: 'Completed', payment: 'Paid', paymentMethod: 'JazzCash', total: 2260, time: '19:31', address: 'Level 6, Ember Tower, PECHS', items: [{ name: 'Penne Arrabbiata', qty: 1, price: 1150 }, { name: 'Charred Corn & Feta Salad', qty: 1, price: 560 }, { name: 'Tiramisu Classico', qty: 1, price: 720 }] },
  { id: 'o6', number: 'ME-24810', customer: 'Usman Sheikh', phone: '+92 300 5566778', channel: 'Delivery platform', location: 'Clifton Branch', status: 'Cancelled', payment: 'Refunded', paymentMethod: 'Foodpanda', total: 1690, time: '19:22', items: [{ name: 'Double Cheese Beef Burger', qty: 1, price: 1390 }, { name: 'Fresh Orange Juice', qty: 1, price: 340 }] },
  { id: 'o7', number: 'ME-24809', customer: 'Mehwish Tariq', phone: '+92 322 1122334', channel: 'Dine-in', location: 'Gulshan Branch', status: 'Completed', payment: 'Paid', paymentMethod: 'Cash', total: 3980, time: '19:05', table: 'T-04', items: [{ name: 'Chicken Dum Biryani', qty: 2, price: 890 }, { name: 'Chicken Tikka Boti', qty: 1, price: 720 }, { name: 'Gulab Jamun with Ice Cream', qty: 2, price: 480 }, { name: 'Karak Chai', qty: 2, price: 220 }] },
  { id: 'o8', number: 'ME-24808', customer: 'Danish Ali', phone: '+92 313 4455667', channel: 'Website', location: 'Clifton Branch', status: 'Preparing', payment: 'Paid', paymentMethod: 'Easypaisa', total: 3120, time: '18:58', address: 'Bungalow 12, Khayaban-e-Bukhari', items: [{ name: 'Woodfired Pepperoni', qty: 1, price: 1650 }, { name: 'Ember Buffalo Wings', qty: 1, price: 780 }, { name: 'Brownie Sundae', qty: 1, price: 590 }, { name: 'Mint Lime Cooler', qty: 1, price: 320 }] },
  { id: 'o9', number: 'ME-24807', customer: 'Fariha Nadeem', phone: '+92 334 7788990', channel: 'Dine-in', location: 'Downtown Branch', status: 'Completed', payment: 'Paid', paymentMethod: 'Card', total: 2450, time: '18:40', table: 'T-07', items: [{ name: 'Malai Boti Platter', qty: 1, price: 1280 }, { name: 'Creamy Mushroom Linguine', qty: 1, price: 1090 }, { name: 'Karak Chai', qty: 1, price: 220 }] },
  { id: 'o10', number: 'ME-24806', customer: 'Rehan Siddiqui', phone: '+92 300 9900112', channel: 'Takeaway', location: 'Gulshan Branch', status: 'Completed', payment: 'Paid', paymentMethod: 'Cash', total: 980, time: '18:22', items: [{ name: 'Crispy Chicken Deluxe', qty: 1, price: 980 }] },
  { id: 'o11', number: 'ME-24805', customer: 'Nida Farooq', phone: '+92 311 2233445', channel: 'Delivery platform', location: 'Clifton Branch', status: 'Completed', payment: 'Paid', paymentMethod: 'Foodpanda', total: 1420, time: '18:10', items: [{ name: 'Beef Pulao', qty: 1, price: 1090 }, { name: 'Mint Lime Cooler', qty: 1, price: 320 }] },
  { id: 'o12', number: 'ME-24804', customer: 'Kamran Iqbal', phone: '+92 321 3344556', channel: 'Website', location: 'Downtown Branch', status: 'Pending', payment: 'Unpaid', paymentMethod: 'Cash on delivery', total: 2650, time: '18:02', address: 'House 45, Street 12, PECHS Block 2', items: [{ name: 'Peri Peri Chicken Pizza', qty: 1, price: 1720 }, { name: 'Dynamite Prawns', qty: 1, price: 980 }] },
]

export const RECENT_ALERTS = [
  { id: 'a1', tone: 'clay', title: 'Margin drop on Fajita Chicken Pizza', body: 'Demo alert: contribution margin fell while units sold increased.', time: '18 min ago', tag: 'Promotion trap' },
  { id: 'a2', tone: 'gold', title: 'Wastage spike — Rice & Bowls', body: 'Demo alert: prepared quantity exceeded consumption for 3 consecutive days.', time: '1 hr ago', tag: 'Wastage' },
  { id: 'a3', tone: 'sky', title: 'Unexpected demand for Karak Chai', body: 'Demo alert: units sold were well above the illustrative forecast band.', time: '2 hrs ago', tag: 'Demand' },
  { id: 'a4', tone: 'sage', title: 'Rating improved at Clifton Branch', body: 'Demo alert: weekly average moved up to 4.7 from 4.5.', time: '5 hrs ago', tag: 'Ratings' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Menu intelligence
// ─────────────────────────────────────────────────────────────────────────────
export type ClassificationKey = 'profit-driver' | 'volume-driver' | 'hidden-opportunity' | 'low-performer'

export const CLASSIFICATIONS: Record<
  ClassificationKey,
  { label: string; short: string; desc: string; color: string; bg: string; border: string; criteria: string[]; count: number; shareLabel: string }
> = {
  'profit-driver': {
    label: 'Profit Driver',
    short: 'Profit',
    desc: 'High margin and healthy demand. These dishes carry the profitability of the menu and should be protected from discounting.',
    color: '#4A7139', bg: '#F1F6EF', border: '#DDE9D8',
    criteria: ['Contribution margin above menu average', 'Units sold above category median', 'Wastage below category average'],
    count: 9, shareLabel: '22% of items',
  },
  'volume-driver': {
    label: 'Volume Driver',
    short: 'Volume',
    desc: 'High order volume with moderate margin. These dishes bring customers in and anchor combos and bundles.',
    color: '#2F6FA8', bg: '#F1F6FB', border: '#DDEBF7',
    criteria: ['Top-quartile units sold', 'Margin at or slightly below average', 'Frequently appears in baskets'],
    count: 11, shareLabel: '28% of items',
  },
  'hidden-opportunity': {
    label: 'Hidden Opportunity',
    short: 'Opportunity',
    desc: 'Strong margin or strong ratings but low visibility and low order volume. Merchandising and placement usually move these first.',
    color: '#C08A16', bg: '#FDF7EA', border: '#F8EBCB',
    criteria: ['Margin above average', 'Units sold below category median', 'Rating at or above 4.4'],
    count: 8, shareLabel: '19% of items',
  },
  'low-performer': {
    label: 'Low Performer',
    short: 'Low',
    desc: 'Low volume combined with low margin or high wastage. Candidates for recipe rework, repositioning or removal.',
    color: '#96352C', bg: '#FBF3F1', border: '#F4E1DB',
    criteria: ['Units sold in bottom quartile', 'Margin below average or wastage above 8%', 'Low repeat purchase'],
    count: 12, shareLabel: '31% of items',
  },
}

export type MenuIntelRow = {
  id: string
  name: string
  category: string
  units: number
  revenue: number
  cost: number
  cm: number
  profitPct: number
  rating: number
  repeat: number
  wastage: number
  promoDependency: number
  classification: ClassificationKey
  trend: number[]
  img?: string
}

export const MENU_INTEL: MenuIntelRow[] = [
  { id: 'mi-1', name: 'Maison Signature Smash', category: 'Burgers', units: 742, revenue: 853300, cost: 298284, cm: 555016, profitPct: 65.0, rating: 4.9, repeat: 62, wastage: 3.1, promoDependency: 12, classification: 'profit-driver', trend: [58, 62, 61, 68, 70, 74, 79, 82], img: '/img/hero-burger.jpg' },
  { id: 'mi-2', name: 'Chicken Dum Biryani', category: 'Rice & Bowls', units: 690, revenue: 614100, cost: 205620, cm: 408480, profitPct: 66.5, rating: 4.8, repeat: 58, wastage: 4.2, promoDependency: 18, classification: 'profit-driver', trend: [52, 55, 58, 57, 63, 66, 68, 71], img: '/img/biryani.jpg' },
  { id: 'mi-3', name: 'Woodfired Pepperoni', category: 'Pizza', units: 412, revenue: 679800, cost: 234840, cm: 444960, profitPct: 65.4, rating: 4.8, repeat: 47, wastage: 5.0, promoDependency: 26, classification: 'profit-driver', trend: [40, 43, 45, 44, 48, 51, 53, 56], img: '/img/pizza.jpg' },
  { id: 'mi-4', name: 'Truffle Fettuccine Alfredo', category: 'Pasta', units: 318, revenue: 410220, cost: 136104, cm: 274116, profitPct: 66.8, rating: 4.9, repeat: 44, wastage: 3.8, promoDependency: 9, classification: 'profit-driver', trend: [30, 32, 34, 36, 35, 39, 42, 44], img: '/img/pasta.jpg' },
  { id: 'mi-5', name: 'Molten Lava Cake', category: 'Desserts', units: 388, revenue: 252200, cost: 66736, cm: 185464, profitPct: 73.5, rating: 4.9, repeat: 51, wastage: 2.4, promoDependency: 7, classification: 'profit-driver', trend: [34, 36, 38, 40, 42, 44, 46, 49], img: '/img/dessert.jpg' },
  { id: 'mi-6', name: 'Ember Buffalo Wings', category: 'Starters', units: 466, revenue: 363480, cost: 142130, cm: 221350, profitPct: 60.9, rating: 4.7, repeat: 46, wastage: 4.6, promoDependency: 22, classification: 'profit-driver', trend: [41, 44, 46, 45, 48, 50, 52, 55], img: '/img/wings.jpg' },
  { id: 'mi-7', name: 'Mint Lime Cooler', category: 'Beverages', units: 512, revenue: 163840, cost: 31744, cm: 132096, profitPct: 80.6, rating: 4.7, repeat: 39, wastage: 1.8, promoDependency: 6, classification: 'profit-driver', trend: [44, 46, 49, 52, 54, 56, 58, 61] },
  { id: 'mi-8', name: 'Truffle Parmesan Fries', category: 'Starters', units: 604, revenue: 253680, cost: 71272, cm: 182408, profitPct: 71.9, rating: 4.8, repeat: 55, wastage: 2.9, promoDependency: 31, classification: 'profit-driver', trend: [50, 53, 55, 58, 60, 63, 66, 69] },
  { id: 'mi-9', name: 'Karak Chai', category: 'Beverages', units: 596, revenue: 131120, cost: 25032, cm: 106088, profitPct: 80.9, rating: 4.8, repeat: 67, wastage: 1.4, promoDependency: 4, classification: 'profit-driver', trend: [48, 50, 53, 57, 60, 64, 68, 72] },

  { id: 'mi-10', name: 'Crispy Chicken Deluxe', category: 'Burgers', units: 486, revenue: 476280, cost: 163296, cm: 312984, profitPct: 65.7, rating: 4.6, repeat: 43, wastage: 5.4, promoDependency: 34, classification: 'volume-driver', trend: [46, 48, 47, 50, 52, 53, 55, 57], img: '/img/hero-burger.jpg' },
  { id: 'mi-11', name: 'Margherita Classica', category: 'Pizza', units: 398, revenue: 497500, cost: 148056, cm: 349444, profitPct: 70.2, rating: 4.5, repeat: 38, wastage: 6.1, promoDependency: 29, classification: 'volume-driver', trend: [36, 38, 40, 39, 42, 44, 46, 48], img: '/img/pizza.jpg' },
  { id: 'mi-12', name: 'Chicken Karahi', category: 'Main Course', units: 342, revenue: 495900, cost: 186390, cm: 309510, profitPct: 62.4, rating: 4.8, repeat: 49, wastage: 7.2, promoDependency: 15, classification: 'volume-driver', trend: [30, 32, 34, 33, 36, 38, 40, 42], img: '/img/karahi.jpg' },
  { id: 'mi-13', name: 'Mango Lassi', category: 'Beverages', units: 448, revenue: 170240, cost: 43008, cm: 127232, profitPct: 74.7, rating: 4.8, repeat: 41, wastage: 3.2, promoDependency: 11, classification: 'volume-driver', trend: [40, 42, 44, 46, 47, 49, 51, 53], img: '/img/drink.jpg' },
  { id: 'mi-14', name: 'Spaghetti Bolognese', category: 'Pasta', units: 264, revenue: 327360, cost: 119328, cm: 208032, profitPct: 63.5, rating: 4.7, repeat: 36, wastage: 5.9, promoDependency: 19, classification: 'volume-driver', trend: [24, 26, 27, 29, 30, 32, 34, 35], img: '/img/pasta.jpg' },
  { id: 'mi-15', name: 'Penne Arrabbiata', category: 'Pasta', units: 232, revenue: 266800, cost: 74704, cm: 192096, profitPct: 72.0, rating: 4.6, repeat: 33, wastage: 4.8, promoDependency: 24, classification: 'volume-driver', trend: [20, 22, 23, 24, 26, 27, 29, 31], img: '/img/pasta.jpg' },
  { id: 'mi-16', name: 'Chicken Tikka Boti', category: 'Starters', units: 318, revenue: 228960, cost: 85224, cm: 143736, profitPct: 62.8, rating: 4.6, repeat: 42, wastage: 6.4, promoDependency: 17, classification: 'volume-driver', trend: [26, 28, 29, 31, 32, 34, 35, 37] },
  { id: 'mi-17', name: 'Beef Pulao', category: 'Rice & Bowls', units: 214, revenue: 233260, cost: 96728, cm: 136532, profitPct: 58.5, rating: 4.6, repeat: 31, wastage: 8.1, promoDependency: 13, classification: 'volume-driver', trend: [18, 19, 20, 21, 22, 23, 24, 26], img: '/img/biryani.jpg' },
  { id: 'mi-18', name: 'Fajita Chicken Pizza', category: 'Pizza', units: 296, revenue: 503200, cost: 179080, cm: 324120, profitPct: 64.4, rating: 4.7, repeat: 40, wastage: 6.9, promoDependency: 47, classification: 'volume-driver', trend: [28, 30, 33, 35, 34, 36, 38, 40], img: '/img/pizza.jpg' },

  { id: 'mi-19', name: 'Pan-Seared Fish Fillet', category: 'Main Course', units: 96, revenue: 152640, cost: 67680, cm: 84960, profitPct: 55.6, rating: 4.7, repeat: 28, wastage: 3.6, promoDependency: 5, classification: 'hidden-opportunity', trend: [8, 9, 10, 11, 12, 13, 14, 15] },
  { id: 'mi-20', name: 'Dynamite Prawns', category: 'Starters', units: 118, revenue: 115640, cost: 49560, cm: 66080, profitPct: 57.1, rating: 4.6, repeat: 30, wastage: 4.4, promoDependency: 8, classification: 'hidden-opportunity', trend: [9, 10, 11, 12, 13, 14, 15, 16] },
  { id: 'mi-21', name: 'Mushroom Melt Burger', category: 'Burgers', units: 132, revenue: 117480, cost: 35376, cm: 82104, profitPct: 69.9, rating: 4.4, repeat: 26, wastage: 4.1, promoDependency: 10, classification: 'hidden-opportunity', trend: [10, 11, 12, 13, 13, 14, 15, 16] },
  { id: 'mi-22', name: 'Quattro Formaggi', category: 'Pizza', units: 108, revenue: 171720, cost: 57024, cm: 114696, profitPct: 66.8, rating: 4.6, repeat: 24, wastage: 5.2, promoDependency: 12, classification: 'hidden-opportunity', trend: [8, 9, 10, 10, 11, 12, 13, 14], img: '/img/pizza.jpg' },
  { id: 'mi-23', name: 'Charred Corn & Feta Salad', category: 'Starters', units: 124, revenue: 69440, cost: 20460, cm: 48980, profitPct: 70.5, rating: 4.5, repeat: 22, wastage: 6.8, promoDependency: 9, classification: 'hidden-opportunity', trend: [9, 10, 11, 12, 12, 13, 14, 15], img: '/img/salad.jpg' },
  { id: 'mi-24', name: 'Tiramisu Classico', category: 'Desserts', units: 146, revenue: 105120, cost: 29930, cm: 75190, profitPct: 71.5, rating: 4.7, repeat: 29, wastage: 3.0, promoDependency: 6, classification: 'hidden-opportunity', trend: [11, 12, 13, 14, 15, 16, 17, 18], img: '/img/dessert.jpg' },
  { id: 'mi-25', name: 'Malai Boti Platter', category: 'Main Course', units: 142, revenue: 181760, cost: 66456, cm: 115304, profitPct: 63.4, rating: 4.7, repeat: 34, wastage: 5.6, promoDependency: 14, classification: 'hidden-opportunity', trend: [11, 12, 13, 14, 15, 16, 17, 18], img: '/img/karahi.jpg' },
  { id: 'mi-26', name: 'Creamy Mushroom Linguine', category: 'Pasta', units: 128, revenue: 139520, cost: 42880, cm: 96640, profitPct: 69.3, rating: 4.5, repeat: 25, wastage: 4.9, promoDependency: 11, classification: 'hidden-opportunity', trend: [10, 11, 12, 13, 13, 14, 15, 16], img: '/img/pasta.jpg' },

  { id: 'mi-27', name: 'Grilled Ribeye Steak', category: 'Main Course', units: 84, revenue: 158760, cost: 76020, cm: 82740, profitPct: 52.1, rating: 4.9, repeat: 19, wastage: 9.4, promoDependency: 4, classification: 'low-performer', trend: [9, 9, 8, 8, 7, 7, 7, 6], img: '/img/steak.jpg' },
  { id: 'mi-28', name: 'Stuffed Mushroom Caps', category: 'Starters', units: 92, revenue: 63480, cost: 19780, cm: 43700, profitPct: 68.8, rating: 4.3, repeat: 14, wastage: 11.2, promoDependency: 8, classification: 'low-performer', trend: [10, 9, 9, 8, 8, 7, 7, 6] },
  { id: 'mi-29', name: 'Thai Basil Vegetable Rice', category: 'Rice & Bowls', units: 86, revenue: 73960, cost: 20468, cm: 53492, profitPct: 72.3, rating: 4.3, repeat: 12, wastage: 13.6, promoDependency: 16, classification: 'low-performer', trend: [9, 9, 8, 8, 7, 6, 6, 5] },
  { id: 'mi-30', name: 'Prawn Fried Rice', category: 'Rice & Bowls', units: 78, revenue: 100620, cost: 42276, cm: 58344, profitPct: 58.0, rating: 4.6, repeat: 17, wastage: 10.8, promoDependency: 12, classification: 'low-performer', trend: [8, 8, 7, 7, 6, 6, 5, 5] },
  { id: 'mi-31', name: 'Teriyaki Chicken Bowl', category: 'Rice & Bowls', units: 94, revenue: 98700, cost: 33652, cm: 65048, profitPct: 65.9, rating: 4.5, repeat: 15, wastage: 9.7, promoDependency: 21, classification: 'low-performer', trend: [10, 9, 9, 8, 8, 7, 7, 6] },
  { id: 'mi-32', name: 'Gulab Jamun with Ice Cream', category: 'Desserts', units: 118, revenue: 56640, cost: 15104, cm: 41536, profitPct: 73.3, rating: 4.6, repeat: 18, wastage: 8.9, promoDependency: 13, classification: 'low-performer', trend: [12, 11, 11, 10, 10, 9, 9, 8] },
  { id: 'mi-33', name: 'Fresh Orange Juice', category: 'Beverages', units: 86, revenue: 29240, cost: 7568, cm: 21672, profitPct: 74.1, rating: 4.5, repeat: 11, wastage: 12.4, promoDependency: 7, classification: 'low-performer', trend: [9, 9, 8, 8, 7, 7, 6, 6] },
]

export const SCATTER_DATA = MENU_INTEL.map((r) => ({
  name: r.name,
  units: r.units,
  profitPct: r.profitPct,
  revenue: r.revenue,
  classification: r.classification,
}))

export const MARGIN_DISTRIBUTION = [
  { bucket: '50–55%', items: 3 }, { bucket: '55–60%', items: 5 }, { bucket: '60–65%', items: 9 },
  { bucket: '65–70%', items: 11 }, { bucket: '70–75%', items: 7 }, { bucket: '75%+', items: 4 },
]

export const MENU_DETAIL_TABS = [
  'Overview', 'Sales', 'Profitability', 'Customer behaviour', 'Ratings', 'Wastage', 'Pricing', 'Promotions', 'Location performance',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────────────────
export const SEGMENTS = [
  { key: 'high-value', name: 'High-Value Loyal Customers', count: 412, share: 14.1, color: '#4A7139', desc: 'Highest spend per order, order frequently and rarely need a discount.', aov: 2140, freq: 6.8, clv: 42800 },
  { key: 'frequent', name: 'Frequent Customers', count: 638, share: 21.9, color: '#2F6FA8', desc: 'Order often with moderate basket sizes. Responsive to combos and bundles.', aov: 1280, freq: 5.1, clv: 19600 },
  { key: 'promo', name: 'Promotion-Driven Customers', count: 724, share: 24.8, color: '#C08A16', desc: 'Most orders are placed while a discount is active. Margin sensitive.', aov: 890, freq: 3.4, clv: 9100 },
  { key: 'at-risk', name: 'At-Risk Customers', count: 486, share: 16.7, color: '#96352C', desc: 'Previously regular, no order in a long period. Win-back candidates.', aov: 1120, freq: 1.9, clv: 12400 },
  { key: 'new', name: 'New Customers', count: 402, share: 13.8, color: '#B54E17', desc: 'First order within the selected period. Onboarding opportunity.', aov: 960, freq: 1.2, clv: 1800 },
  { key: 'occasional', name: 'Occasional Customers', count: 252, share: 8.7, color: '#726B62', desc: 'Irregular ordering pattern with small baskets and long gaps.', aov: 720, freq: 1.4, clv: 3200 },
]

export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  segment: string
  orders: number
  spend: number
  aov: number
  lastOrder: string
  recency: number
  frequency: number
  monetary: number
  rfm: string
  channel: string
  favourites: string[]
  joined: string
  city: string
}

export const CUSTOMERS: Customer[] = [
  { id: 'c-1', name: 'Ayesha Kamran', phone: '+92 333 4455667', email: 'ayesha.k@example.com', segment: 'High-Value Loyal Customers', orders: 34, spend: 72480, aov: 2132, lastOrder: '2 days ago', recency: 2, frequency: 9, monetary: 9, rfm: '9-9-9', channel: 'Dine-in', favourites: ['Maison Signature Smash', 'Truffle Fettuccine Alfredo'], joined: 'Mar 2024', city: 'Karachi' },
  { id: 'c-2', name: 'Hamza Raza', phone: '+92 311 9988776', email: 'hamza.r@example.com', segment: 'Frequent Customers', orders: 26, spend: 41230, aov: 1586, lastOrder: '4 days ago', recency: 4, frequency: 8, monetary: 7, rfm: '8-8-7', channel: 'Delivery platform', favourites: ['Fajita Chicken Pizza', 'Mango Lassi'], joined: 'Jun 2024', city: 'Karachi' },
  { id: 'c-3', name: 'Zara Mehdi', phone: '+92 300 1234567', email: 'zara.m@example.com', segment: 'High-Value Loyal Customers', orders: 29, spend: 63150, aov: 2177, lastOrder: '1 day ago', recency: 1, frequency: 9, monetary: 9, rfm: '9-9-9', channel: 'Website', favourites: ['Chicken Dum Biryani', 'Molten Lava Cake'], joined: 'Jan 2024', city: 'Karachi' },
  { id: 'c-4', name: 'Bilal Ahmed', phone: '+92 321 2233445', email: 'bilal.a@example.com', segment: 'Promotion-Driven Customers', orders: 18, spend: 16240, aov: 902, lastOrder: '6 days ago', recency: 6, frequency: 5, monetary: 4, rfm: '5-5-4', channel: 'Delivery platform', favourites: ['Margherita Classica', 'Mint Lime Cooler'], joined: 'Aug 2024', city: 'Karachi' },
  { id: 'c-5', name: 'Sana Iqbal', phone: '+92 345 6677889', email: 'sana.i@example.com', segment: 'Frequent Customers', orders: 22, spend: 29860, aov: 1357, lastOrder: '3 days ago', recency: 3, frequency: 7, monetary: 6, rfm: '7-7-6', channel: 'Website', favourites: ['Penne Arrabbiata', 'Tiramisu Classico'], joined: 'Feb 2024', city: 'Karachi' },
  { id: 'c-6', name: 'Mehwish Tariq', phone: '+92 322 1122334', email: 'mehwish.t@example.com', segment: 'At-Risk Customers', orders: 12, spend: 22480, aov: 1873, lastOrder: '68 days ago', recency: 68, frequency: 3, monetary: 6, rfm: '2-3-6', channel: 'Dine-in', favourites: ['Chicken Karahi', 'Gulab Jamun with Ice Cream'], joined: 'Apr 2024', city: 'Karachi' },
  { id: 'c-7', name: 'Danish Ali', phone: '+92 313 4455667', email: 'danish.a@example.com', segment: 'New Customers', orders: 2, spend: 3120, aov: 1560, lastOrder: '5 days ago', recency: 5, frequency: 1, monetary: 3, rfm: '6-1-3', channel: 'Website', favourites: ['Woodfired Pepperoni'], joined: 'Sep 2026', city: 'Karachi' },
  { id: 'c-8', name: 'Usman Sheikh', phone: '+92 300 5566778', email: 'usman.s@example.com', segment: 'Occasional Customers', orders: 4, spend: 4260, aov: 1065, lastOrder: '41 days ago', recency: 41, frequency: 2, monetary: 2, rfm: '3-2-2', channel: 'Delivery platform', favourites: ['Double Cheese Beef Burger'], joined: 'May 2025', city: 'Karachi' },
  { id: 'c-9', name: 'Fariha Nadeem', phone: '+92 334 7788990', email: 'fariha.n@example.com', segment: 'Promotion-Driven Customers', orders: 15, spend: 13980, aov: 932, lastOrder: '9 days ago', recency: 9, frequency: 5, monetary: 4, rfm: '4-5-4', channel: 'Dine-in', favourites: ['Malai Boti Platter', 'Karak Chai'], joined: 'Jul 2024', city: 'Karachi' },
  { id: 'c-10', name: 'Kamran Iqbal', phone: '+92 321 3344556', email: 'kamran.i@example.com', segment: 'At-Risk Customers', orders: 9, spend: 14210, aov: 1579, lastOrder: '54 days ago', recency: 54, frequency: 2, monetary: 5, rfm: '2-2-5', channel: 'Website', favourites: ['Peri Peri Chicken Pizza'], joined: 'Nov 2024', city: 'Karachi' },
]

export const CUSTOMER_KPIS = [
  { label: 'Customer Count', value: '2,914', change: 6.8, icon: 'Users', tone: 'sky' },
  { label: 'New Customers', value: '402', change: 11.2, icon: 'UserPlus', tone: 'ember' },
  { label: 'Returning Customers', value: '2,512', change: 5.4, icon: 'Repeat', tone: 'sage' },
  { label: 'Repeat Purchase Rate', value: '41.2%', change: 2.3, icon: 'RefreshCw', tone: 'ember' },
  { label: 'Average Customer Value', value: 'Rs. 428', change: 4.1, icon: 'Wallet', tone: 'gold' },
  { label: 'At-Risk Customers', value: '486', change: -3.6, icon: 'AlertTriangle', tone: 'clay' },
]

export const SEGMENT_TREND = [
  { month: 'Apr', loyal: 312, frequent: 508, promo: 640, atRisk: 402, new: 288, occasional: 214 },
  { month: 'May', loyal: 334, frequent: 532, promo: 668, atRisk: 418, new: 302, occasional: 226 },
  { month: 'Jun', loyal: 358, frequent: 561, promo: 690, atRisk: 442, new: 328, occasional: 238 },
  { month: 'Jul', loyal: 372, frequent: 584, promo: 704, atRisk: 466, new: 344, occasional: 244 },
  { month: 'Aug', loyal: 394, frequent: 612, promo: 716, atRisk: 478, new: 372, occasional: 248 },
  { month: 'Sep', loyal: 412, frequent: 638, promo: 724, atRisk: 486, new: 402, occasional: 252 },
]

export const FAVOURITE_CATEGORIES = [
  { category: 'Burgers', value: 28 }, { category: 'Pizza', value: 22 }, { category: 'Rice & Bowls', value: 18 },
  { category: 'Pasta', value: 12 }, { category: 'Main Course', value: 9 }, { category: 'Starters', value: 6 },
  { category: 'Desserts', value: 3 }, { category: 'Beverages', value: 2 },
]

export const TIME_PREFERENCE = [
  { slot: '11–1', dineIn: 18, delivery: 12, takeaway: 8 },
  { slot: '1–3', dineIn: 32, delivery: 18, takeaway: 10 },
  { slot: '3–5', dineIn: 14, delivery: 16, takeaway: 12 },
  { slot: '5–7', dineIn: 22, delivery: 28, takeaway: 14 },
  { slot: '7–9', dineIn: 46, delivery: 44, takeaway: 20 },
  { slot: '9–11', dineIn: 28, delivery: 36, takeaway: 9 },
]

export const CUSTOMER_TIMELINE = [
  { time: '24 Sep, 8:12 PM', title: 'Ordered Maison Signature Smash ×2', detail: 'Website order · Rs. 3,420', tone: '#B54E17' },
  { time: '21 Sep, 1:05 PM', title: 'Dine-in visit · Clifton Branch', detail: 'Table 12 · Rs. 2,870', tone: '#2F6FA8' },
  { time: '18 Sep, 7:20 PM', title: 'Redeemed offer SWEET3000', detail: 'Complimentary dessert applied', tone: '#C08A16' },
  { time: '11 Sep, 9:30 PM', title: 'Order cancelled', detail: 'Pickup · refunded to Visa •••• 4242', tone: '#96352C' },
  { time: '02 Sep, 8:40 PM', title: 'Left a 5-star review', detail: 'Reviewed Chicken Dum Biryani', tone: '#4A7139' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Market basket
// ─────────────────────────────────────────────────────────────────────────────
export const BASKET_PAIRS = [
  { id: 'bp-1', a: 'Maison Signature Smash', b: 'Truffle Parmesan Fries', support: 18.4, confidence: 72.1, lift: 3.42, opportunity: 'High', action: 'Bundle as a combo at Rs. 1,480', imgA: '/img/hero-burger.jpg', imgB: '/img/pizza.jpg' },
  { id: 'bp-2', a: 'Chicken Dum Biryani', b: 'Mango Lassi', support: 15.9, confidence: 68.4, lift: 3.18, opportunity: 'High', action: 'Add as suggested add-on at checkout', imgA: '/img/biryani.jpg', imgB: '/img/drink.jpg' },
  { id: 'bp-3', a: 'Woodfired Pepperoni', b: 'Ember Buffalo Wings', support: 12.2, confidence: 54.6, lift: 2.61, opportunity: 'Medium', action: 'Sharing bundle for delivery channel', imgA: '/img/pizza.jpg', imgB: '/img/wings.jpg' },
  { id: 'bp-4', a: 'Truffle Fettuccine Alfredo', b: 'Charred Corn & Feta Salad', support: 8.1, confidence: 41.2, lift: 2.24, opportunity: 'Medium', action: 'Position as a lunch pairing', imgA: '/img/pasta.jpg', imgB: '/img/salad.jpg' },
  { id: 'bp-5', a: 'Chicken Karahi', b: 'Karak Chai', support: 11.4, confidence: 49.8, lift: 2.09, opportunity: 'Medium', action: 'Family dinner bundle with naan', imgA: '/img/karahi.jpg', imgB: '/img/drink.jpg' },
  { id: 'bp-6', a: 'Molten Lava Cake', b: 'Iced Spanish Latte', support: 9.6, confidence: 46.3, lift: 2.87, opportunity: 'High', action: 'Dessert and coffee combo at Rs. 990', imgA: '/img/dessert.jpg', imgB: '/img/drink.jpg' },
  { id: 'bp-7', a: 'Crispy Chicken Deluxe', b: 'Mint Lime Cooler', support: 13.8, confidence: 58.2, lift: 1.94, opportunity: 'Medium', action: 'Upsell drink in cart drawer', imgA: '/img/hero-burger.jpg', imgB: '/img/drink.jpg' },
  { id: 'bp-8', a: 'Penne Arrabbiata', b: 'Tiramisu Classico', support: 6.2, confidence: 34.1, lift: 1.72, opportunity: 'Low', action: 'Test on website menu only', imgA: '/img/pasta.jpg', imgB: '/img/dessert.jpg' },
]

export const BUNDLES = [
  { id: 'bd-1', name: 'Signature Smash Combo', items: ['Maison Signature Smash', 'Truffle Parmesan Fries', 'Mint Lime Cooler'], price: 1480, was: 1890, lift: 3.42, tone: 'ember', img: '/img/hero-burger.jpg' },
  { id: 'bd-2', name: 'Biryani Family Feast', items: ['Chicken Dum Biryani ×2', 'Mango Lassi ×2', 'Gulab Jamun'], price: 2980, was: 3660, lift: 3.18, tone: 'gold', img: '/img/biryani.jpg' },
  { id: 'bd-3', name: 'Pizza Night Bundle', items: ['Woodfired Pepperoni', 'Ember Buffalo Wings', 'Brownie Sundae'], price: 2790, was: 3410, lift: 2.61, tone: 'clay', img: '/img/pizza.jpg' },
  { id: 'bd-4', name: 'Pasta Date Night', items: ['Truffle Fettuccine Alfredo', 'Charred Corn & Feta Salad', 'Tiramisu Classico'], price: 2390, was: 2960, lift: 2.24, tone: 'sage', img: '/img/pasta.jpg' },
]

export const CATEGORY_PAIRING = [
  { source: 'Burgers', target: 'Beverages', strength: 88 },
  { source: 'Burgers', target: 'Starters', strength: 74 },
  { source: 'Pizza', target: 'Starters', strength: 69 },
  { source: 'Rice & Bowls', target: 'Beverages', strength: 66 },
  { source: 'Pasta', target: 'Starters', strength: 52 },
  { source: 'Pasta', target: 'Desserts', strength: 41 },
  { source: 'Main Course', target: 'Beverages', strength: 38 },
  { source: 'Desserts', target: 'Beverages', strength: 47 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Forecasting
// ─────────────────────────────────────────────────────────────────────────────
export const FORECAST_DAILY = [
  { label: 'Mon', actual: 312, forecast: null, lower: null, upper: null },
  { label: 'Tue', actual: 298, forecast: null, lower: null, upper: null },
  { label: 'Wed', actual: 341, forecast: null, lower: null, upper: null },
  { label: 'Thu', actual: 389, forecast: null, lower: null, upper: null },
  { label: 'Fri', actual: 462, forecast: null, lower: null, upper: null },
  { label: 'Sat', actual: 524, forecast: null, lower: null, upper: null },
  { label: 'Sun', actual: 498, forecast: null, lower: null, upper: null },
  { label: 'Mon', actual: null, forecast: 326, lower: 292, upper: 361 },
  { label: 'Tue', actual: null, forecast: 312, lower: 278, upper: 347 },
  { label: 'Wed', actual: null, forecast: 358, lower: 320, upper: 396 },
  { label: 'Thu', actual: null, forecast: 404, lower: 361, upper: 447 },
  { label: 'Fri', actual: null, forecast: 486, lower: 432, upper: 542 },
  { label: 'Sat', actual: null, forecast: 548, lower: 486, upper: 611 },
  { label: 'Sun', actual: null, forecast: 521, lower: 461, upper: 582 },
]

export const FORECAST_WEEKLY = [
  { label: 'W1', actual: 2410, forecast: null },
  { label: 'W2', actual: 2680, forecast: null },
  { label: 'W3', actual: 2795, forecast: null },
  { label: 'W4', actual: 2940, forecast: null },
  { label: 'W5', actual: null, forecast: 3025 },
  { label: 'W6', actual: null, forecast: 3118 },
  { label: 'W7', actual: null, forecast: 3186 },
  { label: 'W8', actual: null, forecast: 3302 },
]

export const FORECAST_MONTHLY = [
  { label: 'Apr', actual: 9420, forecast: null },
  { label: 'May', actual: 10180, forecast: null },
  { label: 'Jun', actual: 10940, forecast: null },
  { label: 'Jul', actual: 11260, forecast: null },
  { label: 'Aug', actual: 11840, forecast: null },
  { label: 'Sep', actual: 12480, forecast: null },
  { label: 'Oct', actual: null, forecast: 13120 },
  { label: 'Nov', actual: null, forecast: 13860 },
  { label: 'Dec', actual: null, forecast: 14940 },
]

export const FORECAST_SUMMARY = [
  { label: 'Expected units (next 7 days)', value: '2,955', sub: 'Illustrative forecast', tone: 'ember', icon: 'Package' },
  { label: 'Expected revenue', value: 'Rs. 851,000', sub: 'Illustrative forecast', tone: 'sage', icon: 'Wallet' },
  { label: 'Peak day', value: 'Saturday', sub: 'Illustrative forecast', tone: 'gold', icon: 'CalendarDays' },
  { label: 'Suggested prep uplift', value: '+8%', sub: 'Illustrative forecast', tone: 'sky', icon: 'TrendingUp' },
]

export const FORECAST_ACCURACY = [
  { metric: 'MAE', value: '28.4 units', note: 'Mean absolute error — illustrative', tone: 'sage' },
  { metric: 'RMSE', value: '36.1 units', note: 'Root mean squared error — illustrative', tone: 'sky' },
  { metric: 'MAPE', value: '7.8%', note: 'Mean absolute percentage error — illustrative', tone: 'gold' },
]

export const FORECAST_NOTES = [
  'Illustrative forecast generated for interface demonstration only.',
  'Weekend uplift is reflected in the upper confidence band for Friday to Sunday.',
  'Promotion periods are not modelled in this demo view.',
  'Replace this panel with a connected forecasting service in a future version.',
]

// ─────────────────────────────────────────────────────────────────────────────
// Inventory & wastage
// ─────────────────────────────────────────────────────────────────────────────
export type InventoryItem = {
  id: string
  name: string
  unit: string
  stock: number
  capacity: number
  reorder: number
  status: 'Healthy' | 'Low' | 'Critical' | 'Overstocked'
  usedPerDay: number
  costPerUnit: number
  supplier: string
  lastDelivery: string
  category: string
}

export const INVENTORY: InventoryItem[] = [
  { id: 'iv-1', name: 'Beef mince (premium)', unit: 'kg', stock: 42, capacity: 120, reorder: 40, status: 'Low', usedPerDay: 18, costPerUnit: 1450, supplier: 'Sindh Meat Co.', lastDelivery: '22 Sep', category: 'Protein' },
  { id: 'iv-2', name: 'Chicken breast', unit: 'kg', stock: 96, capacity: 140, reorder: 45, status: 'Healthy', usedPerDay: 22, costPerUnit: 620, supplier: 'Al-Falah Poultry', lastDelivery: '23 Sep', category: 'Protein' },
  { id: 'iv-3', name: 'Mozzarella fior di latte', unit: 'kg', stock: 28, capacity: 90, reorder: 35, status: 'Critical', usedPerDay: 14, costPerUnit: 1180, supplier: 'Dairy Craft', lastDelivery: '20 Sep', category: 'Dairy' },
  { id: 'iv-4', name: 'Pizza dough balls', unit: 'pcs', stock: 310, capacity: 500, reorder: 150, status: 'Healthy', usedPerDay: 120, costPerUnit: 46, supplier: 'In-house bakery', lastDelivery: 'Daily', category: 'Bakery' },
  { id: 'iv-5', name: 'Basmati rice', unit: 'kg', stock: 220, capacity: 260, reorder: 80, status: 'Overstocked', usedPerDay: 26, costPerUnit: 320, supplier: 'Rice Traders', lastDelivery: '18 Sep', category: 'Dry' },
  { id: 'iv-6', name: 'Fresh cream', unit: 'L', stock: 34, capacity: 90, reorder: 30, status: 'Low', usedPerDay: 16, costPerUnit: 480, supplier: 'Dairy Craft', lastDelivery: '22 Sep', category: 'Dairy' },
  { id: 'iv-7', name: 'Tomato passata', unit: 'L', stock: 88, capacity: 120, reorder: 40, status: 'Healthy', usedPerDay: 21, costPerUnit: 265, supplier: 'Orchard Foods', lastDelivery: '21 Sep', category: 'Dry' },
  { id: 'iv-8', name: 'Black truffle paste', unit: 'g', stock: 480, capacity: 1200, reorder: 300, status: 'Healthy', usedPerDay: 90, costPerUnit: 68, supplier: 'Import Partners', lastDelivery: '14 Sep', category: 'Dry' },
  { id: 'iv-9', name: 'Tiger prawns', unit: 'kg', stock: 9, capacity: 40, reorder: 15, status: 'Critical', usedPerDay: 5, costPerUnit: 2450, supplier: 'Harbour Seafood', lastDelivery: '19 Sep', category: 'Protein' },
  { id: 'iv-10', name: 'Brussels sprouts', unit: 'kg', stock: 14, capacity: 30, reorder: 12, status: 'Low', usedPerDay: 6, costPerUnit: 540, supplier: 'Green Basket', lastDelivery: '22 Sep', category: 'Produce' },
  { id: 'iv-11', name: 'Dark chocolate 70%', unit: 'kg', stock: 26, capacity: 45, reorder: 15, status: 'Healthy', usedPerDay: 7, costPerUnit: 2980, supplier: 'Cocoa House', lastDelivery: '17 Sep', category: 'Dry' },
  { id: 'iv-12', name: 'Fresh mint', unit: 'bunches', stock: 62, capacity: 70, reorder: 20, status: 'Overstocked', usedPerDay: 14, costPerUnit: 45, supplier: 'Green Basket', lastDelivery: '23 Sep', category: 'Produce' },
]

export const WASTAGE_BY_CATEGORY = [
  { category: 'Rice & Bowls', waste: 14.2, prepared: 1620 },
  { category: 'Main Course', waste: 9.8, prepared: 940 },
  { category: 'Pizza', waste: 6.9, prepared: 1280 },
  { category: 'Starters', waste: 6.1, prepared: 1340 },
  { category: 'Pasta', waste: 5.2, prepared: 720 },
  { category: 'Burgers', waste: 4.8, prepared: 2100 },
  { category: 'Desserts', waste: 3.4, prepared: 780 },
  { category: 'Beverages', waste: 1.6, prepared: 1680 },
]

export const WASTAGE_TREND = [
  { day: 'Mon', waste: 6.4, cost: 8420 }, { day: 'Tue', waste: 6.1, cost: 7980 },
  { day: 'Wed', waste: 7.2, cost: 9640 }, { day: 'Thu', waste: 6.8, cost: 9020 },
  { day: 'Fri', waste: 8.4, cost: 12480 }, { day: 'Sat', waste: 9.1, cost: 13960 },
  { day: 'Sun', waste: 8.2, cost: 12640 },
]

export const WASTAGE_BY_LOCATION = [
  { location: 'Clifton Branch', waste: 5.4, cost: 18240 },
  { location: 'Downtown Branch', waste: 7.9, cost: 24180 },
  { location: 'Gulshan Branch', waste: 9.6, cost: 29860 },
]

export const PREP_VS_CONSUMPTION = [
  { item: 'Chicken Dum Biryani', prepared: 690, consumed: 662 },
  { item: 'Thai Basil Veg Rice', prepared: 86, consumed: 74 },
  { item: 'Grilled Ribeye Steak', prepared: 96, consumed: 87 },
  { item: 'Prawn Fried Rice', prepared: 78, consumed: 70 },
  { item: 'Stuffed Mushroom Caps', prepared: 92, consumed: 82 },
  { item: 'Maison Signature Smash', prepared: 742, consumed: 719 },
]

export const WASTAGE_RISK = [
  { id: 'wr-1', title: 'High wastage observed in demo data for selected item.', item: 'Thai Basil Vegetable Rice', level: 'High', value: '13.6%', action: 'Reduce default prep quantity for weekday service' },
  { id: 'wr-2', title: 'Prepared quantity exceeded consumption for three days.', item: 'Stuffed Mushroom Caps', level: 'High', value: '11.2%', action: 'Move to made-to-order preparation' },
  { id: 'wr-3', title: 'Portion cost is high relative to units sold.', item: 'Grilled Ribeye Steak', level: 'Medium', value: '9.4%', action: 'Introduce a 220g portion option' },
  { id: 'wr-4', title: 'Ingredient nearing expiry with low forward demand.', item: 'Tiger prawns', level: 'Medium', value: '8.8%', action: 'Feature Dynamite Prawns on the weekend specials board' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────────────────────
export type PricingRow = {
  id: string
  name: string
  category: string
  current: number
  previous: number
  changePct: number
  unitsBefore: number
  unitsAfter: number
  revenueBefore: number
  revenueAfter: number
  marginBefore: number
  marginAfter: number
  sensitivity: 'Highly Price Sensitive' | 'Moderately Price Sensitive' | 'Low Price Sensitivity'
  img?: string
}

export const PRICING_ROWS: PricingRow[] = [
  { id: 'pr-1', name: 'Maison Signature Smash', category: 'Burgers', current: 1150, previous: 1050, changePct: 9.5, unitsBefore: 786, unitsAfter: 742, revenueBefore: 825300, revenueAfter: 853300, marginBefore: 61.7, marginAfter: 65.0, sensitivity: 'Low Price Sensitivity', img: '/img/hero-burger.jpg' },
  { id: 'pr-2', name: 'Fajita Chicken Pizza', category: 'Pizza', current: 1700, previous: 1650, changePct: 3.0, unitsBefore: 318, unitsAfter: 296, revenueBefore: 524700, revenueAfter: 503200, marginBefore: 66.0, marginAfter: 64.4, sensitivity: 'Highly Price Sensitive', img: '/img/pizza.jpg' },
  { id: 'pr-3', name: 'Chicken Dum Biryani', category: 'Rice & Bowls', current: 890, previous: 850, changePct: 4.7, unitsBefore: 712, unitsAfter: 690, revenueBefore: 605200, revenueAfter: 614100, marginBefore: 65.0, marginAfter: 66.5, sensitivity: 'Low Price Sensitivity', img: '/img/biryani.jpg' },
  { id: 'pr-4', name: 'Truffle Fettuccine Alfredo', category: 'Pasta', current: 1290, previous: 1190, changePct: 8.4, unitsBefore: 342, unitsAfter: 318, revenueBefore: 406980, revenueAfter: 410220, marginBefore: 64.4, marginAfter: 66.8, sensitivity: 'Moderately Price Sensitive', img: '/img/pasta.jpg' },
  { id: 'pr-5', name: 'Grilled Ribeye Steak', category: 'Main Course', current: 1890, previous: 1790, changePct: 5.6, unitsBefore: 112, unitsAfter: 84, revenueBefore: 200480, revenueAfter: 158760, marginBefore: 49.4, marginAfter: 52.1, sensitivity: 'Highly Price Sensitive', img: '/img/steak.jpg' },
  { id: 'pr-6', name: 'Molten Lava Cake', category: 'Desserts', current: 650, previous: 620, changePct: 4.8, unitsBefore: 396, unitsAfter: 388, revenueBefore: 245520, revenueAfter: 252200, marginBefore: 72.3, marginAfter: 73.5, sensitivity: 'Low Price Sensitivity', img: '/img/dessert.jpg' },
  { id: 'pr-7', name: 'Mint Lime Cooler', category: 'Beverages', current: 320, previous: 300, changePct: 6.7, unitsBefore: 528, unitsAfter: 512, revenueBefore: 158400, revenueAfter: 163840, marginBefore: 79.4, marginAfter: 80.6, sensitivity: 'Moderately Price Sensitive', img: '/img/drink.jpg' },
  { id: 'pr-8', name: 'Crispy Chicken Deluxe', category: 'Burgers', current: 980, previous: 940, changePct: 4.3, unitsBefore: 498, unitsAfter: 486, revenueBefore: 468120, revenueAfter: 476280, marginBefore: 64.9, marginAfter: 65.7, sensitivity: 'Moderately Price Sensitive' },
  { id: 'pr-9', name: 'Margherita Classica', category: 'Pizza', current: 1250, previous: 1250, changePct: 0, unitsBefore: 402, unitsAfter: 398, revenueBefore: 502500, revenueAfter: 497500, marginBefore: 70.2, marginAfter: 70.2, sensitivity: 'Low Price Sensitivity', img: '/img/pizza.jpg' },
  { id: 'pr-10', name: 'Prawn Fried Rice', category: 'Rice & Bowls', current: 1290, previous: 1350, changePct: -4.4, unitsBefore: 72, unitsAfter: 78, revenueBefore: 97200, revenueAfter: 100620, marginBefore: 56.2, marginAfter: 58.0, sensitivity: 'Highly Price Sensitive' },
]

export const PRICE_HISTORY = [
  { month: 'Apr', price: 990, units: 612 }, { month: 'May', price: 990, units: 648 },
  { month: 'Jun', price: 1050, units: 702 }, { month: 'Jul', price: 1050, units: 756 },
  { month: 'Aug', price: 1050, units: 786 }, { month: 'Sep', price: 1150, units: 742 },
]

export const PRICE_IMPACT = [
  { id: 'pi-1', title: 'Margin improved after price revision', item: 'Maison Signature Smash', detail: 'Contribution margin moved from 61.7% to 65.0% in the demo data.', tone: 'sage', icon: 'TrendingUp' },
  { id: 'pi-2', title: 'Units declined after price revision', item: 'Grilled Ribeye Steak', detail: 'Units fell from 112 to 84 in the illustrative comparison.', tone: 'clay', icon: 'TrendingDown' },
  { id: 'pi-3', title: 'Revenue held despite lower units', item: 'Chicken Dum Biryani', detail: 'Revenue increased while units softened slightly.', tone: 'sage', icon: 'Equal' },
  { id: 'pi-4', title: 'Combination margin at risk', item: 'Fajita Chicken Pizza', detail: 'Promotion dependency remains high at 47% of units.', tone: 'gold', icon: 'AlertTriangle' },
]

export const LOCATION_PRICING = [
  { item: 'Maison Signature Smash', clifton: 1150, downtown: 1090, gulshan: 1050 },
  { item: 'Chicken Dum Biryani', clifton: 890, downtown: 850, gulshan: 820 },
  { item: 'Woodfired Pepperoni', clifton: 1650, downtown: 1590, gulshan: 1520 },
  { item: 'Truffle Fettuccine Alfredo', clifton: 1290, downtown: 1240, gulshan: 1190 },
  { item: 'Molten Lava Cake', clifton: 650, downtown: 620, gulshan: 590 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Promotions
// ─────────────────────────────────────────────────────────────────────────────
export type Promotion = {
  id: string
  name: string
  code: string
  type: 'Percentage' | 'Fixed amount' | 'Buy one get one' | 'Bundle'
  value: string
  status: 'Active' | 'Scheduled' | 'Expired'
  channel: string
  locations: string[]
  items: string[]
  start: string
  end: string
  redemptions: number
  revenue: number
  orders: number
  aov: number
  margin: number
  newCustomers: number
  repeatRate: number
  wastage: number
  baselineRevenue: number
  baselineMargin: number
}

export const PROMOTIONS: Promotion[] = [
  { id: 'pm-1', name: 'Wednesday Pizza Night', code: 'PIZZA20', type: 'Percentage', value: '20% off', status: 'Active', channel: 'All channels', locations: ['Clifton Branch', 'Downtown Branch', 'Gulshan Branch'], items: ['Woodfired Pepperoni', 'Margherita Classica', 'Fajita Chicken Pizza'], start: '01 Sep 2026', end: '30 Sep 2026', redemptions: 812, revenue: 486200, orders: 1140, aov: 1042, margin: 28.4, newCustomers: 186, repeatRate: 32, wastage: 8.2, baselineRevenue: 402800, baselineMargin: 38.1 },
  { id: 'pm-2', name: 'Burger & Fries Bundle', code: 'BURGERFRIES', type: 'Bundle', value: 'Free fries', status: 'Active', channel: 'Website', locations: ['Clifton Branch'], items: ['Maison Signature Smash', 'Crispy Chicken Deluxe'], start: '10 Sep 2026', end: '10 Oct 2026', redemptions: 436, revenue: 298400, orders: 512, aov: 1284, margin: 41.2, newCustomers: 74, repeatRate: 48, wastage: 4.6, baselineRevenue: 268100, baselineMargin: 44.0 },
  { id: 'pm-3', name: 'Family Biryani Feast', code: 'FAMILYBIRYANI', type: 'Fixed amount', value: 'Rs. 400 off', status: 'Scheduled', channel: 'All channels', locations: ['Gulshan Branch'], items: ['Chicken Dum Biryani', 'Beef Pulao'], start: '01 Oct 2026', end: '31 Oct 2026', redemptions: 0, revenue: 0, orders: 0, aov: 0, margin: 0, newCustomers: 0, repeatRate: 0, wastage: 0, baselineRevenue: 0, baselineMargin: 0 },
  { id: 'pm-4', name: 'Late Night Dessert', code: 'SWEET3000', type: 'Fixed amount', value: 'Free dessert', status: 'Active', channel: 'Website', locations: ['Clifton Branch', 'Downtown Branch'], items: ['Molten Lava Cake', 'Brownie Sundae'], start: '15 Sep 2026', end: '31 Oct 2026', redemptions: 218, revenue: 142600, orders: 246, aov: 1892, margin: 52.6, newCustomers: 38, repeatRate: 61, wastage: 3.2, baselineRevenue: 128400, baselineMargin: 55.0 },
  { id: 'pm-5', name: 'Buy One Get One Pasta', code: 'PASTA2FOR1', type: 'Buy one get one', value: '2 for 1', status: 'Expired', channel: 'Delivery platform', locations: ['Downtown Branch'], items: ['Penne Arrabbiata', 'Spaghetti Bolognese'], start: '01 Aug 2026', end: '31 Aug 2026', redemptions: 624, revenue: 218400, orders: 692, aov: 892, margin: 18.6, newCustomers: 142, repeatRate: 21, wastage: 11.4, baselineRevenue: 246800, baselineMargin: 41.2 },
  { id: 'pm-6', name: 'Student Lunch Combo', code: 'STUDENT15', type: 'Percentage', value: '15% off', status: 'Scheduled', channel: 'Dine-in', locations: ['Gulshan Branch'], items: ['Crispy Chicken Deluxe', 'Mint Lime Cooler'], start: '05 Oct 2026', end: '05 Dec 2026', redemptions: 0, revenue: 0, orders: 0, aov: 0, margin: 0, newCustomers: 0, repeatRate: 0, wastage: 0, baselineRevenue: 0, baselineMargin: 0 },
]

export const PROMOTION_TRAPS = [
  { id: 'pt-1', severity: 'High', title: 'Sales increased, but profit decreased', body: 'Units sold for Fajita Chicken Pizza rose in the demo period while contribution margin fell from 66.0% to 64.4%.', metric: 'Margin −1.6 pts', tone: 'clay' },
  { id: 'pt-2', severity: 'High', title: 'Customer count increased, but margin declined', body: 'The 2-for-1 pasta offer grew order count while average contribution per order dropped sharply.', metric: 'AOV Rs. 892 (−18%)', tone: 'clay' },
  { id: 'pt-3', severity: 'Medium', title: 'Promotion increased wastage', body: 'Prepared quantity for promoted rice dishes exceeded consumption on four service days.', metric: 'Wastage 11.4%', tone: 'gold' },
  { id: 'pt-4', severity: 'Medium', title: 'Customers purchased mainly during discounts', body: 'Promotion-driven segment placed most orders while an offer was active, with limited full-price repurchase.', metric: 'Promo dependency 74%', tone: 'gold' },
  { id: 'pt-5', severity: 'Low', title: 'Sales shifted away from a more profitable item', body: 'Discounted pizza orders appear to have replaced higher-margin pasta orders in the demo basket data.', metric: 'Cannibalisation 12%', tone: 'sky' },
]

export const PROMOTION_COMPARISON = [
  { name: 'Wednesday Pizza Night', revenue: 486200, orders: 1140, aov: 1042, margin: 28.4 },
  { name: 'Burger & Fries Bundle', revenue: 298400, orders: 512, aov: 1284, margin: 41.2 },
  { name: 'Late Night Dessert', revenue: 142600, orders: 246, aov: 1892, margin: 52.6 },
  { name: 'Buy One Get One Pasta', revenue: 218400, orders: 692, aov: 892, margin: 18.6 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Ratings
// ─────────────────────────────────────────────────────────────────────────────
export const RATING_DISTRIBUTION = [
  { stars: '5 ★', count: 1842 }, { stars: '4 ★', count: 742 }, { stars: '3 ★', count: 286 },
  { stars: '2 ★', count: 96 }, { stars: '1 ★', count: 44 },
]

export const RATING_TREND = [
  { week: 'W1', rating: 4.4 }, { week: 'W2', rating: 4.5 }, { week: 'W3', rating: 4.4 },
  { week: 'W4', rating: 4.5 }, { week: 'W5', rating: 4.6 }, { week: 'W6', rating: 4.6 },
  { week: 'W7', rating: 4.7 }, { week: 'W8', rating: 4.6 },
]

export const RATING_BY_LOCATION = [
  { location: 'Clifton Branch', rating: 4.7, reviews: 1420 },
  { location: 'Downtown Branch', rating: 4.5, reviews: 986 },
  { location: 'Gulshan Branch', rating: 4.3, reviews: 748 },
]

export const ITEM_RATINGS = [
  { name: 'Maison Signature Smash', rating: 4.9, reviews: 728, sales: 742, margin: 65.0, img: '/img/hero-burger.jpg' },
  { name: 'Truffle Fettuccine Alfredo', rating: 4.9, reviews: 318, sales: 318, margin: 66.8, img: '/img/pasta.jpg' },
  { name: 'Molten Lava Cake', rating: 4.9, reviews: 421, sales: 388, margin: 73.5, img: '/img/dessert.jpg' },
  { name: 'Chicken Dum Biryani', rating: 4.8, reviews: 634, sales: 690, margin: 66.5, img: '/img/biryani.jpg' },
  { name: 'Woodfired Pepperoni', rating: 4.8, reviews: 512, sales: 412, margin: 65.4, img: '/img/pizza.jpg' },
  { name: 'Mango Lassi', rating: 4.8, reviews: 312, sales: 448, margin: 74.7, img: '/img/drink.jpg' },
  { name: 'Grilled Ribeye Steak', rating: 4.9, reviews: 246, sales: 84, margin: 52.1, img: '/img/steak.jpg' },
  { name: 'Stuffed Mushroom Caps', rating: 4.3, reviews: 96, sales: 92, margin: 68.8 },
]

export const REVIEW_ROWS = [
  { id: 'rr-1', customer: 'Ayesha Kamran', rating: 5, date: '3 days ago', item: 'Maison Signature Smash', location: 'Clifton Branch', channel: 'Dine-in', text: 'Best burger in Clifton right now. The ember sauce is genuinely addictive.', status: 'Published', sentiment: 'Positive', replied: true },
  { id: 'rr-2', customer: 'Sana Iqbal', rating: 4, date: '1 week ago', item: 'Truffle Fettuccine Alfredo', location: 'Clifton Branch', channel: 'Dine-in', text: 'Rich and comforting. Service was slow at peak hours but the food was worth the wait.', status: 'Published', sentiment: 'Neutral', replied: true },
  { id: 'rr-3', customer: 'Imran Yousuf', rating: 2, date: '1 week ago', item: 'Prawn Fried Rice', location: 'Gulshan Branch', channel: 'Delivery platform', text: 'Portion felt small for the price and the prawns were overcooked.', status: 'Needs response', sentiment: 'Negative', replied: false },
  { id: 'rr-4', customer: 'Hamza Raza', rating: 5, date: '2 weeks ago', item: 'Chicken Karahi', location: 'Gulshan Branch', channel: 'Delivery platform', text: 'Proper wok flavour, not the usual gravy. Naan stayed soft after delivery.', status: 'Published', sentiment: 'Positive', replied: false },
  { id: 'rr-5', customer: 'Nida Farooq', rating: 3, date: '2 weeks ago', item: 'Thai Basil Vegetable Rice', location: 'Downtown Branch', channel: 'Website', text: 'Good flavour but it arrived lukewarm. Packaging could be improved.', status: 'Needs response', sentiment: 'Negative', replied: false },
  { id: 'rr-6', customer: 'Bilal Ahmed', rating: 5, date: '3 weeks ago', item: 'Chicken Dum Biryani', location: 'Clifton Branch', channel: 'Takeaway', text: 'Huge portion, lovely saffron aroma. Packed really well for takeaway.', status: 'Published', sentiment: 'Positive', replied: true },
]

export const RATING_ANOMALIES = [
  { id: 'ra-1', kind: 'Sudden rating spike', item: 'Karak Chai', detail: 'Rating moved from 4.4 to 4.9 within two days on a small review base.', tone: 'gold', when: '18 Sep, 11:40 PM' },
  { id: 'ra-2', kind: 'Sudden rating drop', item: 'Prawn Fried Rice', detail: 'Three consecutive low ratings at Gulshan Branch on the same service day.', tone: 'clay', when: '17 Sep, 9:15 PM' },
  { id: 'ra-3', kind: 'Unusual rating pattern', item: 'Stuffed Mushroom Caps', detail: 'Ratings appear inconsistent with demo purchasing patterns for the item.', tone: 'sky', when: '15 Sep, 8:05 PM' },
  { id: 'ra-4', kind: 'Ratings inconsistent with sales', item: 'Grilled Ribeye Steak', detail: 'High rating with low units sold suggests a visibility or pricing issue.', tone: 'sage', when: '12 Sep, 7:50 PM' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Anomalies
// ─────────────────────────────────────────────────────────────────────────────
export type Anomaly = {
  id: string
  kind: string
  severity: 'High' | 'Medium' | 'Low'
  title: string
  detail: string
  item: string
  location: string
  when: string
  delta: string
  action: string
  reviewed: boolean
}

export const ANOMALIES: Anomaly[] = [
  { id: 'an-1', kind: 'Sales spike', severity: 'High', title: 'Unusual demand for Karak Chai', detail: 'Units sold were well above the illustrative forecast band for three consecutive evenings.', item: 'Karak Chai', location: 'Clifton Branch', when: '23 Sep, 10:40 PM', delta: '+184%', action: 'Review prep quantity for late-night service', reviewed: false },
  { id: 'an-2', kind: 'Sales drop', severity: 'High', title: 'Pizza sales dropped below expected range', detail: 'Pizza units fell outside the demo expected range during Friday peak service.', item: 'Fajita Chicken Pizza', location: 'Gulshan Branch', when: '22 Sep, 9:20 PM', delta: '−42%', action: 'Check oven availability and prep staffing', reviewed: false },
  { id: 'an-3', kind: 'High order value', severity: 'Medium', title: 'Unusually high order value', detail: 'A single dine-in order recorded an order value far above the branch average.', item: '—', location: 'Clifton Branch', when: '22 Sep, 8:05 PM', delta: '+320%', action: 'Verify order against the point-of-sale record', reviewed: false },
  { id: 'an-4', kind: 'Unusual discount', severity: 'Medium', title: 'Discount applied above configured limit', detail: 'An order combined two offers that are normally not combinable.', item: 'Woodfired Pepperoni', location: 'Downtown Branch', when: '21 Sep, 7:45 PM', delta: '−38%', action: 'Review offer combination rules', reviewed: true },
  { id: 'an-5', kind: 'Unexpected demand', severity: 'Low', title: 'Dessert demand above expected range', detail: 'Dessert units were above the demo expected range following a website banner.', item: 'Molten Lava Cake', location: 'Downtown Branch', when: '20 Sep, 11:10 PM', delta: '+61%', action: 'Confirm dessert prep for the weekend', reviewed: false },
  { id: 'an-6', kind: 'Duplicate transaction', severity: 'Low', title: 'Possible duplicate transaction', detail: 'Two orders with matching amount and items were recorded within 40 seconds.', item: '—', location: 'Gulshan Branch', when: '19 Sep, 6:30 PM', delta: 'Rs. 1,650', action: 'Confirm with the branch and void if duplicated', reviewed: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// Locations
// ─────────────────────────────────────────────────────────────────────────────
export type Location = {
  id: string
  name: string
  area: string
  manager: string
  revenue: number
  orders: number
  aov: number
  profit: number
  margin: number
  wastage: number
  rating: number
  repeat: number
  topItem: string
  staff: number
  seats: number
  opened: string
  trend: number
  img?: string
}

export const LOCATIONS: Location[] = [
  { id: 'loc-1', name: 'Clifton Branch', area: 'Block 7, Clifton, Karachi', manager: 'Rida Hussain', revenue: 562400, orders: 1812, aov: 1240, profit: 232800, margin: 41.4, wastage: 5.4, rating: 4.7, repeat: 46.2, topItem: 'Maison Signature Smash', staff: 34, seats: 78, opened: '2021', trend: 11.8, img: '/img/interior.jpg' },
  { id: 'loc-2', name: 'Downtown Branch', area: 'I. I. Chundrigar Road, Karachi', manager: 'Ahmed Faraz', revenue: 421800, orders: 1466, aov: 1120, profit: 158600, margin: 37.6, wastage: 7.9, rating: 4.5, repeat: 39.4, topItem: 'Woodfired Pepperoni', staff: 28, seats: 64, opened: '2022', trend: 6.2, img: '/img/interior.jpg' },
  { id: 'loc-3', name: 'Gulshan Branch', area: 'Block 4, Gulshan-e-Iqbal, Karachi', manager: 'Sana Yousuf', revenue: 264300, orders: 1008, aov: 1042, profit: 89500, margin: 33.9, wastage: 9.6, rating: 4.3, repeat: 34.8, topItem: 'Chicken Dum Biryani', staff: 22, seats: 52, opened: '2024', trend: -2.4, img: '/img/interior.jpg' },
]

export const LOCATION_TREND = [
  { month: 'Apr', clifton: 412, downtown: 318, gulshan: 186 },
  { month: 'May', clifton: 436, downtown: 331, gulshan: 204 },
  { month: 'Jun', clifton: 458, downtown: 348, gulshan: 226 },
  { month: 'Jul', clifton: 472, downtown: 356, gulshan: 241 },
  { month: 'Aug', clifton: 498, downtown: 372, gulshan: 249 },
  { month: 'Sep', clifton: 524, downtown: 388, gulshan: 256 },
]

export const LOCATION_MENU_CLASS = [
  { location: 'Clifton Branch', profit: 11, volume: 10, opportunity: 8, low: 9 },
  { location: 'Downtown Branch', profit: 8, volume: 12, opportunity: 7, low: 13 },
  { location: 'Gulshan Branch', profit: 6, volume: 9, opportunity: 5, low: 17 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────────────────────────────────────
export type Recommendation = {
  id: string
  category: 'Menu optimisation' | 'Pricing' | 'Promotions' | 'Inventory planning' | 'Wastage reduction' | 'Cross-selling' | 'Customer targeting' | 'Location'
  title: string
  description: string
  priority: 'High' | 'Medium' | 'Low'
  impact: string
  confidence: string
  metrics: { label: string; value: string }[]
  action: string
  tone: string
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rc-1', category: 'Menu optimisation', priority: 'High', tone: '#4A7139',
    title: 'Promote Pan-Seared Fish Fillet on the dinner menu',
    description: 'Strong rating and healthy margin with low order volume. Visibility is the likely constraint rather than recipe or price.',
    impact: 'Illustrative impact: +Rs. 42,000 monthly revenue', confidence: 'Illustrative',
    metrics: [{ label: 'Current units', value: '96' }, { label: 'Margin', value: '55.6%' }, { label: 'Rating', value: '4.7' }],
    action: 'Move to the "Chef picks" row on the website and dine-in menu',
  },
  {
    id: 'rc-2', category: 'Cross-selling', priority: 'High', tone: '#B54E17',
    title: 'Bundle the Signature Smash with truffle fries',
    description: 'The pair appears together far more often than items usually do. A fixed combo would simplify ordering and lift basket value.',
    impact: 'Illustrative impact: +Rs. 68,000 monthly revenue', confidence: 'Illustrative',
    metrics: [{ label: 'Lift', value: '3.42' }, { label: 'Confidence', value: '72.1%' }, { label: 'Support', value: '18.4%' }],
    action: 'Create a Rs. 1,480 combo and surface it in the cart drawer',
  },
  {
    id: 'rc-3', category: 'Wastage reduction', priority: 'High', tone: '#96352C',
    title: 'Reduce prep quantity for Thai Basil Vegetable Rice',
    description: 'Prepared quantity has exceeded consumption consistently. A lower default prep level would reduce waste without hurting availability.',
    impact: 'Illustrative impact: −Rs. 18,400 monthly waste cost', confidence: 'Illustrative',
    metrics: [{ label: 'Wastage', value: '13.6%' }, { label: 'Prepared', value: '86' }, { label: 'Consumed', value: '74' }],
    action: 'Set weekday prep to 70 units and review after two weeks',
  },
  {
    id: 'rc-4', category: 'Pricing', priority: 'Medium', tone: '#C08A16',
    title: 'Introduce a 220g ribeye portion',
    description: 'The current 280g portion shows the clearest price sensitivity in the demo set. A smaller portion may retain demand at a lower entry price.',
    impact: 'Illustrative impact: +14% units on the item', confidence: 'Illustrative',
    metrics: [{ label: 'Units after change', value: '84' }, { label: 'Change', value: '−22 units' }, { label: 'Sensitivity', value: 'High' }],
    action: 'Add a 220g option at Rs. 1,590 and compare for one month',
  },
  {
    id: 'rc-5', category: 'Promotions', priority: 'High', tone: '#96352C',
    title: 'Retire the 2-for-1 pasta structure',
    description: 'The offer grew order count but contribution margin dropped sharply. A smaller discount with a side item may protect margin.',
    impact: 'Illustrative impact: +9.4 pts contribution margin', confidence: 'Illustrative',
    metrics: [{ label: 'Margin during offer', value: '18.6%' }, { label: 'Baseline margin', value: '41.2%' }, { label: 'AOV', value: 'Rs. 892' }],
    action: 'Replace with a 15% pasta + drink bundle',
  },
  {
    id: 'rc-6', category: 'Inventory planning', priority: 'Medium', tone: '#2F6FA8',
    title: 'Raise reorder point for mozzarella',
    description: 'Stock is below the reorder threshold while pizza demand remains stable. Tightening the reorder point avoids a stockout at weekend peak.',
    impact: 'Illustrative impact: avoid 2 stockout days per month', confidence: 'Illustrative',
    metrics: [{ label: 'Stock', value: '28 kg' }, { label: 'Reorder at', value: '35 kg' }, { label: 'Daily use', value: '14 kg' }],
    action: 'Set reorder point to 45 kg with a two-day lead time',
  },
  {
    id: 'rc-7', category: 'Customer targeting', priority: 'Medium', tone: '#4A7139',
    title: 'Win back at-risk high spenders',
    description: 'A group of previously regular customers has not ordered recently despite above-average historical spend.',
    impact: 'Illustrative impact: +96 reactivated orders', confidence: 'Illustrative',
    metrics: [{ label: 'Customers', value: '486' }, { label: 'Avg spend', value: 'Rs. 1,873' }, { label: 'Avg gap', value: '61 days' }],
    action: 'Send a limited reactivation offer and track redemption for 30 days',
  },
  {
    id: 'rc-8', category: 'Location', priority: 'Medium', tone: '#726B62',
    title: 'Review Gulshan Branch menu mix',
    description: 'The branch carries the largest share of low-performing items and the highest wastage of the three locations.',
    impact: 'Illustrative impact: −2.2 pts branch wastage', confidence: 'Illustrative',
    metrics: [{ label: 'Low performers', value: '17 items' }, { label: 'Wastage', value: '9.6%' }, { label: 'Margin', value: '33.9%' }],
    action: 'Delist five items and test two Clifton bestsellers for one month',
  },
  {
    id: 'rc-9', category: 'Menu optimisation', priority: 'Low', tone: '#96352C',
    title: 'Rework or delist Stuffed Mushroom Caps',
    description: 'Low volume combined with high wastage makes this a candidate for recipe rework, repositioning or removal.',
    impact: 'Illustrative impact: −Rs. 6,800 monthly waste cost', confidence: 'Illustrative',
    metrics: [{ label: 'Units', value: '92' }, { label: 'Wastage', value: '11.2%' }, { label: 'Repeat', value: '14%' }],
    action: 'Move to made-to-order or remove from the printed menu',
  },
  {
    id: 'rc-10', category: 'Cross-selling', priority: 'Low', tone: '#C08A16',
    title: 'Suggest dessert at checkout for pasta orders',
    description: 'Pasta and dessert baskets are under-represented relative to burgers and pizza in the demo basket data.',
    impact: 'Illustrative impact: +Rs. 21,000 monthly revenue', confidence: 'Illustrative',
    metrics: [{ label: 'Pair lift', value: '1.72' }, { label: 'Confidence', value: '34.1%' }, { label: 'Basket share', value: '6.2%' }],
    action: 'Add a dessert upsell block to the cart page for pasta baskets',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────
export const REPORTS = [
  { id: 'rp-1', name: 'Menu Performance Report', desc: 'Item-level sales, margin, classification and trend for the selected period.', category: 'Menu', lastRun: 'Today, 7:00 AM', format: 'PDF', schedule: 'Weekly · Monday', tone: 'ember' },
  { id: 'rp-2', name: 'Sales Report', desc: 'Revenue, orders, average order value and channel split by day.', category: 'Sales', lastRun: 'Today, 7:05 AM', format: 'PDF', schedule: 'Daily', tone: 'sky' },
  { id: 'rp-3', name: 'Profitability Report', desc: 'Contribution margin by category, item and location.', category: 'Finance', lastRun: 'Yesterday, 11:30 PM', format: 'XLSX', schedule: 'Monthly', tone: 'sage' },
  { id: 'rp-4', name: 'Customer Report', desc: 'Segments, RFM distribution, repeat purchase and customer value.', category: 'Customers', lastRun: 'Mon, 6:00 AM', format: 'PDF', schedule: 'Weekly · Monday', tone: 'gold' },
  { id: 'rp-5', name: 'Wastage Report', desc: 'Wastage by category, item, location and service day.', category: 'Operations', lastRun: 'Today, 6:45 AM', format: 'PDF', schedule: 'Daily', tone: 'clay' },
  { id: 'rp-6', name: 'Promotion Report', desc: 'Redemptions, revenue impact, margin impact and promotion traps.', category: 'Marketing', lastRun: 'Sun, 11:00 PM', format: 'PDF', schedule: 'Weekly · Sunday', tone: 'ember' },
  { id: 'rp-7', name: 'Location Report', desc: 'Side-by-side comparison of all branches across the key metrics.', category: 'Operations', lastRun: 'Mon, 6:15 AM', format: 'XLSX', schedule: 'Weekly · Monday', tone: 'sky' },
  { id: 'rp-8', name: 'Forecast Report', desc: 'Illustrative demand forecast with accuracy indicators and prep guidance.', category: 'Planning', lastRun: 'Today, 5:30 AM', format: 'PDF', schedule: 'Daily', tone: 'sage' },
]

export const REPORT_PREVIEW_ROWS = [
  { item: 'Maison Signature Smash', units: 742, revenue: 853300, cost: 298284, margin: 555016, marginPct: 65.0 },
  { item: 'Chicken Dum Biryani', units: 690, revenue: 614100, cost: 205620, margin: 408480, marginPct: 66.5 },
  { item: 'Woodfired Pepperoni', units: 412, revenue: 679800, cost: 234840, margin: 444960, marginPct: 65.4 },
  { item: 'Truffle Fettuccine Alfredo', units: 318, revenue: 410220, cost: 136104, margin: 274116, marginPct: 66.8 },
  { item: 'Ember Buffalo Wings', units: 466, revenue: 363480, cost: 142130, margin: 221350, marginPct: 60.9 },
  { item: 'Molten Lava Cake', units: 388, revenue: 252200, cost: 66736, margin: 185464, marginPct: 73.5 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────
export const TEAM = [
  { id: 't-1', name: 'Zohaib Ansari', email: 'zohaib@maisonember.pk', role: 'Owner', locations: 'All branches', status: 'Active', lastActive: 'Just now' },
  { id: 't-2', name: 'Rida Hussain', email: 'rida@maisonember.pk', role: 'Branch Manager', locations: 'Clifton Branch', status: 'Active', lastActive: '12 min ago' },
  { id: 't-3', name: 'Ahmed Faraz', email: 'ahmed@maisonember.pk', role: 'Branch Manager', locations: 'Downtown Branch', status: 'Active', lastActive: '1 hr ago' },
  { id: 't-4', name: 'Sana Yousuf', email: 'sana@maisonember.pk', role: 'Operations Manager', locations: 'Gulshan Branch', status: 'Invited', lastActive: '—' },
  { id: 't-5', name: 'Faisal Mehmood', email: 'faisal@maisonember.pk', role: 'Analyst', locations: 'All branches', status: 'Active', lastActive: '3 hrs ago' },
]

export const ROLES = [
  { role: 'Owner', desc: 'Full access to every module, location and setting.', members: 1, permissions: ['All modules', 'Billing', 'User management'] },
  { role: 'Operations Manager', desc: 'Operational reporting, inventory, wastage and staffing.', members: 2, permissions: ['Orders', 'Inventory', 'Reports'] },
  { role: 'Branch Manager', desc: 'Single-branch performance, menu availability and staff.', members: 2, permissions: ['Own branch data', 'Menu availability'] },
  { role: 'Analyst', desc: 'Read-only analytics across all intelligence modules.', members: 1, permissions: ['Read-only analytics', 'Export'] },
]

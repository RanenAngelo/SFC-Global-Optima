/** Fictional storefront content: offers, reviews, addresses, demo orders. All values are UI placeholders. */

export type Offer = {
  id: string
  title: string
  subtitle: string
  code: string
  badge: string
  tone: 'ember' | 'sage' | 'gold' | 'sky'
  img?: string
  terms: string[]
  expires: string
}

export const OFFERS: Offer[] = [
  {
    id: 'off-1',
    title: '20% off on all pizzas',
    subtitle: 'Every stone-baked pizza, all day Wednesday. Dine-in and takeaway.',
    code: 'PIZZA20',
    badge: 'Today only',
    tone: 'ember',
    img: '/img/pizza.jpg',
    terms: ['Valid on 12" and 16" pizzas', 'Not combinable with other offers', 'Dine-in & takeaway'],
    expires: 'Valid until midnight today',
  },
  {
    id: 'off-2',
    title: 'Free fries with any burger',
    subtitle: 'Add a regular truffle parmesan fries basket to any burger order.',
    code: 'BURGERFRIES',
    badge: 'Popular',
    tone: 'gold',
    img: '/img/hero-burger.jpg',
    terms: ['One free basket per burger', 'Regular size only', 'Website & app orders'],
    expires: 'Valid until 30 Sep',
  },
  {
    id: 'off-3',
    title: 'Family biryani bundle',
    subtitle: 'Family biryani, raita, salad and a 1.5L drink at a bundled price.',
    code: 'FAMILYBIRYANI',
    badge: 'Bundle',
    tone: 'sage',
    img: '/img/biryani.jpg',
    terms: ['Serves 3 – 4 people', 'Available after 6 pm', 'Selected branches'],
    expires: 'Valid until 15 Oct',
  },
  {
    id: 'off-4',
    title: 'Dessert on the house',
    subtitle: 'Complimentary molten lava cake on orders above Rs. 3,000.',
    code: 'SWEET3000',
    badge: 'Limited',
    tone: 'sky',
    img: '/img/dessert.jpg',
    terms: ['Minimum order Rs. 3,000', 'One per order', 'While stocks last'],
    expires: 'Valid until 31 Oct',
  },
]

export type Review = {
  id: string
  name: string
  role: string
  rating: number
  date: string
  text: string
  dish: string
  avatarTone: string
  helpful: number
  reply?: string
}

export const REVIEWS: Review[] = [
  {
    id: 'rv-1',
    name: 'Ayesha Kamran',
    role: 'Food blogger · Karachi',
    rating: 5,
    date: '3 days ago',
    text: 'The signature smash is easily the best burger in Clifton right now. Perfect crust on the patty, and the ember sauce is addictive.',
    dish: 'Maison Signature Smash',
    avatarTone: '#B54E17',
    helpful: 84,
    reply: 'Thank you Ayesha — the smash is our pride and joy. See you again soon!',
  },
  {
    id: 'rv-2',
    name: 'Bilal Ahmed',
    role: 'Regular guest',
    rating: 5,
    date: '1 week ago',
    text: 'Ordered the dum biryani for a family dinner. Huge portion, lovely saffron aroma and it arrived hot. Packaging was excellent.',
    dish: 'Chicken Dum Biryani',
    avatarTone: '#4A7139',
    helpful: 61,
  },
  {
    id: 'rv-3',
    name: 'Sana Iqbal',
    role: 'Verified dine-in',
    rating: 4,
    date: '1 week ago',
    text: 'Beautiful space and the truffle fettuccine was rich and comforting. Service was a little slow at peak hours but worth the wait.',
    dish: 'Truffle Fettuccine Alfredo',
    avatarTone: '#C08A16',
    helpful: 37,
    reply: 'We appreciate the note on peak-hour service — we have added two more floor staff for Friday evenings.',
  },
  {
    id: 'rv-4',
    name: 'Hamza Raza',
    role: 'Delivery guest',
    rating: 5,
    date: '2 weeks ago',
    text: 'Chicken karahi was spot on — proper wok flavour, not the usual gravy. Naan stayed soft even after delivery.',
    dish: 'Chicken Karahi',
    avatarTone: '#2F6FA8',
    helpful: 52,
  },
  {
    id: 'rv-5',
    name: 'Mehwish Tariq',
    role: 'Verified dine-in',
    rating: 5,
    date: '3 weeks ago',
    text: 'Brought friends from out of town. The woodfired pepperoni pizza and molten lava cake were both outstanding. Lovely ambience.',
    dish: 'Woodfired Pepperoni',
    avatarTone: '#96352C',
    helpful: 45,
  },
]

export type Address = {
  id: string
  label: string
  name: string
  phone: string
  line1: string
  area: string
  city: string
  instructions?: string
  isDefault?: boolean
}

export const ADDRESSES: Address[] = [
  {
    id: 'ad-1',
    label: 'Home',
    name: 'Zara Mehdi',
    phone: '+92 300 1234567',
    line1: 'Apartment 4B, Silk Residences, Block 7',
    area: 'Clifton',
    city: 'Karachi',
    instructions: 'Ring the bell twice — the buzzer is quiet.',
    isDefault: true,
  },
  {
    id: 'ad-2',
    label: 'Office',
    name: 'Zara Mehdi',
    phone: '+92 300 1234567',
    line1: 'Level 6, Ember Tower, Shahrah-e-Faisal',
    area: 'PECHS',
    city: 'Karachi',
    instructions: 'Reception will collect the order.',
  },
]

export type SavedCard = {
  id: string
  brand: string
  last4: string
  expiry: string
  holder: string
  isDefault?: boolean
}

export const SAVED_CARDS: SavedCard[] = [
  { id: 'card-1', brand: 'Visa', last4: '4242', expiry: '08/28', holder: 'Zara Mehdi', isDefault: true },
  { id: 'card-2', brand: 'Mastercard', last4: '8891', expiry: '02/27', holder: 'Zara Mehdi' },
]

export type Wallet = { id: string; name: string; number: string; balance: string; tone: string }
export const WALLETS: Wallet[] = [
  { id: 'w-1', name: 'JazzCash', number: '+92 300 ••• 567', balance: 'Rs. 4,280', tone: '#96352C' },
  { id: 'w-2', name: 'Easypaisa', number: '+92 321 ••• 210', balance: 'Rs. 1,950', tone: '#4A7139' },
  { id: 'w-3', name: 'NayaPay', number: '+92 333 ••• 884', balance: 'Rs. 860', tone: '#245A8A' },
]

export type CustomerOrderItem = { name: string; qty: number; price: number; img?: string }

export type CustomerOrder = {
  id: string
  number: string
  placedAt: string
  date: string
  status: 'Delivered' | 'Preparing' | 'Out for delivery' | 'Cancelled' | 'Ready'
  channel: 'Delivery' | 'Pickup' | 'Dine-in'
  total: number
  items: CustomerOrderItem[]
  address?: string
  etaMinutes?: number
  payment: string
  courier?: { name: string; phone: string; vehicle: string }
  progress: number
}

export const CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: 'co-1',
    number: 'ME-24815',
    placedAt: 'Today, 8:12 PM',
    date: '24 Sep 2026',
    status: 'Out for delivery',
    channel: 'Delivery',
    total: 3420,
    etaMinutes: 14,
    address: 'Apartment 4B, Silk Residences, Block 7, Clifton, Karachi',
    payment: 'Paid · Visa •••• 4242',
    courier: { name: 'Usman Ali', phone: '+92 311 4455667', vehicle: 'Honda 125 · KAR-8842' },
    progress: 5,
    items: [
      { name: 'Maison Signature Smash', qty: 2, price: 1150, img: '/img/hero-burger.jpg' },
      { name: 'Truffle Parmesan Fries', qty: 1, price: 420 },
      { name: 'Mint Lime Cooler', qty: 2, price: 320, img: '/img/drink.jpg' },
    ],
  },
  {
    id: 'co-2',
    number: 'ME-24601',
    placedAt: '21 Sep, 1:05 PM',
    date: '21 Sep 2026',
    status: 'Delivered',
    channel: 'Dine-in',
    total: 2870,
    address: 'Clifton Branch · Table 12',
    payment: 'Paid · Cash',
    progress: 6,
    items: [
      { name: 'Chicken Dum Biryani', qty: 2, price: 890, img: '/img/biryani.jpg' },
      { name: 'Mango Lassi', qty: 2, price: 380, img: '/img/drink.jpg' },
      { name: 'Gulab Jamun with Ice Cream', qty: 1, price: 480 },
    ],
  },
  {
    id: 'co-3',
    number: 'ME-24337',
    placedAt: '17 Sep, 7:48 PM',
    date: '17 Sep 2026',
    status: 'Delivered',
    channel: 'Delivery',
    total: 4290,
    address: 'Apartment 4B, Silk Residences, Block 7, Clifton, Karachi',
    payment: 'Paid · JazzCash',
    progress: 6,
    items: [
      { name: 'Woodfired Pepperoni', qty: 1, price: 1650, img: '/img/pizza.jpg' },
      { name: 'Ember Buffalo Wings', qty: 1, price: 780, img: '/img/wings.jpg' },
      { name: 'Tiramisu Classico', qty: 1, price: 720, img: '/img/dessert.jpg' },
      { name: 'Iced Spanish Latte', qty: 2, price: 520, img: '/img/drink.jpg' },
    ],
  },
  {
    id: 'co-4',
    number: 'ME-24102',
    placedAt: '11 Sep, 9:30 PM',
    date: '11 Sep 2026',
    status: 'Cancelled',
    channel: 'Pickup',
    total: 1150,
    address: 'Clifton Branch · Pickup counter',
    payment: 'Refunded · Visa •••• 4242',
    progress: 2,
    items: [{ name: 'Maison Signature Smash', qty: 1, price: 1150, img: '/img/hero-burger.jpg' }],
  },
]

export const ORDER_STEPS = ['Order received', 'Confirmed', 'Preparing', 'Ready', 'Out for delivery', 'Delivered'] as const

export const PICKUP_STEPS = ['Order received', 'Confirmed', 'Preparing', 'Ready for pickup', 'Collected'] as const

export type Notification = {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  kind: 'order' | 'offer' | 'account'
}

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    title: 'Your rider is 5 minutes away',
    body: 'Usman Ali is approaching Silk Residences with order ME-24815.',
    time: '2 min ago',
    read: false,
    kind: 'order',
  },
  {
    id: 'n-2',
    title: 'New offer just for you',
    body: 'Get 20% off all stone-baked pizzas today with code PIZZA20.',
    time: '3 hours ago',
    read: false,
    kind: 'offer',
  },
  {
    id: 'n-3',
    title: 'Your review was published',
    body: 'Thanks for reviewing Maison Signature Smash. It is now live on the menu.',
    time: '2 days ago',
    read: true,
    kind: 'account',
  },
  {
    id: 'n-4',
    title: 'Loyalty points updated',
    body: 'You earned 120 points from order ME-24601. Balance: 1,340 points.',
    time: '3 days ago',
    read: true,
    kind: 'account',
  },
]

export const STORE_BRANCHES = [
  { id: 'br-1', name: 'Clifton Branch', area: 'Block 7, Clifton', hours: '11:00 AM – 11:30 PM', distance: '1.2 km', open: true },
  { id: 'br-2', name: 'Downtown Branch', area: 'I. I. Chundrigar Road', hours: '12:00 PM – 11:00 PM', distance: '4.8 km', open: true },
  { id: 'br-3', name: 'Gulshan Branch', area: 'Block 4, Gulshan-e-Iqbal', hours: '12:30 PM – 12:00 AM', distance: '9.3 km', open: false },
]

export const OPENING_HOURS = [
  { day: 'Monday – Thursday', hours: '11:00 AM – 11:00 PM' },
  { day: 'Friday', hours: '11:00 AM – 12:30 AM' },
  { day: 'Saturday', hours: '10:30 AM – 12:30 AM' },
  { day: 'Sunday', hours: '10:30 AM – 11:30 PM' },
]

export const SPECIALTIES = [
  {
    title: 'Charcoal & Cast Iron',
    body: 'Live fire cooking across our grill and wok sections, finished to order.',
    icon: '🔥',
  },
  {
    title: '48-Hour Dough',
    body: 'Every pizza base is cold-fermented for two days before it meets the oven.',
    icon: '🍕',
  },
  {
    title: 'Rolled Fresh Daily',
    body: 'Pasta is extruded and rolled each morning in the open kitchen.',
    icon: '🍝',
  },
  {
    title: 'Local Produce',
    body: 'Vegetables and dairy sourced from Sindh farms and Karachi suppliers.',
    icon: '🌾',
  },
]

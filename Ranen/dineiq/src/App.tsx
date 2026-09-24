import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import StoreLayout from './layouts/StoreLayout'
import Home from './pages/store/Home'
import MenuPage from './pages/store/MenuPage'
import ItemDetail from './pages/store/ItemDetail'
import CartPage from './pages/store/CartPage'
import Checkout from './pages/store/Checkout'
import OrderConfirmation from './pages/store/OrderConfirmation'
import OrderTracking from './pages/store/OrderTracking'
import Account from './pages/store/Account'
import {
  AccountAddresses,
  AccountFavourites,
  AccountNotifications,
  AccountOrderDetails,
  AccountOrders,
  AccountPayments,
  AccountPreferences,
  AccountProfile,
} from './pages/store/accountPages'
import { AboutPage, ContactPage, OffersPage } from './pages/store/StaticPages'

import AdminLayout from './layouts/AdminLayout'
import Login from './pages/admin/Login'
import Comparison from './pages/admin/Comparison'
import WhatIf from './pages/admin/WhatIf'
import { RequireAuth } from './lib/api'
import Overview from './pages/admin/Overview'
import Orders from './pages/admin/Orders'
import MenuManagement from './pages/admin/MenuManagement'
import MenuIntelligence from './pages/admin/MenuIntelligence'
import Customers from './pages/admin/Customers'
import MarketBasket from './pages/admin/MarketBasket'
import Forecasting from './pages/admin/Forecasting'
import Inventory from './pages/admin/Inventory'
import Pricing from './pages/admin/Pricing'
import Promotions from './pages/admin/Promotions'
import Ratings from './pages/admin/Ratings'
import Anomalies from './pages/admin/Anomalies'
import Locations, { LocationDetail } from './pages/admin/Locations'
import Recommendations from './pages/admin/Recommendations'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* ── Customer-facing restaurant store ───────────────────────── */}
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/menu/:slug" element={<ItemDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmed/:number" element={<OrderConfirmation />} />
        <Route path="/track/:number" element={<OrderTracking />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/account" element={<Account />}>
          <Route index element={<AccountProfile />} />
          <Route path="orders" element={<AccountOrders />} />
          <Route path="orders/:number" element={<AccountOrderDetails />} />
          <Route path="addresses" element={<AccountAddresses />} />
          <Route path="favourites" element={<AccountFavourites />} />
          <Route path="payments" element={<AccountPayments />} />
          <Route path="notifications" element={<AccountNotifications />} />
          <Route path="preferences" element={<AccountPreferences />} />
        </Route>
      </Route>

      <Route path="/login" element={<Login />} />

      {/* ── Restaurant owner / admin dashboard ─────────────────────── */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="orders" element={<Orders />} />
        <Route path="menu" element={<MenuManagement />} />
        <Route path="menu-intelligence" element={<MenuIntelligence />} />
        <Route path="customers" element={<Customers />} />
        <Route path="market-basket" element={<MarketBasket />} />
        <Route path="forecasting" element={<Forecasting />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="ratings" element={<Ratings />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="locations" element={<Locations />} />
        <Route path="locations/:id" element={<LocationDetail />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="comparison" element={<Comparison />} />
        <Route path="what-if" element={<WhatIf />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}

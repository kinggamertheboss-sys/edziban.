'use client'

import { useMemo, useState, useEffect } from 'react'
import type { MockOrder } from '@/lib/mockData'
import { formatCurrency } from '@/lib/utils'

const EXPENSE_CATEGORIES = ['Supplies', 'Packaging', 'Gas / Transport', 'Marketing', 'Equipment', 'Other'] as const
type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

interface Expense {
  id: string
  date: string
  description: string
  amount: number
  category: ExpenseCategory
}

const D = {
  bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)',
  text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface PaidPayout {
  orderId: string
  supplierId: string
  amount: number
  paidAt: string
  method: string
}

interface FinancialsProps {
  orders: MockOrder[]
  paidPayouts: PaidPayout[]
}

function Row({ label, value, bold, indent, accent, divider }: {
  label: string; value: string; bold?: boolean; indent?: boolean; accent?: boolean; divider?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: divider ? '10px 0 0' : '7px 0',
      borderTop: divider ? `1px solid rgba(255,255,255,0.1)` : 'none',
    }}>
      <span style={{
        fontSize: bold ? '13px' : '12.5px',
        fontWeight: bold ? 700 : 400,
        color: indent ? D.muted : D.text,
        paddingLeft: indent ? '16px' : 0,
      }}>{label}</span>
      <span style={{
        fontSize: bold ? '14px' : '13px',
        fontWeight: bold ? 700 : 500,
        color: accent ? '#C4622D' : bold ? D.text : D.muted,
        fontFamily: 'var(--font-playfair), Georgia, serif',
      }}>{value}</span>
    </div>
  )
}

function SectionHead({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: '#C4622D', marginTop: '20px', marginBottom: '4px',
    }}>{label}</p>
  )
}

export default function Financials({ orders, paidPayouts }: FinancialsProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear]   = useState(now.getFullYear())

  // ── Bank & Expenses (localStorage) ─────────────────────────────────────
  const [bankBalance, setBankBalance] = useState<string>('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expForm, setExpForm] = useState({ date: now.toISOString().split('T')[0], description: '', amount: '', category: 'Supplies' as ExpenseCategory })
  const [showExpForm, setShowExpForm] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('edziban_bank_balance')
    if (saved) setBankBalance(saved)
    const savedExp = localStorage.getItem('edziban_expenses')
    if (savedExp) try { setExpenses(JSON.parse(savedExp)) } catch { /* ignore */ }
  }, [])

  function saveBankBalance(val: string) {
    setBankBalance(val)
    localStorage.setItem('edziban_bank_balance', val)
  }

  function addExpense() {
    if (!expForm.description.trim() || !expForm.amount || !expForm.date) return
    const entry: Expense = { id: Date.now().toString(), date: expForm.date, description: expForm.description.trim(), amount: parseFloat(expForm.amount), category: expForm.category }
    const next = [entry, ...expenses]
    setExpenses(next)
    localStorage.setItem('edziban_expenses', JSON.stringify(next))
    setExpForm({ date: now.toISOString().split('T')[0], description: '', amount: '', category: 'Supplies' })
    setShowExpForm(false)
  }

  function deleteExpense(id: string) {
    const next = expenses.filter(e => e.id !== id)
    setExpenses(next)
    localStorage.setItem('edziban_expenses', JSON.stringify(next))
  }

  // Available years from order data
  const years = useMemo(() => {
    const ys = new Set<number>([now.getFullYear()])
    orders.forEach(o => ys.add(new Date(o.createdAt).getFullYear()))
    return Array.from(ys).sort((a, b) => b - a)
  }, [orders, now])

  // ── Period filter helpers ───────────────────────────────────────────────

  function inPeriod(dateStr: string): boolean {
    const d = new Date(dateStr)
    return d.getFullYear() === year && d.getMonth() === month
  }

  function onOrBeforePeriod(dateStr: string): boolean {
    const d = new Date(dateStr)
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59)
    return d <= periodEnd
  }

  // ── Income Statement ────────────────────────────────────────────────────

  const periodOrders = useMemo(() =>
    orders.filter(o => inPeriod(o.createdAt) && o.status !== 'cancelled'),
  [orders, month, year])

  const subtotalRevenue    = periodOrders.reduce((s, o) => s + o.subtotal, 0)
  const deliveryRevenue    = periodOrders.reduce((s, o) => s + o.deliveryFee, 0)
  const serviceFees        = periodOrders.reduce((s, o) => s + o.serviceFee, 0)
  const totalGrossRevenue  = subtotalRevenue + deliveryRevenue + serviceFees
  const supplierCosts      = periodOrders.reduce((s, o) => s + o.supplierPayouts.reduce((ss, p) => ss + p.amount, 0), 0)
  const totalCOGS          = supplierCosts + serviceFees
  const grossProfit        = totalGrossRevenue - totalCOGS

  // Period expenses from manual log
  const periodExpenses     = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const totalOpExpenses    = periodExpenses.reduce((s, e) => s + e.amount, 0)
  const netIncome          = grossProfit - totalOpExpenses
  const grossMarginPct     = totalGrossRevenue > 0 ? ((grossProfit / totalGrossRevenue) * 100).toFixed(1) : '0.0'
  const orderCount         = periodOrders.length

  // ── Balance Sheet (cumulative through end of period) ───────────────────

  const cumulativeOrders = useMemo(() =>
    orders.filter(o => onOrBeforePeriod(o.createdAt) && o.status !== 'cancelled'),
  [orders, month, year])

  // Cash: from delivered/reviewed orders
  const cashCollected = cumulativeOrders
    .filter(o => ['delivered', 'reviewed'].includes(o.status))
    .reduce((s, o) => s + o.total, 0)

  // Receivables: active orders not yet delivered
  const receivables = cumulativeOrders
    .filter(o => !['delivered', 'reviewed'].includes(o.status))
    .reduce((s, o) => s + o.total, 0)

  const totalAssets = cashCollected + receivables

  // Supplier AP: amounts owed - amounts paid
  const totalOwedToSuppliers = cumulativeOrders
    .reduce((s, o) => s + o.supplierPayouts.reduce((ss, p) => ss + p.amount, 0), 0)

  const totalPaidToSuppliers = paidPayouts
    .filter(p => {
      // paidAt is e.g. "Jun 10, 2026" — parse it
      try {
        return onOrBeforePeriod(new Date(p.paidAt).toISOString())
      } catch { return true }
    })
    .reduce((s, p) => s + p.amount, 0)

  const supplierAP    = Math.max(0, totalOwedToSuppliers - totalPaidToSuppliers)
  const totalLiab     = supplierAP
  const ownerEquity   = totalAssets - totalLiab
  const totalLiabEquity = totalLiab + ownerEquity

  // ── YTD totals ─────────────────────────────────────────────────────────

  const ytdOrders = orders.filter(o => {
    const d = new Date(o.createdAt)
    return d.getFullYear() === year && o.status !== 'cancelled'
  })
  const ytdRevenue = ytdOrders.reduce((s, o) => s + o.total, 0)
  const ytdIncome  = ytdOrders.reduce((s, o) => s + o.commission, 0)

  // ── Cash Flow Statement ────────────────────────────────────────────────

  const cfCashIn = periodOrders
    .filter(o => ['delivered', 'reviewed'].includes(o.status))
    .reduce((s, o) => s + o.total, 0)

  const cfPaidSuppliers = paidPayouts
    .filter(p => {
      try { return inPeriod(new Date(p.paidAt).toISOString()) } catch { return false }
    })
    .reduce((s, p) => s + p.amount, 0)

  const cfServiceFees = periodOrders
    .filter(o => ['delivered', 'reviewed'].includes(o.status))
    .reduce((s, o) => s + o.serviceFee, 0)

  const cfNetOperating = cfCashIn - cfPaidSuppliers - cfServiceFees

  // ── Print ───────────────────────────────────────────────────────────────

  function handlePrint() {
    const periodLabel = `${MONTHS[month]} ${year}`
    const generated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Edziban Financial Statements — ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; color: #1A0A04; background: #fff; padding: 48px; font-size: 12px; line-height: 1.6; }
  h1 { font-size: 26px; font-weight: 700; color: #C4622D; letter-spacing: -0.02em; }
  h2 { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #1A0A04; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 3px solid #C4622D; }
  .header-meta { text-align: right; font-size: 11px; color: #666; }
  .statement { margin-bottom: 44px; page-break-inside: avoid; }
  .statement-title { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #C4622D; border-bottom: 1px solid #C4622D; padding-bottom: 6px; margin-bottom: 16px; }
  .section-head { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-top: 16px; margin-bottom: 4px; }
  .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #eee; }
  .row.indent { padding-left: 20px; color: #444; }
  .row.bold { font-weight: 700; color: #1A0A04; border-bottom: 2px solid #1A0A04; }
  .row.accent { font-weight: 700; color: #C4622D; font-size: 14px; border-bottom: 2px solid #C4622D; }
  .row.divider { border-top: 2px solid #1A0A04; margin-top: 6px; padding-top: 8px; font-weight: 700; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
  .note { font-size: 10px; color: #888; font-style: italic; margin-top: 8px; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
  @page { margin: 0.75in; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Edziban</h1>
    <p style="font-size:13px;color:#666;margin-top:4px;">Ghanaian Catering &amp; Events</p>
  </div>
  <div class="header-meta">
    <p><strong>Financial Statements</strong></p>
    <p>Period: ${periodLabel}</p>
    <p>Generated: ${generated}</p>
  </div>
</div>

<!-- INCOME STATEMENT -->
<div class="statement">
  <div class="statement-title">Income Statement (Profit &amp; Loss)</div>
  <p style="font-size:11px;color:#666;margin-bottom:12px;">For the month ended ${MONTHS[month]} ${year} &nbsp;·&nbsp; ${orderCount} order${orderCount !== 1 ? 's' : ''}</p>

  <div class="section-head">Revenue</div>
  <div class="row indent"><span>Food Sales</span><span>${formatCurrency(subtotalRevenue)}</span></div>
  <div class="row indent"><span>Delivery Fees</span><span>${formatCurrency(deliveryRevenue)}</span></div>
  <div class="row indent"><span>Service Fees Collected</span><span>${formatCurrency(serviceFees)}</span></div>
  <div class="row bold"><span>Total Revenue</span><span>${formatCurrency(totalGrossRevenue)}</span></div>

  <div class="section-head">Cost of Goods Sold</div>
  <div class="row indent"><span>Supplier Costs</span><span>(${formatCurrency(supplierCosts)})</span></div>
  <div class="row indent"><span>Square Service Fees</span><span>(${formatCurrency(serviceFees)})</span></div>
  <div class="row bold"><span>Total COGS</span><span>(${formatCurrency(totalCOGS)})</span></div>

  <div class="row divider"><span>Gross Profit</span><span>${formatCurrency(grossProfit)}</span></div>
  <p class="note">Gross Margin: ${grossMarginPct}%</p>

  <div class="section-head">Operating Expenses</div>
  <div class="row indent"><span>Other Operating Expenses</span><span>$0.00</span></div>

  <div class="row accent" style="margin-top:12px;"><span>Net Income</span><span>${formatCurrency(netIncome)}</span></div>
</div>

<!-- BALANCE SHEET -->
<div class="statement">
  <div class="statement-title">Balance Sheet</div>
  <p style="font-size:11px;color:#666;margin-bottom:12px;">As of ${MONTHS[month]} ${year === now.getFullYear() && month === now.getMonth() ? now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `${String(new Date(year, month + 1, 0).getDate())} ${MONTHS[month]} ${year}`}</p>

  <div class="two-col">
    <div>
      <div class="section-head">Assets</div>
      <div class="row indent"><span>Cash Collected</span><span>${formatCurrency(cashCollected)}</span></div>
      <div class="row indent"><span>Accounts Receivable</span><span>${formatCurrency(receivables)}</span></div>
      <div class="row bold"><span>Total Assets</span><span>${formatCurrency(totalAssets)}</span></div>
    </div>
    <div>
      <div class="section-head">Liabilities</div>
      <div class="row indent"><span>Supplier Payments Due</span><span>${formatCurrency(supplierAP)}</span></div>
      <div class="row bold"><span>Total Liabilities</span><span>${formatCurrency(totalLiab)}</span></div>

      <div class="section-head" style="margin-top:20px;">Owner's Equity</div>
      <div class="row indent"><span>Retained Earnings</span><span>${formatCurrency(ownerEquity)}</span></div>
      <div class="row bold"><span>Total Equity</span><span>${formatCurrency(ownerEquity)}</span></div>

      <div class="row divider"><span>Total Liabilities + Equity</span><span>${formatCurrency(totalLiabEquity)}</span></div>
    </div>
  </div>
  <p class="note">Cash basis accounting. Accounts Receivable represents confirmed orders not yet delivered.</p>
</div>

<!-- CASH FLOW STATEMENT -->
<div class="statement">
  <div class="statement-title">Statement of Cash Flows</div>
  <p style="font-size:11px;color:#666;margin-bottom:12px;">For the month ended ${MONTHS[month]} ${year}</p>

  <div class="section-head">Operating Activities</div>
  <div class="row indent"><span>Cash collected from customers</span><span>${formatCurrency(cfCashIn)}</span></div>
  <div class="row indent"><span>Paid to suppliers</span><span>(${formatCurrency(cfPaidSuppliers)})</span></div>
  <div class="row indent"><span>Square service fees paid</span><span>(${formatCurrency(cfServiceFees)})</span></div>
  <div class="row divider" style="margin-top:8px;"><span>Net Cash from Operations</span><span style="color:${cfNetOperating >= 0 ? '#16a34a' : '#dc2626'}">${formatCurrency(cfNetOperating)}</span></div>

  <div class="section-head" style="margin-top:16px;">Investing Activities</div>
  <div class="row indent"><span>No investing activities</span><span>$0.00</span></div>

  <div class="section-head" style="margin-top:16px;">Financing Activities</div>
  <div class="row indent"><span>No financing activities</span><span>$0.00</span></div>

  <p class="note">Cash basis. Only delivered/reviewed orders counted as received cash. Connect your bank account to reconcile actual deposits.</p>
</div>

<!-- YTD SUMMARY -->
<div class="statement">
  <div class="statement-title">Year-to-Date Summary (${year})</div>
  <div class="row indent"><span>Total Revenue</span><span>${formatCurrency(ytdRevenue)}</span></div>
  <div class="row indent"><span>Net Income (Commission)</span><span>${formatCurrency(ytdIncome)}</span></div>
  <div class="row indent"><span>Total Orders</span><span>${ytdOrders.length}</span></div>
</div>

<div class="footer">
  <span>Edziban · Confidential Financial Statements</span>
  <span>Prepared ${generated} · Cash Basis Accounting</span>
</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Period selector + Print */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: D.text, marginBottom: '4px' }}>Financial Statements</p>
          <p style={{ fontSize: '12px', color: D.muted }}>Cash basis · Updates automatically as orders come in</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '9px 14px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.card, color: D.text, fontSize: '13px', cursor: 'pointer', outline: 'none' }}
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '9px 14px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.card, color: D.text, fontSize: '13px', cursor: 'pointer', outline: 'none' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handlePrint}
            style={{
              fontSize: '13px', fontWeight: 700, padding: '10px 22px', borderRadius: '100px',
              border: 'none', background: '#C4622D', color: '#FFF8F0', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(196,98,45,0.3)', display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print All Statements
          </button>
        </div>
      </div>

      {/* Period note */}
      <div style={{ background: 'rgba(196,98,45,0.06)', border: '1px solid rgba(196,98,45,0.15)', borderRadius: '12px', padding: '12px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ fontSize: '13px', color: D.muted }}>
          Showing data for <strong style={{ color: D.text }}>{MONTHS[month]} {year}</strong> · {orderCount} order{orderCount !== 1 ? 's' : ''}
        </p>
        <p style={{ fontSize: '11px', color: D.faint }}>
          YTD {year}: {formatCurrency(ytdRevenue)} revenue · {formatCurrency(ytdIncome)} net income
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

        {/* ── INCOME STATEMENT ─────────────────────────────────────────── */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4622D', marginBottom: '4px' }}>Income Statement</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: D.text, fontFamily: 'var(--font-playfair), Georgia, serif' }}>Profit &amp; Loss</p>
            <p style={{ fontSize: '12px', color: D.muted, marginTop: '2px' }}>Month ended {MONTHS[month]} {year}</p>
          </div>

          <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: '16px' }}>
            <SectionHead label="Revenue" />
            <Row label="Food Sales" value={formatCurrency(subtotalRevenue)} indent />
            <Row label="Delivery Fees" value={formatCurrency(deliveryRevenue)} indent />
            <Row label="Service Fees Collected" value={formatCurrency(serviceFees)} indent />
            <Row label="Total Revenue" value={formatCurrency(totalGrossRevenue)} bold divider />

            <SectionHead label="Cost of Goods Sold" />
            <Row label="Supplier Costs" value={`(${formatCurrency(supplierCosts)})`} indent />
            <Row label="Square Service Fees" value={`(${formatCurrency(serviceFees)})`} indent />
            <Row label="Total COGS" value={`(${formatCurrency(totalCOGS)})`} bold divider />

            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(196,98,45,0.07)', borderRadius: '12px' }}>
              <Row label="Gross Profit" value={formatCurrency(grossProfit)} bold accent />
              <p style={{ fontSize: '11px', color: D.faint, marginTop: '6px' }}>Gross margin: {grossMarginPct}%</p>
            </div>

            <SectionHead label="Operating Expenses" />
            {periodExpenses.length === 0
              ? <Row label="No expenses logged this month" value="$0.00" indent />
              : periodExpenses.map(e => <Row key={e.id} label={`${e.category} — ${e.description}`} value={`(${formatCurrency(e.amount)})`} indent />)
            }
            <Row label="Total Operating Expenses" value={`(${formatCurrency(totalOpExpenses)})`} bold divider />

            <div style={{ marginTop: '16px', padding: '16px', background: netIncome >= 0 ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', borderRadius: '12px', border: `1px solid ${netIncome >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
              <Row label="Net Income" value={formatCurrency(netIncome)} bold />
            </div>
          </div>
        </div>

        {/* ── BALANCE SHEET ─────────────────────────────────────────────── */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4622D', marginBottom: '4px' }}>Balance Sheet</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: D.text, fontFamily: 'var(--font-playfair), Georgia, serif' }}>Financial Position</p>
            <p style={{ fontSize: '12px', color: D.muted, marginTop: '2px' }}>As of {MONTHS[month]} {year}</p>
          </div>

          <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: '16px' }}>
            <SectionHead label="Assets" />
            <Row label="Cash Collected" value={formatCurrency(cashCollected)} indent />
            <Row label="Accounts Receivable" value={formatCurrency(receivables)} indent />
            <Row label="Total Assets" value={formatCurrency(totalAssets)} bold divider />

            <SectionHead label="Liabilities" />
            <Row label="Supplier Payments Due" value={formatCurrency(supplierAP)} indent />
            <Row label="Total Liabilities" value={formatCurrency(totalLiab)} bold divider />

            <SectionHead label="Owner's Equity" />
            <Row label="Retained Earnings" value={formatCurrency(ownerEquity)} indent />
            <Row label="Total Equity" value={formatCurrency(ownerEquity)} bold divider />

            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(96,165,250,0.07)', borderRadius: '12px', border: '1px solid rgba(96,165,250,0.15)' }}>
              <Row label="Total Liabilities + Equity" value={formatCurrency(totalLiabEquity)} bold />
              {Math.abs(totalLiabEquity - totalAssets) < 0.01 && (
                <p style={{ fontSize: '11px', color: '#22C55E', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Balanced
                </p>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <p style={{ fontSize: '11px', color: D.faint, lineHeight: 1.6 }}>
                Cash basis accounting. Accounts Receivable = confirmed orders not yet delivered. Card reconciliation coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BANK RECONCILIATION ─────────────────────────────────────── */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '28px', marginTop: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4622D', marginBottom: '4px' }}>Business Checking</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: D.text, fontFamily: 'var(--font-playfair), Georgia, serif' }}>Bank Reconciliation</p>
          <p style={{ fontSize: '12px', color: D.muted, marginTop: '2px' }}>Enter your actual bank balance to check if the books match</p>
        </div>

        <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: D.muted, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Current bank balance</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: D.muted }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bankBalance}
                onChange={e => saveBankBalance(e.target.value)}
                placeholder="0.00"
                style={{ width: '140px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '15px', fontWeight: 700, outline: 'none', fontFamily: 'var(--font-playfair), Georgia, serif' }}
              />
            </div>
          </div>

          {bankBalance !== '' && !isNaN(parseFloat(bankBalance)) && (() => {
            const bank = parseFloat(bankBalance)
            const diff = bank - cashCollected
            const matched = Math.abs(diff) < 1
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Your bank shows', value: formatCurrency(bank), color: D.text },
                  { label: 'System: cash collected', value: formatCurrency(cashCollected), color: D.text },
                  { label: 'Difference', value: `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`, color: matched ? '#22C55E' : Math.abs(diff) < 50 ? '#F59E0B' : '#EF4444' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px 16px' }}>
                    <p style={{ fontSize: '11px', color: D.faint, marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: s.color, fontFamily: 'var(--font-playfair), Georgia, serif' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )
          })()}

          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
            <p style={{ fontSize: '11px', color: D.faint, lineHeight: 1.7 }}>
              A difference is normal — your bank balance includes all deposits and withdrawals while this system only tracks Edziban orders. The goal is to understand where the gap comes from (supplier payments, personal draws, expenses).
            </p>
          </div>
        </div>
      </div>

      {/* ── EXPENSE LOG ─────────────────────────────────────────────── */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '28px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4622D', marginBottom: '4px' }}>Business Expenses</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: D.text, fontFamily: 'var(--font-playfair), Georgia, serif' }}>Expense Log</p>
            <p style={{ fontSize: '12px', color: D.muted, marginTop: '2px' }}>Card purchases, supplies, gas — feeds into your P&amp;L</p>
          </div>
          <button
            onClick={() => setShowExpForm(v => !v)}
            style={{ fontSize: '12px', fontWeight: 700, padding: '10px 20px', borderRadius: '100px', border: 'none', background: '#C4622D', color: '#FFF8F0', cursor: 'pointer', boxShadow: '0 4px 14px rgba(196,98,45,0.3)', flexShrink: 0 }}
          >
            + Add Expense
          </button>
        </div>

        {showExpForm && (
          <div style={{ background: 'rgba(196,98,45,0.06)', border: '1px solid rgba(196,98,45,0.2)', borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: D.faint, display: 'block', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Date</label>
                <input type="date" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: D.faint, display: 'block', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Category</label>
                <select value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: D.faint, display: 'block', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Amount ($)</label>
                <input type="number" min="0" step="0.01" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: D.faint, display: 'block', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Description</label>
              <input type="text" value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Foil pans from Costco, gas to delivery..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={addExpense} style={{ fontSize: '12px', fontWeight: 700, padding: '10px 22px', borderRadius: '100px', border: 'none', background: '#C4622D', color: '#FFF8F0', cursor: 'pointer' }}>Save Expense</button>
              <button onClick={() => setShowExpForm(false)} style={{ fontSize: '12px', fontWeight: 700, padding: '10px 18px', borderRadius: '100px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: D.faint, fontSize: '13px' }}>No expenses logged yet. Add your first expense above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {expenses.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderTop: i > 0 ? `1px solid ${D.border}` : 'none', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: D.text }}>{e.description}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: 'rgba(196,98,45,0.12)', color: '#C4622D' }}>{e.category}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: D.faint }}>{new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444', fontFamily: 'var(--font-playfair), Georgia, serif', flexShrink: 0 }}>({formatCurrency(e.amount)})</span>
                <button onClick={() => deleteExpense(e.id)} style={{ fontSize: '11px', color: D.faint, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>×</button>
              </div>
            ))}
            <div style={{ paddingTop: '14px', borderTop: `2px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: D.text }}>Total all time</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#EF4444', fontFamily: 'var(--font-playfair), Georgia, serif' }}>({formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))})</span>
            </div>
          </div>
        )}
      </div>

      {/* YTD Summary */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '24px', marginTop: '20px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, marginBottom: '16px' }}>Year-to-Date {year}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          {[
            { label: 'YTD Revenue', value: formatCurrency(ytdRevenue), accent: true },
            { label: 'YTD Net Income', value: formatCurrency(ytdIncome), accent: false },
            { label: 'YTD Orders', value: String(ytdOrders.length), accent: false },
            { label: 'Avg Order Value', value: ytdOrders.length > 0 ? formatCurrency(ytdRevenue / ytdOrders.length) : '$0.00', accent: false },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: '11px', color: D.faint, marginBottom: '6px' }}>{s.label}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: s.accent ? '#C4622D' : D.text, fontFamily: 'var(--font-playfair), Georgia, serif', letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

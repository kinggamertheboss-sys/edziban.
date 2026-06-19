// Branded email templates for Edziban — inline styles only (email-client safe)
// Colors: terracotta #C4622D, cream #FFF8F0, ink #1A0F0A

export interface OrderEmailData {
  orderNumber: string
  customerName: string
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  subtotal: number
  serviceFee: number
  deliveryFee: number
  total: number
  fulfillmentType: 'pickup' | 'delivery'
  address?: string
  requestedDate: string
  requestedTime: string
  specialInstructions?: string
  eventType?: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

function timeLabel(t: string) {
  const m: Record<string, string> = {
    morning: 'Morning (10am–12pm)',
    afternoon: 'Afternoon (12pm–4pm)',
    evening: 'Evening (4pm–7pm)',
  }
  return m[t] ?? t
}

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function baseWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EDE0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5EDE0;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFF8F0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(26,15,10,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:#1A0F0A;padding:32px 40px;text-align:center;">
            <div style="font-size:72px;font-weight:700;color:#C4622D;line-height:1;letter-spacing:-0.04em;font-family:Georgia,serif;">E</div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,248,240,0.4);margin-top:6px;">EDZIBAN</div>
            <div style="font-size:12px;font-style:italic;color:rgba(255,248,240,0.35);margin-top:4px;font-family:Georgia,serif;">Ghana&apos;s finest, delivered to you.</div>
          </td>
        </tr>

        ${content}

        <!-- Footer -->
        <tr>
          <td style="background:#1A0F0A;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,248,240,0.4);line-height:1.7;">
              Edziban &mdash; Ghana&apos;s finest, delivered to you.<br>
              Greater Boston Area &bull; <a href="https://edzibancatering.com" style="color:#C4622D;text-decoration:none;">edzibancatering.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function itemsTable(items: OrderEmailData['items']) {
  const rows = items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #E2CEB8;font-size:14px;color:#1A0F0A;">${esc(item.name)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E2CEB8;font-size:14px;color:#6B4C3B;text-align:center;">× ${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E2CEB8;font-size:14px;color:#1A0F0A;text-align:right;font-weight:700;">${money(item.unitPrice * item.quantity)}</td>
    </tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`
}

// ── 1. Order Received ──────────────────────────────────────────────────────
export function orderReceivedEmail(data: OrderEmailData): string {
  const isCorporate = data.eventType === 'Student Organization' || data.eventType === 'Corporate Event'
  const hours = isCorporate ? '48' : '24'
  const orderTypeLabel = data.eventType === 'Student Organization' ? 'Student Organization Order'
    : data.eventType === 'Corporate Event' ? 'Corporate Order'
    : ''
  const content = `
    <tr>
      <td style="padding:36px 40px 0;">
        ${orderTypeLabel ? `<p style="margin:0 0 8px;display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C4622D;background:rgba(196,98,45,0.08);border:1px solid rgba(196,98,45,0.2);border-radius:100px;padding:4px 12px;">${orderTypeLabel}</p><br/>` : ''}
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C4622D;">Order Received</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1A0F0A;letter-spacing:-0.02em;">Thank you, ${esc(data.customerName)}.</h1>
        <p style="margin:0;font-size:15px;color:#6B4C3B;line-height:1.7;">Your order has been received and is currently under review. You will receive a confirmation email within ${hours} hours once it has been approved.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 40px 0;">
        <div style="background:#1A0F0A;border-radius:12px;padding:18px 24px;display:inline-block;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,248,240,0.4);">Order Number</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#C4622D;letter-spacing:-0.01em;font-family:Georgia,serif;">${esc(data.orderNumber)}</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px 0;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B4C3B;">Items Ordered</p>
        ${itemsTable(data.items)}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
          <tr><td style="font-size:13px;color:#6B4C3B;padding:6px 0;">Subtotal</td><td style="font-size:13px;color:#1A0F0A;text-align:right;padding:6px 0;">${money(data.subtotal)}</td></tr>
          <tr><td style="font-size:13px;color:#6B4C3B;padding:6px 0;">Service fee</td><td style="font-size:13px;color:#1A0F0A;text-align:right;padding:6px 0;">${money(data.serviceFee)}</td></tr>
          ${data.deliveryFee > 0 ? `<tr><td style="font-size:13px;color:#6B4C3B;padding:6px 0;">Delivery fee</td><td style="font-size:13px;color:#1A0F0A;text-align:right;padding:6px 0;">${money(data.deliveryFee)}</td></tr>` : ''}
          <tr><td style="font-size:15px;font-weight:700;color:#1A0F0A;padding:12px 0 0;border-top:2px solid #1A0F0A;">Total</td><td style="font-size:15px;font-weight:700;color:#C4622D;text-align:right;padding:12px 0 0;border-top:2px solid #1A0F0A;">${money(data.total)}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px 0;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B4C3B;">Delivery Details</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;width:100px;">Type</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;text-transform:capitalize;">${esc(data.fulfillmentType)}</td></tr>
          ${data.address ? `<tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;">Address</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">${esc(data.address)}</td></tr>` : '<tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;">Location</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">Randolph, MA 02368</td></tr>'}
          <tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;">Date</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">${esc(data.requestedDate)}</td></tr>
          <tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;">Time</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">${timeLabel(data.requestedTime)}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px 36px;">
        <div style="background:#FFF0E8;border-left:4px solid #C4622D;border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#6B4C3B;line-height:1.7;">Our team will review your order and send a confirmation email within <strong style="color:#1A0F0A;">${hours} hours</strong> with everything you need to know ahead of your event.</p>
        </div>
      </td>
    </tr>`

  return baseWrapper(content)
}

// ── 2. Order Confirmed ─────────────────────────────────────────────────────
export function orderConfirmedEmail(data: OrderEmailData): string {
  const content = `
    <tr>
      <td style="padding:36px 40px 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#22C55E;">Order Confirmed</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1A0F0A;letter-spacing:-0.02em;">Your order is confirmed, ${esc(data.customerName)}.</h1>
        <p style="margin:0;font-size:15px;color:#6B4C3B;line-height:1.7;">Your order has been reviewed and approved. Our team is now preparing everything for your event.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 40px 0;">
        <div style="background:#1A0F0A;border-radius:12px;padding:18px 24px;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,248,240,0.4);">Order Number</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#C4622D;letter-spacing:-0.01em;font-family:Georgia,serif;">${esc(data.orderNumber)}</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px 0;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B4C3B;">Your Order</p>
        ${itemsTable(data.items)}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
          <tr><td style="font-size:15px;font-weight:700;color:#1A0F0A;padding:12px 0 0;border-top:2px solid #1A0F0A;">Total Paid</td><td style="font-size:15px;font-weight:700;color:#C4622D;text-align:right;padding:12px 0 0;border-top:2px solid #1A0F0A;">${money(data.total)}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px 0;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6B4C3B;">${data.fulfillmentType === 'pickup' ? 'Pickup Details' : 'Delivery Details'}</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${data.address ? `<tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;width:100px;">Address</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">${esc(data.address)}</td></tr>` : '<tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;width:100px;">Location</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">Randolph, MA 02368</td></tr>'}
          <tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;">Date</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">${esc(data.requestedDate)}</td></tr>
          <tr><td style="font-size:13px;color:#6B4C3B;padding:5px 0;">Time</td><td style="font-size:13px;color:#1A0F0A;font-weight:600;">${timeLabel(data.requestedTime)}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px 36px;">
        <div style="background:#EDFCF0;border-left:4px solid #22C55E;border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#14532D;line-height:1.7;">You will receive another email notification as soon as your order is ready for ${data.fulfillmentType === 'pickup' ? 'pickup' : 'delivery'}. We look forward to serving you. &mdash; <strong>Edziban</strong></p>
        </div>
      </td>
    </tr>`

  return baseWrapper(content)
}

// ── 3. Order Ready ─────────────────────────────────────────────────────────
export function orderReadyEmail(data: OrderEmailData): string {
  const isPickup = data.fulfillmentType === 'pickup'

  const content = `
    <tr>
      <td style="padding:36px 40px 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C4622D;">${isPickup ? 'Ready for Pickup' : 'Out for Delivery'}</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1A0F0A;letter-spacing:-0.02em;">Your order is ready, ${esc(data.customerName)}.</h1>
        <p style="margin:0;font-size:15px;color:#6B4C3B;line-height:1.7;">${isPickup ? 'Your Edziban order is prepared and ready for pickup at the location below.' : 'Your Edziban order has been dispatched and is on its way to you.'}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 40px 0;">
        <div style="background:#1A0F0A;border-radius:12px;padding:18px 24px;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,248,240,0.4);">Order Number</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#C4622D;letter-spacing:-0.01em;font-family:Georgia,serif;">${esc(data.orderNumber)}</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px 36px;">
        <div style="background:#FFF0E8;border-left:4px solid #C4622D;border-radius:0 8px 8px 0;padding:16px 20px;">
          ${isPickup
            ? `<p style="margin:0;font-size:14px;color:#1A0F0A;font-weight:700;">Pickup Location: Randolph, MA 02368</p><p style="margin:8px 0 0;font-size:13px;color:#6B4C3B;line-height:1.7;">Please arrive between <strong>${timeLabel(data.requestedTime)}</strong> on <strong>${esc(data.requestedDate)}</strong>.<br>Please have your order number ready: <strong style="color:#C4622D;">${esc(data.orderNumber)}</strong></p>`
            : `<p style="margin:0;font-size:14px;color:#1A0F0A;font-weight:700;">Your order is on its way.</p><p style="margin:8px 0 0;font-size:13px;color:#6B4C3B;line-height:1.7;">Estimated arrival: <strong>${timeLabel(data.requestedTime)}</strong> on <strong>${esc(data.requestedDate)}</strong>. Please ensure someone is available to receive the order.</p>`
          }
        </div>
      </td>
    </tr>`

  return baseWrapper(content)
}

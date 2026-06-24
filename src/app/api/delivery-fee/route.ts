import { NextRequest, NextResponse } from 'next/server'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sanitizeText } from '@/lib/sanitize'
import { calculatePlateDeliveryFee, calculateEstimatedMinutes } from '@/lib/platesMenu'

const KITCHEN_ADDRESS = 'Randolph, MA 02368'

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const ip = getClientIp(req)
  const rl = checkLimit(ip + ':delivery-fee', 30, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json().catch(() => null)
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const address = sanitizeText((raw as Record<string, unknown>).address, 300)
  if (!address || address.length < 5) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', KITCHEN_ADDRESS)
    url.searchParams.set('destinations', address)
    url.searchParams.set('units', 'imperial')
    url.searchParams.set('key', apiKey)

    const r = await fetch(url.toString())
    const data = await r.json() as {
      status: string
      rows?: Array<{ elements: Array<{ status: string; distance: { value: number; text: string } }> }>
    }

    if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
      return NextResponse.json({ error: 'Could not calculate distance' }, { status: 422 })
    }

    const element = data.rows[0].elements[0]
    if (element.status !== 'OK') {
      return NextResponse.json({ error: 'Address not found or not reachable' }, { status: 422 })
    }

    const distanceMiles = element.distance.value / 1609.344
    const deliveryFee = calculatePlateDeliveryFee(distanceMiles)
    const estimatedMinutes = calculateEstimatedMinutes(distanceMiles)

    return NextResponse.json({
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      deliveryFee,
      estimatedMinutes,
      formattedDistance: element.distance.text,
    })
  } catch (e) {
    console.error('[DELIVERY-FEE]', e)
    return NextResponse.json({ error: 'Distance calculation failed' }, { status: 500 })
  }
}

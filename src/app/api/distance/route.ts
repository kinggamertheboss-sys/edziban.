import { NextRequest, NextResponse } from 'next/server'
import { sanitizeText } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

// Edziban pickup location — Randolph, MA
const ORIGIN = { lat: 42.1584, lng: -71.0595 }

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceRange(miles: number): string {
  if (miles <= 5) return '0-5'
  if (miles <= 10) return '5-10'
  if (miles <= 15) return '10-15'
  return '15+'
}

export async function GET(req: NextRequest) {
  // 30 distance lookups per IP per minute (client debounces at 800ms, this is the safety net)
  const rl = checkLimit(getClientIp(req) + ':distance', 30, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = req.nextUrl.searchParams.get('address')
  if (!raw) return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  const address = sanitizeText(raw, 300)
  if (!address) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Edziban/1.0 (orders@edziban.com)' },
    })
    const data = await res.json()

    if (!data.length) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    const { lat, lon } = data[0]
    const straightLine = haversine(ORIGIN.lat, ORIGIN.lng, parseFloat(lat), parseFloat(lon))
    // Apply 1.3x road factor for driving distance estimate
    const drivingMiles = Math.round(straightLine * 1.3 * 10) / 10

    return NextResponse.json({
      miles: drivingMiles,
      range: distanceRange(drivingMiles),
      formatted: data[0].display_name,
    })
  } catch (e) {
    console.error('[DISTANCE]', e)
    return NextResponse.json({ error: 'Could not calculate distance' }, { status: 500 })
  }
}

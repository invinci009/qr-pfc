import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const format = searchParams.get('format') || 'png' // 'png' | 'svg'

  if (!slug) {
    return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 })
  }

  const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || process.env.APP_DOMAIN || 'localhost:3000'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`
  const targetUrl = `${baseUrl.replace(/\/$/, '')}/r/${slug}`

  try {
    if (format === 'svg') {
      const svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
        width: 300,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
      const isDownload = searchParams.get('download') === 'true'
      return new NextResponse(svgString, {
        headers: {
          'Content-Type': 'image/svg+xml',
          ...(isDownload
            ? { 'Content-Disposition': `attachment; filename="pfc-qr-${slug}.svg"` }
            : {}),
        },
      })
    }

    // Default: Return raw PNG image buffer
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      margin: 2,
      width: 512,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })

    const isDownload = searchParams.get('download') === 'true'
    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(isDownload
          ? { 'Content-Disposition': `attachment; filename="pfc-qr-${slug}.png"` }
          : {}),
      },
    })
  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}

// app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validar que sea una URL de Google Drive
    if (!url.includes('drive.google.com')) {
      return NextResponse.json({ error: 'Only Google Drive URLs are allowed' }, { status: 400 })
    }

    // Hacer la petición desde el servidor (no tiene problemas de CORS)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }

    // Obtener el contenido de la imagen
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Devolver la imagen con los headers correctos
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Proxy image error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
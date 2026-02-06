import { NextRequest, NextResponse } from 'next/server'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/whatsapp/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting WhatsApp status:', error)
    return NextResponse.json({
      connected: false,
      browser_active: false,
      error: 'Service unavailable'
    })
  }
}

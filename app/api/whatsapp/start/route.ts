import { NextRequest, NextResponse } from 'next/server'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${PYTHON_SERVICE_URL}/api/whatsapp/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        headless: body.headless || false
      })
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.ok ? 200 : 500 })
  } catch (error) {
    console.error('Error starting WhatsApp service:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start WhatsApp service' },
      { status: 500 }
    )
  }
}

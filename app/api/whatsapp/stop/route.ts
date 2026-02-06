import { NextRequest, NextResponse } from 'next/server'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001'

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/whatsapp/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error stopping WhatsApp service:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to stop WhatsApp service' },
      { status: 500 }
    )
  }
}

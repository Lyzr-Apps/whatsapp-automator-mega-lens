import { NextRequest, NextResponse } from 'next/server'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/whatsapp/qr-code`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting QR code:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get QR code' },
      { status: 500 }
    )
  }
}

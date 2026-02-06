import { NextRequest, NextResponse } from 'next/server'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${PYTHON_SERVICE_URL}/api/whatsapp/hammer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        time_slots: body.time_slots,
        contacts: body.contacts,
        message_template: body.message_template,
        delay: body.delay || 5
      })
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.ok ? 200 : 500 })
  } catch (error) {
    console.error('Error executing Hammer broadcast:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute Hammer broadcast' },
      { status: 500 }
    )
  }
}

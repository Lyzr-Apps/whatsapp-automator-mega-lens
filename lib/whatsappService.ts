/**
 * WhatsApp Service Client
 * Handles communication with Python WhatsApp automation service
 */

export interface Contact {
  name: string
  phone: string
  email?: string
  company?: string
}

export interface WhatsAppStatus {
  connected: boolean
  browser_active: boolean
  timestamp?: string
  error?: string
}

export interface BroadcastResult {
  success: boolean
  results?: Array<{
    success: boolean
    phone: string
    contact_name: string
    message: string
    timestamp: string
    status: string
    error?: string
  }>
  total?: number
  success_count?: number
  error?: string
}

export interface HammerResult {
  success: boolean
  hammer_results?: Array<{
    scheduled_time: string
    execution_time: string
    total_contacts: number
    success_count: number
    failed_count: number
    results: any[]
  }>
  time_slots?: number
  error?: string
}

class WhatsAppService {
  private baseUrl = '/api/whatsapp'

  /**
   * Start WhatsApp Web browser
   */
  async startWhatsApp(headless: boolean = false): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ headless })
      })

      return await response.json()
    } catch (error) {
      console.error('Failed to start WhatsApp:', error)
      return { success: false, error: 'Failed to start WhatsApp service' }
    }
  }

  /**
   * Get WhatsApp connection status
   */
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
      })

      return await response.json()
    } catch (error) {
      console.error('Failed to get status:', error)
      return {
        connected: false,
        browser_active: false,
        error: 'Service unavailable'
      }
    }
  }

  /**
   * Get QR code for WhatsApp login
   */
  async getQRCode(): Promise<{ success: boolean; qr_code?: string; has_qr?: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/qr-code`, {
        method: 'GET',
      })

      return await response.json()
    } catch (error) {
      console.error('Failed to get QR code:', error)
      return { success: false, error: 'Failed to get QR code' }
    }
  }

  /**
   * Execute broadcast to multiple contacts
   */
  async executeBroadcast(
    contacts: Contact[],
    messageTemplate: string,
    delay: number = 5
  ): Promise<BroadcastResult> {
    try {
      const response = await fetch(`${this.baseUrl}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts,
          message_template: messageTemplate,
          delay
        })
      })

      return await response.json()
    } catch (error) {
      console.error('Failed to execute broadcast:', error)
      return { success: false, error: 'Failed to execute broadcast' }
    }
  }

  /**
   * Execute Hammer broadcast (multiple time slots)
   */
  async executeHammer(
    timeSlots: string[],
    contacts: Contact[],
    messageTemplate: string,
    delay: number = 5
  ): Promise<HammerResult> {
    try {
      const response = await fetch(`${this.baseUrl}/hammer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slots: timeSlots,
          contacts,
          message_template: messageTemplate,
          delay
        })
      })

      return await response.json()
    } catch (error) {
      console.error('Failed to execute Hammer broadcast:', error)
      return { success: false, error: 'Failed to execute Hammer broadcast' }
    }
  }

  /**
   * Stop WhatsApp Web browser
   */
  async stopWhatsApp(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/stop`, {
        method: 'POST',
      })

      return await response.json()
    } catch (error) {
      console.error('Failed to stop WhatsApp:', error)
      return { success: false, error: 'Failed to stop WhatsApp service' }
    }
  }

  /**
   * Poll status at regular intervals
   */
  startStatusPolling(callback: (status: WhatsAppStatus) => void, intervalMs: number = 5000): NodeJS.Timeout {
    const poll = async () => {
      const status = await this.getStatus()
      callback(status)
    }

    poll() // Initial call
    return setInterval(poll, intervalMs)
  }

  /**
   * Stop status polling
   */
  stopStatusPolling(intervalId: NodeJS.Timeout) {
    clearInterval(intervalId)
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService()

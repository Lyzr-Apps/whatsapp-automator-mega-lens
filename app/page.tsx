'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { whatsappService, WhatsAppStatus } from '@/lib/whatsappService'
import {
  FaWhatsapp,
  FaFileAlt,
  FaUsers,
  FaBroadcastTower,
  FaChartBar,
  FaPlus,
  FaUpload,
  FaTrash,
  FaCopy,
  FaSave,
  FaEdit,
  FaHammer,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaDownload,
  FaBell,
  FaUser,
  FaCalendarAlt,
  FaTimes,
  FaQrcode,
  FaLink,
  FaPowerOff
} from 'react-icons/fa'

// Agent IDs
const AGENT_IDS = {
  TEMPLATE_MANAGER: '6985a60a301c62c7ca2c7df8',
  CONTACT_PROCESSOR: '6985a61fe2c0086a4fc43bf2',
  BROADCAST_SCHEDULER: '6985a638705117394b711964'
}

// TypeScript Interfaces from test responses
interface Template {
  template_id: string
  template_name: string
  template_content: string
  variables: string[]
  category: string
  character_count: number
  validation_status: string
  validation_errors: string[]
  last_used?: string
}

interface Contact {
  name: string
  phone: string
  email: string
  company: string
  status: 'valid' | 'invalid' | 'duplicate'
  errors: string[]
  tags?: string[]
}

interface ContactList {
  list_id: string
  list_name: string
  total_rows: number
  valid_contacts: number
  invalid_contacts: number
  duplicate_contacts: number
  contacts: Contact[]
  processing_summary: {
    success_rate: string
    total_fields_extracted: number
    validation_errors: string[]
  }
}

interface Broadcast {
  broadcast_id: string | null
  broadcast_name: string
  template_id: string
  list_id: string
  schedule_type: 'hammer' | 'one-time' | 'daily'
  time_slots: string[]
  total_contacts: number
  total_messages: number
  estimated_duration: string
  personalization_preview: any[]
  validation_status: string
  validation_errors: string[]
  queue_status: string
  created_at?: string
  status?: 'scheduled' | 'sending' | 'completed' | 'failed'
}

interface AnalyticsMetrics {
  sent: number
  delivered: number
  read: number
  failed: number
}

interface Campaign {
  campaign_id: string
  template_name: string
  total_messages: number
  sent: number
  delivered: number
  read: number
  failed: number
  created_at: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Poll WhatsApp status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const status = await whatsappService.getStatus()
      setWhatsappStatus(status)
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  // Dashboard State
  const [stats, setStats] = useState({
    totalTemplates: 12,
    totalContacts: 2450,
    scheduledBroadcasts: 5,
    messagesSentToday: 1234
  })

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, action: 'Broadcast sent', detail: 'Promo Campaign to Q1 Leads', time: '2 hours ago', status: 'success' },
    { id: 2, action: 'Template created', detail: 'Welcome Message Template', time: '5 hours ago', status: 'success' },
    { id: 3, action: 'Contacts uploaded', detail: '500 contacts from leads.xlsx', time: '1 day ago', status: 'success' },
    { id: 4, action: 'Broadcast scheduled', detail: 'Holiday Special at 3 time slots', time: '2 days ago', status: 'pending' }
  ])

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([
    {
      template_id: 'promo_offer_001',
      template_name: 'Special Offer Promotion',
      template_content: 'Hi {{name}}, we have a special offer for {{company}}! Get 20% off on all products this week. Reply YES to subscribe.',
      variables: ['name', 'company'],
      category: 'promotional',
      character_count: 126,
      validation_status: 'valid',
      validation_errors: [],
      last_used: '2024-06-13'
    }
  ])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(templates[0] || null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    category: 'promotional'
  })
  const [templateLoading, setTemplateLoading] = useState(false)

  // Contacts State
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [selectedContactList, setSelectedContactList] = useState<string>('')
  const [contactsData, setContactsData] = useState<Contact[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [manualContactForm, setManualContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    tags: ''
  })
  const [addingContact, setAddingContact] = useState(false)

  // WhatsApp Connection State
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({
    connected: false,
    browser_active: false
  })
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)

  // Broadcasts State
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [broadcastForm, setBroadcastForm] = useState({
    templateId: '',
    contactLists: [] as string[],
    hammerEnabled: false,
    timeSlots: [] as string[],
    frequency: 'one-time'
  })
  const [newTimeSlot, setNewTimeSlot] = useState({ date: '', time: '' })
  const [broadcastLoading, setBroadcastLoading] = useState(false)

  // Analytics State
  const [dateRange, setDateRange] = useState('7days')
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    sent: 15234,
    delivered: 14890,
    read: 12456,
    failed: 344
  })
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      campaign_id: 'camp_001',
      template_name: 'Promo Campaign',
      total_messages: 1500,
      sent: 1500,
      delivered: 1485,
      read: 1230,
      failed: 15,
      created_at: '2024-06-10'
    }
  ])

  // Template Functions
  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.content) return

    setTemplateLoading(true)
    const message = `Create a template named "${templateForm.name}" with content: "${templateForm.content}" in category ${templateForm.category}`

    const result = await callAIAgent(message, AGENT_IDS.TEMPLATE_MANAGER)

    if (result.success && result.response.status === 'success') {
      const newTemplate = result.response.result as Template
      setTemplates(prev => [newTemplate, ...prev])
      setSelectedTemplate(newTemplate)
      setTemplateForm({ name: '', content: '', category: 'promotional' })
      setStats(prev => ({ ...prev, totalTemplates: prev.totalTemplates + 1 }))
    }

    setTemplateLoading(false)
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.template_id !== templateId))
    if (selectedTemplate?.template_id === templateId) {
      setSelectedTemplate(null)
    }
    setStats(prev => ({ ...prev, totalTemplates: prev.totalTemplates - 1 }))
  }

  const handleDuplicateTemplate = (template: Template) => {
    const newTemplate = {
      ...template,
      template_id: `${template.template_id}_copy_${Date.now()}`,
      template_name: `${template.template_name} (Copy)`
    }
    setTemplates(prev => [newTemplate, ...prev])
    setStats(prev => ({ ...prev, totalTemplates: prev.totalTemplates + 1 }))
  }

  // Contact Functions
  const handleFileUpload = async (file: File) => {
    if (!file) return

    setUploadLoading(true)

    // Upload file first
    const uploadResult = await uploadFiles(file)

    if (uploadResult.success) {
      // Process with Contact Processor Agent
      const message = `Process the uploaded contact file "${file.name}" and validate all phone numbers and emails`
      const result = await callAIAgent(message, AGENT_IDS.CONTACT_PROCESSOR, {
        assets: uploadResult.asset_ids
      })

      if (result.success && result.response.status === 'success') {
        const contactList = result.response.result as ContactList
        setContactLists(prev => [contactList, ...prev])
        setContactsData(contactList.contacts)
        setSelectedContactList(contactList.list_id)
        setStats(prev => ({
          ...prev,
          totalContacts: prev.totalContacts + contactList.valid_contacts
        }))
      }
    }

    setUploadLoading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      handleFileUpload(file)
    }
  }

  // WhatsApp Connection Functions
  const handleStartWhatsApp = async () => {
    setWhatsappLoading(true)

    const result = await whatsappService.startWhatsApp(false)

    if (result.success) {
      setShowQRModal(true)
      // Poll for QR code
      const pollQR = setInterval(async () => {
        const qrResult = await whatsappService.getQRCode()
        if (qrResult.qr_code) {
          setQrCode(qrResult.qr_code)
        }

        // Check if connected
        const status = await whatsappService.getStatus()
        if (status.connected) {
          setShowQRModal(false)
          clearInterval(pollQR)
        }
      }, 2000)

      // Stop polling after 60 seconds
      setTimeout(() => clearInterval(pollQR), 60000)
    }

    setWhatsappLoading(false)
  }

  const handleStopWhatsApp = async () => {
    setWhatsappLoading(true)
    await whatsappService.stopWhatsApp()
    setWhatsappStatus({ connected: false, browser_active: false })
    setWhatsappLoading(false)
  }

  const handleAddManualContact = async () => {
    if (!manualContactForm.name || !manualContactForm.phone) return

    setAddingContact(true)

    // Create contact object with validation
    const message = `Add a new contact with these details: Name: ${manualContactForm.name}, Phone: ${manualContactForm.phone}, Email: ${manualContactForm.email || 'N/A'}, Company: ${manualContactForm.company || 'N/A'}. Validate the phone number and email format.`

    const result = await callAIAgent(message, AGENT_IDS.CONTACT_PROCESSOR)

    if (result.success && result.response.status === 'success') {
      const processedData = result.response.result as ContactList

      // Add to existing contacts or create new list
      if (selectedContactList && contactLists.length > 0) {
        // Add to existing list
        const updatedLists = contactLists.map(list => {
          if (list.list_id === selectedContactList) {
            const newContact: Contact = processedData.contacts[0] || {
              name: manualContactForm.name,
              phone: manualContactForm.phone,
              email: manualContactForm.email,
              company: manualContactForm.company,
              status: 'valid',
              errors: [],
              tags: manualContactForm.tags ? manualContactForm.tags.split(',').map(t => t.trim()) : []
            }
            return {
              ...list,
              contacts: [...list.contacts, newContact],
              valid_contacts: list.valid_contacts + 1,
              total_rows: list.total_rows + 1
            }
          }
          return list
        })
        setContactLists(updatedLists)

        // Update displayed contacts if viewing current list
        const currentList = updatedLists.find(l => l.list_id === selectedContactList)
        if (currentList) {
          setContactsData(currentList.contacts)
        }
      } else {
        // Create new contact directly
        const newContact: Contact = {
          name: manualContactForm.name,
          phone: manualContactForm.phone,
          email: manualContactForm.email,
          company: manualContactForm.company,
          status: 'valid',
          errors: [],
          tags: manualContactForm.tags ? manualContactForm.tags.split(',').map(t => t.trim()) : []
        }
        setContactsData(prev => [...prev, newContact])
      }

      setStats(prev => ({ ...prev, totalContacts: prev.totalContacts + 1 }))

      // Reset form
      setManualContactForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        tags: ''
      })
    }

    setAddingContact(false)
  }

  // Broadcast Functions
  const handleAddTimeSlot = () => {
    if (newTimeSlot.date && newTimeSlot.time) {
      const dateTime = `${newTimeSlot.date}T${newTimeSlot.time}:00Z`
      setBroadcastForm(prev => ({
        ...prev,
        timeSlots: [...prev.timeSlots, dateTime]
      }))
      setNewTimeSlot({ date: '', time: '' })
    }
  }

  const handleRemoveTimeSlot = (index: number) => {
    setBroadcastForm(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index)
    }))
  }

  const handleHammerSend = async () => {
    if (!broadcastForm.templateId || broadcastForm.contactLists.length === 0) return

    // Check WhatsApp connection
    if (!whatsappStatus.connected) {
      alert('Please connect WhatsApp Web first!')
      return
    }

    setBroadcastLoading(true)

    const selectedTemplate = templates.find(t => t.template_id === broadcastForm.templateId)
    const totalContacts = contactLists
      .filter(cl => broadcastForm.contactLists.includes(cl.list_id))
      .reduce((sum, cl) => sum + cl.valid_contacts, 0)

    // Get all contacts from selected lists
    const allContacts = contactLists
      .filter(cl => broadcastForm.contactLists.includes(cl.list_id))
      .flatMap(cl => cl.contacts)

    try {
      let broadcastResult

      if (broadcastForm.hammerEnabled && broadcastForm.timeSlots.length > 0) {
        // Execute Hammer broadcast via WhatsApp service
        broadcastResult = await whatsappService.executeHammer(
          broadcastForm.timeSlots,
          allContacts,
          selectedTemplate?.template_content || '',
          5 // 5 second delay between messages
        )
      } else {
        // Execute regular broadcast via WhatsApp service
        broadcastResult = await whatsappService.executeBroadcast(
          allContacts,
          selectedTemplate?.template_content || '',
          5
        )
      }

      if (broadcastResult.success) {
        const newBroadcast: Broadcast = {
          broadcast_id: `broadcast_${Date.now()}`,
          broadcast_name: `${selectedTemplate?.template_name} - ${new Date().toLocaleString()}`,
          template_id: broadcastForm.templateId,
          list_id: broadcastForm.contactLists.join(','),
          schedule_type: broadcastForm.hammerEnabled ? 'hammer' : 'one-time',
          time_slots: broadcastForm.timeSlots,
          total_contacts: totalContacts,
          total_messages: broadcastForm.hammerEnabled
            ? totalContacts * broadcastForm.timeSlots.length
            : totalContacts,
          estimated_duration: '~10 minutes',
          personalization_preview: [],
          validation_status: 'valid',
          validation_errors: [],
          queue_status: 'completed',
          status: 'completed',
          created_at: new Date().toISOString()
        }

        setBroadcasts(prev => [newBroadcast, ...prev])
        setStats(prev => ({
          ...prev,
          scheduledBroadcasts: prev.scheduledBroadcasts + 1,
          messagesSentToday: prev.messagesSentToday + newBroadcast.total_messages
        }))

        // Reset form
        setBroadcastForm({
          templateId: '',
          contactLists: [],
          hammerEnabled: false,
          timeSlots: [],
          frequency: 'one-time'
        })
      }
    } catch (error) {
      console.error('Broadcast failed:', error)
    }

    setBroadcastLoading(false)
  }

  const calculateBroadcastSummary = () => {
    const totalContacts = contactLists
      .filter(cl => broadcastForm.contactLists.includes(cl.list_id))
      .reduce((sum, cl) => sum + cl.valid_contacts, 0)

    const totalMessages = broadcastForm.hammerEnabled
      ? totalContacts * broadcastForm.timeSlots.length
      : totalContacts

    return { totalContacts, totalMessages }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaQrcode className="text-[#25D366]" />
                Connect WhatsApp Web
              </CardTitle>
              <CardDescription>
                Scan the QR code with your phone to connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                {qrCode ? (
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <FaSpinner className="text-4xl text-gray-400 animate-spin" />
                  </div>
                )}
              </div>

              <Alert>
                <FaWhatsapp className="h-4 w-4" />
                <AlertDescription>
                  Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, and scan this QR code
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowQRModal(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#075E54] text-white shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaWhatsapp className="text-4xl" />
            <div>
              <h1 className="text-2xl font-bold">WhatsApp Broadcast Hub</h1>
              <p className="text-sm text-green-100">Multi-Time Campaign Automation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* WhatsApp Connection Status */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-lg">
              <div className="flex items-center gap-2">
                {whatsappStatus.connected ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">WhatsApp Connected</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                    <span className="text-sm font-medium">Disconnected</span>
                  </>
                )}
              </div>
              {whatsappStatus.connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-red-600"
                  onClick={handleStopWhatsApp}
                  disabled={whatsappLoading}
                >
                  <FaPowerOff className="mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-green-600"
                  onClick={handleStartWhatsApp}
                  disabled={whatsappLoading}
                >
                  {whatsappLoading ? (
                    <FaSpinner className="mr-2 animate-spin" />
                  ) : (
                    <FaLink className="mr-2" />
                  )}
                  Connect
                </Button>
              )}
            </div>

            <Button variant="ghost" size="icon" className="text-white hover:bg-[#064e45]">
              <FaBell className="text-xl" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-[#064e45]">
              <FaUser className="text-xl" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 h-auto p-1 bg-white shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
              <FaChartBar />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2 py-3">
              <FaFileAlt />
              <span>Templates</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2 py-3">
              <FaUsers />
              <span>Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="broadcasts" className="flex items-center gap-2 py-3">
              <FaBroadcastTower />
              <span>Broadcasts</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 py-3">
              <FaChartBar />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardDescription>Total Templates</CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats.totalTemplates}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FaCheckCircle />
                    <span>All active</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardDescription>Total Contacts</CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats.totalContacts}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FaCheckCircle />
                    <span>Verified</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <CardDescription>Scheduled Broadcasts</CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats.scheduledBroadcasts}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <FaClock />
                    <span>Pending</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardDescription>Messages Sent Today</CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats.messagesSentToday}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <FaCheckCircle />
                    <span>Delivered</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Jump to common tasks</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button
                  onClick={() => setActiveTab('templates')}
                  className="bg-[#25D366] hover:bg-[#1fb855]"
                >
                  <FaPlus className="mr-2" />
                  New Template
                </Button>
                <Button
                  onClick={() => setActiveTab('contacts')}
                  variant="outline"
                >
                  <FaUpload className="mr-2" />
                  Upload Contacts
                </Button>
                <Button
                  onClick={() => setActiveTab('broadcasts')}
                  variant="outline"
                >
                  <FaBroadcastTower className="mr-2" />
                  New Broadcast
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest events and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-gray-500">{activity.detail}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Templates</CardTitle>
                  <CardDescription>{templates.length} total templates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {templates.map(template => (
                    <div
                      key={template.template_id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.template_id === template.template_id
                          ? 'border-[#075E54] bg-green-50'
                          : 'hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{template.template_name}</h4>
                        <Badge variant={template.validation_status === 'valid' ? 'default' : 'destructive'}>
                          {template.validation_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {template.template_content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{template.character_count} chars</span>
                        {template.last_used && <span>Used: {template.last_used}</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Template Editor */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Template Editor</CardTitle>
                  <CardDescription>Create or edit message templates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="Enter template name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-category">Category</Label>
                    <Select
                      value={templateForm.category}
                      onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-content">Message Content</Label>
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setTemplateForm(prev => ({
                          ...prev,
                          content: prev.content + '{{name}}'
                        }))}
                      >
                        + name
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setTemplateForm(prev => ({
                          ...prev,
                          content: prev.content + '{{company}}'
                        }))}
                      >
                        + company
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setTemplateForm(prev => ({
                          ...prev,
                          content: prev.content + '{{custom}}'
                        }))}
                      >
                        + custom
                      </Button>
                    </div>
                    <Textarea
                      id="template-content"
                      placeholder="Enter your message template with variables like {{name}}"
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 text-right">
                      {templateForm.content.length}/500 characters
                    </p>
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-2">
                    <Label>Live Preview</Label>
                    <div className="p-4 bg-gray-100 rounded-lg border">
                      <p className="text-sm whitespace-pre-wrap">
                        {templateForm.content || 'Your message preview will appear here...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateTemplate}
                      disabled={templateLoading || !templateForm.name || !templateForm.content}
                      className="bg-[#25D366] hover:bg-[#1fb855]"
                    >
                      {templateLoading ? (
                        <>
                          <FaSpinner className="mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="mr-2" />
                          Save Template
                        </>
                      )}
                    </Button>

                    {selectedTemplate && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleDuplicateTemplate(selectedTemplate)}
                        >
                          <FaCopy className="mr-2" />
                          Duplicate
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteTemplate(selectedTemplate.template_id)}
                        >
                          <FaTrash className="mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Manual Contact Addition */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FaUser />
                    Add Contact Manually
                  </CardTitle>
                  <CardDescription>Enter contact details individually</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name *</Label>
                    <Input
                      id="contact-name"
                      placeholder="John Doe"
                      value={manualContactForm.name}
                      onChange={(e) => setManualContactForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Phone Number *</Label>
                    <Input
                      id="contact-phone"
                      placeholder="+1234567890"
                      value={manualContactForm.phone}
                      onChange={(e) => setManualContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="john@example.com"
                      value={manualContactForm.email}
                      onChange={(e) => setManualContactForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-company">Company</Label>
                    <Input
                      id="contact-company"
                      placeholder="Acme Inc."
                      value={manualContactForm.company}
                      onChange={(e) => setManualContactForm(prev => ({ ...prev, company: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-tags">Tags (comma-separated)</Label>
                    <Input
                      id="contact-tags"
                      placeholder="lead, premium, q1"
                      value={manualContactForm.tags}
                      onChange={(e) => setManualContactForm(prev => ({ ...prev, tags: e.target.value }))}
                    />
                  </div>

                  <Button
                    onClick={handleAddManualContact}
                    disabled={addingContact || !manualContactForm.name || !manualContactForm.phone}
                    className="w-full bg-[#25D366] hover:bg-[#1fb855]"
                  >
                    {addingContact ? (
                      <>
                        <FaSpinner className="mr-2 animate-spin" />
                        Adding Contact...
                      </>
                    ) : (
                      <>
                        <FaPlus className="mr-2" />
                        Add Contact
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Excel Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FaUpload />
                    Bulk Upload via Excel
                  </CardTitle>
                  <CardDescription>Upload .xlsx, .xls, or .csv files</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive ? 'border-[#075E54] bg-green-50' : 'border-gray-300'
                    }`}
                    onDragEnter={() => setDragActive(true)}
                    onDragLeave={() => setDragActive(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Upload Excel File</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Drag and drop your file here
                    </p>
                    <p className="text-xs text-gray-400 mb-4">Maximum file size: 10MB</p>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file)
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={uploadLoading}
                    >
                      {uploadLoading ? (
                        <>
                          <FaSpinner className="mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaUpload className="mr-2" />
                          Choose File
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact List Management */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Lists</CardTitle>
                <CardDescription>View and manage your contact lists</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* List Selector */}
                <div className="space-y-2">
                  <Label>Select Contact List</Label>
                  <Select value={selectedContactList} onValueChange={setSelectedContactList}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a contact list" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactLists.map(list => (
                        <SelectItem key={list.list_id} value={list.list_id}>
                          {list.list_name} ({list.valid_contacts} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Table */}
                {contactsData.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Contact List</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <FaDownload className="mr-2" />
                            Export
                          </Button>
                          <Button variant="destructive" size="sm">
                            <FaTrash className="mr-2" />
                            Delete Selected
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <input type="checkbox" className="rounded" />
                              </TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Company</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contactsData.slice(0, 50).map((contact, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <input type="checkbox" className="rounded" />
                                </TableCell>
                                <TableCell className="font-medium">{contact.name}</TableCell>
                                <TableCell>{contact.phone}</TableCell>
                                <TableCell>{contact.email}</TableCell>
                                <TableCell>{contact.company || '-'}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      contact.status === 'valid'
                                        ? 'default'
                                        : contact.status === 'duplicate'
                                        ? 'secondary'
                                        : 'destructive'
                                    }
                                  >
                                    {contact.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {contactsData.length > 50 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Showing 50 of {contactsData.length} contacts
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcasts Tab - HAMMER FEATURE */}
          <TabsContent value="broadcasts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FaHammer className="text-[#25D366]" />
                      Hammer Broadcast
                    </CardTitle>
                    <CardDescription>Send messages at multiple time slots</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Multi-Time Sending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Selector */}
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select
                    value={broadcastForm.templateId}
                    onValueChange={(value) => setBroadcastForm(prev => ({ ...prev, templateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.template_id} value={template.template_id}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Lists Multi-Select */}
                <div className="space-y-2">
                  <Label>Select Contact Lists</Label>
                  <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
                    {contactLists.length > 0 ? (
                      contactLists.map(list => (
                        <div key={list.list_id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={list.list_id}
                            checked={broadcastForm.contactLists.includes(list.list_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBroadcastForm(prev => ({
                                  ...prev,
                                  contactLists: [...prev.contactLists, list.list_id]
                                }))
                              } else {
                                setBroadcastForm(prev => ({
                                  ...prev,
                                  contactLists: prev.contactLists.filter(id => id !== list.list_id)
                                }))
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={list.list_id} className="font-normal cursor-pointer">
                            {list.list_name} ({list.valid_contacts} contacts)
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No contact lists available. Upload contacts first.</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Hammer Toggle */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <FaHammer className="text-2xl text-[#25D366]" />
                    <div>
                      <Label className="text-base font-semibold">Enable Hammer Mode</Label>
                      <p className="text-sm text-gray-600">Send to contacts at multiple time slots</p>
                    </div>
                  </div>
                  <Switch
                    checked={broadcastForm.hammerEnabled}
                    onCheckedChange={(checked) => setBroadcastForm(prev => ({ ...prev, hammerEnabled: checked }))}
                  />
                </div>

                {/* Time Slot Builder */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Time Slots</Label>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="slot-date">Date</Label>
                      <Input
                        type="date"
                        id="slot-date"
                        value={newTimeSlot.date}
                        onChange={(e) => setNewTimeSlot(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slot-time">Time</Label>
                      <Input
                        type="time"
                        id="slot-time"
                        value={newTimeSlot.time}
                        onChange={(e) => setNewTimeSlot(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="invisible">Add</Label>
                      <Button
                        onClick={handleAddTimeSlot}
                        disabled={!newTimeSlot.date || !newTimeSlot.time}
                        className="w-full bg-[#25D366] hover:bg-[#1fb855]"
                      >
                        <FaPlus className="mr-2" />
                        Add Slot
                      </Button>
                    </div>
                  </div>

                  {/* Time Slot Chips */}
                  {broadcastForm.timeSlots.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border">
                      {broadcastForm.timeSlots.map((slot, index) => {
                        const date = new Date(slot)
                        return (
                          <Badge key={index} variant="secondary" className="px-3 py-2 text-sm">
                            <FaClock className="mr-2" />
                            {date.toLocaleString()}
                            <button
                              onClick={() => handleRemoveTimeSlot(index)}
                              className="ml-2 hover:text-red-600"
                            >
                              <FaTimes />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Frequency Options */}
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={broadcastForm.frequency}
                    onValueChange={(value) => setBroadcastForm(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">One-time</SelectItem>
                      <SelectItem value="daily">Daily Repeat</SelectItem>
                      <SelectItem value="custom">Custom Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Summary Panel */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base">Broadcast Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Recipients:</span>
                      <span className="font-semibold">{calculateBroadcastSummary().totalContacts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Time Slots:</span>
                      <span className="font-semibold">{broadcastForm.timeSlots.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Messages:</span>
                      <span className="font-semibold text-[#075E54]">
                        {calculateBroadcastSummary().totalMessages}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estimated Duration:</span>
                      <span className="font-semibold">
                        ~{Math.ceil(calculateBroadcastSummary().totalMessages / 10)} minutes
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Hammer Send Button */}
                <Button
                  onClick={handleHammerSend}
                  disabled={
                    broadcastLoading ||
                    !broadcastForm.templateId ||
                    broadcastForm.contactLists.length === 0 ||
                    broadcastForm.timeSlots.length === 0
                  }
                  className="w-full h-14 text-lg font-bold bg-[#25D366] hover:bg-[#1fb855]"
                >
                  {broadcastLoading ? (
                    <>
                      <FaSpinner className="mr-2 text-2xl animate-spin" />
                      Scheduling Broadcast...
                    </>
                  ) : (
                    <>
                      <FaHammer className="mr-2 text-2xl" />
                      Hammer Send
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Broadcasts */}
            {broadcasts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Broadcasts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {broadcasts.map((broadcast, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{broadcast.broadcast_name}</h4>
                          <Badge
                            variant={
                              broadcast.status === 'scheduled'
                                ? 'default'
                                : broadcast.status === 'completed'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {broadcast.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>Contacts: {broadcast.total_contacts}</div>
                          <div>Messages: {broadcast.total_messages}</div>
                          <div>Time Slots: {broadcast.time_slots.length}</div>
                          <div>Type: {broadcast.schedule_type}</div>
                        </div>
                        {broadcast.validation_errors.length > 0 && (
                          <Alert className="mt-2" variant="destructive">
                            <FaExclamationCircle className="h-4 w-4" />
                            <AlertDescription>
                              {broadcast.validation_errors.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Date Range Filter */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Messages Sent</CardDescription>
                  <CardTitle className="text-3xl">{metrics.sent.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={100} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2">100%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Delivered</CardDescription>
                  <CardTitle className="text-3xl text-green-600">
                    {metrics.delivered.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={(metrics.delivered / metrics.sent) * 100} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2">
                    {((metrics.delivered / metrics.sent) * 100).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Read</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">
                    {metrics.read.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={(metrics.read / metrics.sent) * 100} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2">
                    {((metrics.read / metrics.sent) * 100).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Failed</CardDescription>
                  <CardTitle className="text-3xl text-red-600">
                    {metrics.failed.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={(metrics.failed / metrics.sent) * 100} className="h-2 bg-red-100" />
                  <p className="text-xs text-gray-500 mt-2">
                    {((metrics.failed / metrics.sent) * 100).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Campaign Performance</CardTitle>
                    <CardDescription>Detailed delivery statistics by campaign</CardDescription>
                  </div>
                  <Button variant="outline">
                    <FaDownload className="mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Read</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map(campaign => (
                        <TableRow key={campaign.campaign_id}>
                          <TableCell className="font-medium">{campaign.template_name}</TableCell>
                          <TableCell>{campaign.total_messages}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{campaign.sent}</span>
                              <Badge variant="secondary" className="text-xs">
                                {((campaign.sent / campaign.total_messages) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{campaign.delivered}</span>
                              <Badge className="text-xs bg-green-100 text-green-800">
                                {((campaign.delivered / campaign.sent) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{campaign.read}</span>
                              <Badge className="text-xs bg-blue-100 text-blue-800">
                                {((campaign.read / campaign.sent) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{campaign.failed}</span>
                              <Badge variant="destructive" className="text-xs">
                                {((campaign.failed / campaign.sent) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

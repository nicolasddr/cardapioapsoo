import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { OrderService, Order, OrderItem } from './services/orderService'

interface Config {
  supabase: {
    url: string
    serviceRoleKey: string
  }
  notifications: {
    soundEnabled: boolean
    soundVolume: number
    autoCloseDelay: number
  }
}

interface Notification {
  id: string
  orderId: string
  orderType: string
  total: number
  timestamp: number
}

interface KanbanColumn {
  id: 'received' | 'preparing' | 'ready'
  title: string
  status: 'Recebido' | 'Em Preparo' | 'Pronto'
  orders: Order[]
  loading: boolean
  error: string | null
}

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<Config | null>
      saveConfig: (config: Config) => Promise<{ success: boolean; error?: string }>
    }
    ordersApp: {
      retry?: () => void
      updateOrderStatus?: (orderId: string, newStatus: 'Recebido' | 'Em Preparo' | 'Pronto') => Promise<void>
      showOrderDetails?: (orderId: string) => Promise<void>
    }
  }
}

class OrdersApp {
  private supabase: SupabaseClient | null = null
  private orderService: OrderService | null = null
  private config: Config | null = null
  private columns: KanbanColumn[] = [
    { id: 'received', title: 'Recebidos', status: 'Recebido', orders: [], loading: false, error: null },
    { id: 'preparing', title: 'Em Preparo', status: 'Em Preparo', orders: [], loading: false, error: null },
    { id: 'ready', title: 'Prontos', status: 'Pronto', orders: [], loading: false, error: null }
  ]
  private notifications: Notification[] = []
  private notifiedOrderIds = new Set<string>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectTimeout: NodeJS.Timeout | null = null
  private insertChannel: any = null
  private updateChannel: any = null
  private optimisticUpdates = new Map<string, { status: string; timestamp: number }>()
  private currentModalOrderId: string | null = null

  constructor() {
    this.init()
  }

  private async init() {
    console.log('electron-orders:init-start')
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    await this.loadConfig()
    
    if (!this.config) {
      console.error('electron-orders:no-config')
      this.updateConnectionStatus('disconnected')
      this.showError('Configuração não encontrada. Por favor, configure o arquivo config.json em src/config/')
      return
    }

    const isInvalidKey = this.config.supabase.url === 'YOUR_SUPABASE_URL' || 
        this.config.supabase.serviceRoleKey === 'SUA_SERVICE_ROLE_KEY_AQUI' || 
        !this.config.supabase.serviceRoleKey ||
        this.config.supabase.serviceRoleKey.length < 20
    
    if (isInvalidKey) {
      console.error('electron-orders:invalid-config')
      this.updateConnectionStatus('disconnected')
      const errorMsg = '⚠️ CONFIGURAÇÃO NECESSÁRIA: Edite o arquivo src/config/config.json e preencha a SERVICE_ROLE_KEY do Supabase. Veja CONFIGURACAO.md para instruções.'
      this.showError(errorMsg)
      return
    }

    console.log('electron-orders:config-valid')
    this.initSupabase()
    await this.loadAllOrders()
    this.setupRealtimeSubscriptions()
    
    window.ordersApp = {
      updateOrderStatus: (orderId: string, newStatus: 'Recebido' | 'Em Preparo' | 'Pronto') => 
        this.updateOrderStatus(orderId, newStatus),
      showOrderDetails: (orderId: string) => this.showOrderDetails(orderId)
    }
  }

  private async loadConfig() {
    try {
      this.config = await window.electronAPI.getConfig()
      if (!this.config) {
        console.error('electron-orders:config-not-found')
        return
      }
      
      console.log('electron-orders:config-loaded', { 
        url: this.config.supabase.url,
        hasKey: !!this.config.supabase.serviceRoleKey,
        keyLength: this.config.supabase.serviceRoleKey?.length || 0
      })
    } catch (error) {
      console.error('electron-orders:config-load-error', error)
    }
  }

  private initSupabase() {
    if (!this.config) return

    try {
      console.log('electron-orders:initSupabase-start')

      this.supabase = createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey)
      this.orderService = new OrderService(this.supabase)
      
      console.log('electron-orders:supabase-initialized')
    } catch (error) {
      console.error('electron-orders:supabase-init-error', error)
      this.showError(`Erro ao inicializar Supabase: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  private async loadAllOrders() {
    if (!this.orderService) return

    const board = document.getElementById('kanbanBoard')
    if (!board) return

    this.columns.forEach(col => {
      col.loading = true
      col.error = null
    })
    this.renderKanban()

    try {
      const [received, preparing, ready] = await Promise.all([
        this.orderService.getOrdersByStatus('Recebido'),
        this.orderService.getOrdersByStatus('Em Preparo'),
        this.orderService.getOrdersByStatus('Pronto')
      ])

      this.columns[0].orders = received
      this.columns[1].orders = preparing
      this.columns[2].orders = ready

      this.columns.forEach(col => {
        col.loading = false
      })

      this.renderKanban()
      console.log('electron-orders:all-orders-loaded', {
        received: received.length,
        preparing: preparing.length,
        ready: ready.length
      })
    } catch (error) {
      console.error('electron-orders:load-orders-error', error)
      const errorMessage = error instanceof Error 
        ? error.message.includes('TIMEOUT')
          ? 'Tempo de espera esgotado. Clique para tentar novamente.'
          : `Erro ao carregar pedidos: ${error.message}`
        : 'Erro desconhecido ao carregar pedidos.'
      
      this.columns.forEach(col => {
        col.loading = false
        col.error = errorMessage
      })
      this.renderKanban()
      this.showError(errorMessage, () => this.loadAllOrders())
    }
  }

  private setupRealtimeSubscriptions() {
    if (!this.supabase) {
      console.error('electron-orders:setupRealtime-no-supabase')
      return
    }

    console.log('electron-orders:setupRealtime-start')

    try {
      this.insertChannel = this.supabase
        .channel('new-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: 'status=eq.Recebido',
          },
          (payload) => {
            console.log('electron-orders:realtime-insert', payload)
            this.handleNewOrder(payload.new as Order)
          }
        )
        .subscribe((status) => {
          console.log('electron-orders:realtime-insert-status', status)
          if (status === 'SUBSCRIBED') {
            this.updateConnectionStatus('connected')
            this.reconnectAttempts = 0
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.updateConnectionStatus('disconnected')
            this.handleReconnection()
          }
        })

      this.updateChannel = this.supabase
        .channel('order-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: 'status=in.(Recebido,Em Preparo,Pronto)',
          },
          (payload) => {
            console.log('electron-orders:realtime-update', payload)
            this.handleStatusUpdate(payload.new as Order, payload.old as Order)
          }
        )
        .subscribe((status) => {
          console.log('electron-orders:realtime-update-status', status)
          if (status === 'SUBSCRIBED') {
            this.updateConnectionStatus('connected')
            this.reconnectAttempts = 0
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.updateConnectionStatus('disconnected')
            this.handleReconnection()
          }
        })

      console.log('electron-orders:realtime-channels-created')
    } catch (error) {
      console.error('electron-orders:setupRealtime-error', error)
      this.showError(`Erro ao configurar Realtime: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  private handleNewOrder(order: Order) {
    if (!order.id) {
      console.error('electron-orders:order-without-id', order)
      return
    }

    if (this.notifiedOrderIds.has(order.id)) {
      console.log('electron-orders:order-already-notified', { orderId: order.id })
      const existingOrder = this.columns[0].orders.find(o => o.id === order.id)
      if (!existingOrder) {
        this.columns[0].orders.unshift(order)
        this.renderKanban()
      }
      return
    }

    // Adicionar ao cache
    this.notifiedOrderIds.add(order.id)
    
    if (this.notifiedOrderIds.size > 100) {
      const firstId = this.notifiedOrderIds.values().next().value
      if (firstId) {
        this.notifiedOrderIds.delete(firstId)
      }
    }

    setTimeout(() => {
      this.notifiedOrderIds.delete(order.id)
    }, 5 * 60 * 1000)

    this.columns[0].orders.unshift(order)
    this.renderKanban()

    this.showNotification(order)
    this.playNotificationSound()

    console.log('electron-orders:new-order-received', {
      orderId: order.id,
      orderType: order.order_type,
      total: order.total,
    })
  }

  private handleStatusUpdate(newOrder: Order, oldOrder: Order) {
    if (!newOrder.id) return

 
    const createdAt = new Date(newOrder.created_at).getTime()
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
    if (createdAt < twentyFourHoursAgo) {
      return 
    }

    const optimisticUpdate = this.optimisticUpdates.get(newOrder.id)
    if (optimisticUpdate) {
      const realtimeTime = new Date(newOrder.updated_at).getTime()
      const optimisticTime = optimisticUpdate.timestamp

      if (realtimeTime > optimisticTime && newOrder.status !== optimisticUpdate.status) {
        console.warn('electron-orders:conflict-detected', {
          orderId: newOrder.id,
          optimisticStatus: optimisticUpdate.status,
          realtimeStatus: newOrder.status
        })
        this.optimisticUpdates.delete(newOrder.id)
        this.showConflictNotification(newOrder.id)
      } else {
        this.optimisticUpdates.delete(newOrder.id)
      }
    }

    this.moveOrderToColumn(newOrder.id, newOrder.status, newOrder)
  }

  private moveOrderToColumn(orderId: string, newStatus: 'Recebido' | 'Em Preparo' | 'Pronto', orderData?: Order) {
    this.columns.forEach(col => {
      col.orders = col.orders.filter(o => o.id !== orderId)
    })

    const targetColumn = this.columns.find(col => col.status === newStatus)
    if (targetColumn && orderData) {
      targetColumn.orders.unshift(orderData)
      targetColumn.orders.sort((a, b) => {
        const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (dateDiff !== 0) return dateDiff
        return b.total - a.total
      })
      if (targetColumn.orders.length > 50) {
        targetColumn.orders = targetColumn.orders.slice(0, 50)
      }
    }

    this.renderKanban()
  }

  private async updateOrderStatus(orderId: string, newStatus: 'Recebido' | 'Em Preparo' | 'Pronto') {
    if (!this.orderService) {
      console.error('electron-orders:no-order-service')
      return
    }

    let currentOrder: Order | undefined
    for (const col of this.columns) {
      currentOrder = col.orders.find(o => o.id === orderId)
      if (currentOrder) break
    }

    if (!currentOrder) {
      console.error('electron-orders:order-not-found', { orderId })
      return
    }

    if (!this.orderService.isValidTransition(currentOrder.status, newStatus)) {
      console.error('electron-orders:invalid-transition', {
        orderId,
        currentStatus: currentOrder.status,
        newStatus
      })
      this.showError(`Transição inválida: não é possível mudar de '${currentOrder.status}' para '${newStatus}'`)
      return
    }

    const optimisticOrder: Order = { ...currentOrder, status: newStatus, updated_at: new Date().toISOString() }
    this.optimisticUpdates.set(orderId, {
      status: newStatus,
      timestamp: Date.now()
    })
    this.moveOrderToColumn(orderId, newStatus, optimisticOrder)

    try {
      const updatedOrder = await this.orderService.updateStatus(orderId, newStatus)
      
      this.optimisticUpdates.delete(orderId)
      this.moveOrderToColumn(orderId, newStatus, updatedOrder)
      
      console.log('electron-orders:status-updated', { orderId, newStatus })
    } catch (error) {
      console.error('electron-orders:status-update-error', error)
      
      this.optimisticUpdates.delete(orderId)
      this.moveOrderToColumn(orderId, currentOrder.status, currentOrder)
      
      const errorMessage = error instanceof Error 
        ? error.message.includes('TIMEOUT')
          ? 'Tempo de espera esgotado. Tente novamente.'
          : error.message.includes('Transição inválida')
          ? error.message
          : `Erro ao atualizar status: ${error.message}`
        : 'Erro desconhecido ao atualizar status.'
      
      this.showError(errorMessage)
    }
  }

  private async showOrderDetails(orderId: string) {
    if (!this.orderService) return

    this.currentModalOrderId = orderId

    try {
      const { order, items } = await this.orderService.getOrderDetails(orderId)
      this.renderOrderModal(order, items)
    } catch (error) {
      console.error('electron-orders:get-order-details-error', error)
      const errorMessage = error instanceof Error 
        ? error.message.includes('TIMEOUT')
          ? 'Tempo de espera esgotado. Tente novamente.'
          : `Erro ao carregar detalhes: ${error.message}`
        : 'Erro desconhecido ao carregar detalhes.'
      
      this.renderOrderModalError(errorMessage, orderId)
    }
  }

  private renderOrderModal(order: Order, items: OrderItem[]) {
    const modalOverlay = document.createElement('div')
    modalOverlay.className = 'modal-overlay'
    modalOverlay.id = 'orderModal'
    
    const orderIdShort = order.id.slice(-8)
    const customerInfo = order.order_type === 'Retirada'
      ? (order.customer_name || order.customer_phone || 'N/A')
      : `Mesa ${order.table_number || 'N/A'}`
    
    const totalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(order.total)

    const subtotalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(order.subtotal)

    const discountFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(order.discount)

    const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(order.created_at))

    const statusButton = order.status === 'Recebido'
      ? '<button class="modal-button primary" onclick="window.ordersApp.updateOrderStatus(\'' + order.id + '\', \'Em Preparo\')">Iniciar Preparo</button>'
      : order.status === 'Em Preparo'
      ? '<button class="modal-button primary" onclick="window.ordersApp.updateOrderStatus(\'' + order.id + '\', \'Pronto\')">Marcar Pronto</button>'
      : ''

    const itemsHtml = items.map(item => {
      const itemTotalFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(item.total_price)

      const optionsHtml = item.options.length > 0
        ? `<div class="modal-item-options">
            ${item.options.map(opt => `
              <div class="modal-item-option">
                ${opt.option_group_name}: ${opt.option_name} (+${new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(opt.additional_price)})
              </div>
            `).join('')}
          </div>`
        : ''

      const notesHtml = item.notes
        ? `<div class="modal-item-notes">Observação: ${item.notes}</div>`
        : ''

      return `
        <li class="modal-item">
          <div class="modal-item-header">
            <span class="modal-item-name">${item.product_name}</span>
            <span class="modal-item-price">${itemTotalFormatted}</span>
          </div>
          <div class="modal-item-quantity">Quantidade: ${item.quantity}</div>
          ${optionsHtml}
          ${notesHtml}
        </li>
      `
    }).join('')

    modalOverlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Pedido #${orderIdShort}</h2>
          <button class="modal-close" onclick="document.getElementById('orderModal').remove()" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-section">
            <div class="modal-section-title">Informações do Pedido</div>
            <div class="modal-info-grid">
              <div class="modal-info-item">
                <div class="modal-info-label">Tipo</div>
                <div class="modal-info-value">${order.order_type}</div>
              </div>
              <div class="modal-info-item">
                <div class="modal-info-label">Cliente/Mesa</div>
                <div class="modal-info-value">${customerInfo}</div>
              </div>
              <div class="modal-info-item">
                <div class="modal-info-label">Status</div>
                <div class="modal-info-value">${order.status}</div>
              </div>
              <div class="modal-info-item">
                <div class="modal-info-label">Data/Hora</div>
                <div class="modal-info-value">${dateFormatted}</div>
              </div>
            </div>
          </div>
          <div class="modal-section">
            <div class="modal-section-title">Itens do Pedido</div>
            <ul class="modal-items-list">
              ${itemsHtml}
            </ul>
          </div>
          <div class="modal-summary">
            <div class="modal-summary-row">
              <span>Subtotal</span>
              <span>${subtotalFormatted}</span>
            </div>
            ${order.discount > 0 ? `
              <div class="modal-summary-row">
                <span>Desconto</span>
                <span>-${discountFormatted}</span>
              </div>
            ` : ''}
            <div class="modal-summary-row total">
              <span>Total</span>
              <span>${totalFormatted}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          ${statusButton}
          <button class="modal-button secondary" onclick="document.getElementById('orderModal').remove()">Fechar</button>
        </div>
      </div>
    `

    document.body.appendChild(modalOverlay)

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.remove()
        this.currentModalOrderId = null
      }
    })

    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modalOverlay.remove()
        this.currentModalOrderId = null
        document.removeEventListener('keydown', escapeHandler)
      }
    }
    document.addEventListener('keydown', escapeHandler)
  }

  private renderOrderModalError(errorMessage: string, orderId: string) {
    const modalOverlay = document.createElement('div')
    modalOverlay.className = 'modal-overlay'
    modalOverlay.id = 'orderModal'
    
    modalOverlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Erro ao Carregar Detalhes</h2>
          <button class="modal-close" onclick="document.getElementById('orderModal').remove()" aria-label="Fechar">×</button>
        </div>
        <div class="modal-body">
          <div class="error">
            <p>${errorMessage}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-button primary" onclick="window.ordersApp.showOrderDetails('${orderId}'); document.getElementById('orderModal').remove()">Tentar Novamente</button>
          <button class="modal-button secondary" onclick="document.getElementById('orderModal').remove()">Fechar</button>
        </div>
      </div>
    `

    document.body.appendChild(modalOverlay)

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.remove()
        this.currentModalOrderId = null
      }
    })
  }

  private renderKanban() {
    const board = document.getElementById('kanbanBoard')
    if (!board) return

    board.innerHTML = this.columns.map(col => this.renderColumn(col)).join('')

    this.columns.forEach(col => {
      const columnElement = document.getElementById(`column-${col.id}`)
      if (columnElement) {
        this.setupColumnDragAndDrop(columnElement, col)
      }

      col.orders.forEach(order => {
        const cardElement = document.getElementById(`order-card-${order.id}`)
        if (cardElement) {
          this.setupCardDragAndDrop(cardElement, order)
          this.setupCardClickHandlers(cardElement, order)
        }
      })
    })
  }

  private setupColumnDragAndDrop(columnElement: HTMLElement, column: KanbanColumn) {
    columnElement.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      const dragData = (e as DragEvent).dataTransfer
      if (!dragData) return

      const orderId = dragData.getData('text/plain')
      if (!orderId) return

      let draggedOrder: Order | undefined
      for (const col of this.columns) {
        draggedOrder = col.orders.find(o => o.id === orderId)
        if (draggedOrder) break
      }

      if (!draggedOrder) return

      const isValidTransition = this.orderService?.isValidTransition(draggedOrder.status, column.status) || false

      if (isValidTransition) {
        columnElement.classList.add('drag-over')
        columnElement.classList.remove('drag-over-invalid')
        dragData.dropEffect = 'move'
      } else {
        columnElement.classList.add('drag-over-invalid')
        columnElement.classList.remove('drag-over')
        dragData.dropEffect = 'none'
      }
    })

    columnElement.addEventListener('dragleave', (e) => {
      e.preventDefault()
      e.stopPropagation()
      columnElement.classList.remove('drag-over', 'drag-over-invalid')
    })

    columnElement.addEventListener('drop', (e) => {
      e.preventDefault()
      e.stopPropagation()
      columnElement.classList.remove('drag-over', 'drag-over-invalid')

      const dragData = (e as DragEvent).dataTransfer
      if (!dragData) return

      const orderId = dragData.getData('text/plain')
      if (!orderId) return

      let draggedOrder: Order | undefined
      for (const col of this.columns) {
        draggedOrder = col.orders.find(o => o.id === orderId)
        if (draggedOrder) break
      }

      if (!draggedOrder) return

      const isValidTransition = this.orderService?.isValidTransition(draggedOrder.status, column.status) || false

      if (isValidTransition) {
        this.updateOrderStatus(orderId, column.status)
      }
    })
  }

  private setupCardDragAndDrop(cardElement: HTMLElement, order: Order) {
    cardElement.setAttribute('draggable', 'true')
    cardElement.setAttribute('aria-grabbed', 'false')

    cardElement.addEventListener('dragstart', (e) => {
      const dragEvent = e as DragEvent
      if (!dragEvent.dataTransfer) return

      dragEvent.dataTransfer.effectAllowed = 'move'
      dragEvent.dataTransfer.setData('text/plain', order.id)
      
      cardElement.classList.add('dragging')
      cardElement.setAttribute('aria-grabbed', 'true')

      const orderIdShort = order.id.slice(-8)
      cardElement.setAttribute('aria-label', `Arrastando pedido ${orderIdShort}`)
    })

    cardElement.addEventListener('dragend', (e) => {
      cardElement.classList.remove('dragging')
      cardElement.setAttribute('aria-grabbed', 'false')

      document.querySelectorAll('.kanban-column').forEach(col => {
        col.classList.remove('drag-over', 'drag-over-invalid')
      })

      const orderIdShort = order.id.slice(-8)
      const orderType = order.order_type === 'Retirada' ? 'Retirada' : 'Consumo no Local'
      const totalFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(order.total)
      cardElement.setAttribute('aria-label', `Pedido ${orderIdShort}, ${orderType}, ${totalFormatted}`)
    })

    cardElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const currentColumn = this.columns.find(col => col.orders.some(o => o.id === order.id))
        if (!currentColumn) return

        const validTransitions = this.orderService?.isValidTransition(order.status, 'Em Preparo')
          ? ['Em Preparo']
          : this.orderService?.isValidTransition(order.status, 'Pronto')
          ? ['Pronto']
          : []

        if (validTransitions.length > 0) {
          const nextStatus = validTransitions[0] as 'Recebido' | 'Em Preparo' | 'Pronto'
          this.updateOrderStatus(order.id, nextStatus)
        }
      }
    })
  }

  private setupCardClickHandlers(cardElement: HTMLElement, order: Order) {
    const actionButton = cardElement.querySelector('.order-card-kanban-button')
    if (actionButton) {
      actionButton.addEventListener('click', (e) => {
        e.stopPropagation()
        const newStatus = order.status === 'Recebido' ? 'Em Preparo' : 'Pronto'
        this.updateOrderStatus(order.id, newStatus)
      })
    }

    cardElement.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.order-card-kanban-button')) {
        return
      }
      if (cardElement.classList.contains('dragging')) {
        return
      }
      this.showOrderDetails(order.id)
    })
  }

  private renderColumn(column: KanbanColumn): string {
    const ordersHtml = column.loading
      ? '<div class="loading">Carregando pedidos...</div>'
      : column.error
      ? `<div class="error"><p>${column.error}</p><button onclick="window.ordersApp.retry && window.ordersApp.retry()">Tentar Novamente</button></div>`
      : column.orders.length === 0
      ? `<div class="empty">Nenhum pedido em ${column.title.toLowerCase()}</div>`
      : column.orders.map(order => this.renderOrderCard(order)).join('')

    return `
      <div class="kanban-column ${column.id}" id="column-${column.id}" role="region" aria-label="Coluna ${column.title}">
        <div class="kanban-column-header">
          <h3 class="kanban-column-title">${column.title}</h3>
          <span class="kanban-column-count">${column.orders.length}</span>
        </div>
        <div class="kanban-column-content" role="group" aria-label="Pedidos em ${column.title}">
          ${ordersHtml}
        </div>
      </div>
    `
  }

  private renderOrderCard(order: Order): string {
    const orderIdShort = order.id.slice(-8)
    const orderType = order.order_type === 'Retirada' ? 'Retirada' : 'Consumo no Local'
    const customerInfo = order.order_type === 'Retirada'
      ? (order.customer_name ? `Cliente: ${order.customer_name}` : order.customer_phone ? `Cliente: ${order.customer_phone}` : 'Cliente: N/A')
      : `Mesa ${order.table_number || 'N/A'}`
    
    const totalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(order.total)

    const timeFormatted = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(order.created_at))

    const actionButton = order.status === 'Recebido'
      ? '<button class="order-card-kanban-button start-prepare">Iniciar Preparo</button>'
      : order.status === 'Em Preparo'
      ? '<button class="order-card-kanban-button mark-ready">Marcar Pronto</button>'
      : ''

    return `
      <div class="order-card-kanban" id="order-card-${order.id}" role="button" tabindex="0" aria-label="Pedido ${orderIdShort}, ${orderType}, ${totalFormatted}. Use Enter para mover para próxima etapa." draggable="true" aria-grabbed="false">
        <div class="order-card-kanban-header">
          <span class="order-card-kanban-id">#${orderIdShort}</span>
          <span class="order-card-kanban-type ${order.order_type === 'Retirada' ? 'retirada' : 'consumo'}">${orderType}</span>
        </div>
        <div class="order-card-kanban-info">
          <div class="order-card-kanban-customer">${customerInfo}</div>
          <div class="order-card-kanban-time">${timeFormatted}</div>
        </div>
        <div class="order-card-kanban-total">${totalFormatted}</div>
        ${actionButton ? `<div class="order-card-kanban-actions">${actionButton}</div>` : ''}
      </div>
    `
  }

  private showNotification(order: Order) {
    const container = document.getElementById('notificationsContainer')
    if (!container) return

    if (this.notifications.length >= 5) {
      const oldest = this.notifications.shift()
      if (oldest) {
        const element = document.getElementById(`notification-${oldest.id}`)
        if (element) {
          element.remove()
        }
      }
    }

    const notificationId = `notification-${Date.now()}-${Math.random()}`
    const notification: Notification = {
      id: notificationId,
      orderId: order.id,
      orderType: order.order_type,
      total: order.total,
      timestamp: Date.now(),
    }

    this.notifications.push(notification)

    const notificationElement = document.createElement('div')
    notificationElement.id = `notification-${notificationId}`
    notificationElement.className = 'notification'
    notificationElement.setAttribute('role', 'alert')
    notificationElement.setAttribute('aria-live', 'assertive')
    
    const orderIdShort = order.id.slice(-8)
    const orderTypeText = order.order_type === 'Retirada' ? 'Retirada' : 'Consumo no Local'
    const totalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(order.total)

    notificationElement.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">Novo Pedido Recebido!</div>
        <div class="notification-details">
          Pedido #${orderIdShort} • ${orderTypeText} • ${totalFormatted}
        </div>
      </div>
      <button class="notification-close" aria-label="Fechar notificação" tabindex="0">×</button>
    `

    const autoCloseTimeout = setTimeout(() => {
      this.removeNotification(notificationId)
    }, this.config?.notifications.autoCloseDelay || 5000)

    const closeButton = notificationElement.querySelector('.notification-close')
    closeButton?.addEventListener('click', () => {
      clearTimeout(autoCloseTimeout)
      this.removeNotification(notificationId)
    })

    notificationElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearTimeout(autoCloseTimeout)
        this.removeNotification(notificationId)
      }
    })

    container.appendChild(notificationElement)

    setTimeout(() => {
      (closeButton as HTMLElement)?.focus()
    }, 100)
  }

  private removeNotification(notificationId: string) {
    const element = document.getElementById(`notification-${notificationId}`)
    if (element) {
      element.style.animation = 'slideIn 0.3s ease-out reverse'
      setTimeout(() => {
        element.remove()
        this.notifications = this.notifications.filter(n => n.id !== notificationId)
      }, 300)
    }
  }

  private showConflictNotification(orderId: string) {
    const orderIdShort = orderId.slice(-8)
    const notificationElement = document.createElement('div')
    notificationElement.className = 'notification'
    notificationElement.style.background = '#f59e0b'
    notificationElement.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">Pedido Atualizado</div>
        <div class="notification-details">
          Pedido #${orderIdShort} foi atualizado por outro usuário. Atualizando...
        </div>
      </div>
    `
    
    const container = document.getElementById('notificationsContainer')
    if (container) {
      container.appendChild(notificationElement)
      setTimeout(() => {
        notificationElement.remove()
      }, 3000)
    }
  }

  private playNotificationSound() {
    if (!this.config?.notifications.soundEnabled) {
      return
    }

    try {
      const audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = this.config.notifications.soundVolume || 0.7

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.1)

      console.log('electron-orders:sound-played')
    } catch (error) {
      console.error('electron-orders:sound-error', error)
    }
  }

  private updateConnectionStatus(status: 'connected' | 'disconnected' | 'reconnecting', attempts?: number) {
    const statusElement = document.getElementById('connectionStatus')
    if (!statusElement) return

    statusElement.className = `connection-status ${status}`
    
    if (status === 'connected') {
      statusElement.innerHTML = '<span class="status-dot"></span><span>Conectado</span>'
    } else if (status === 'disconnected') {
      statusElement.innerHTML = '<span class="status-dot"></span><span>Desconectado</span>'
    } else if (status === 'reconnecting') {
      statusElement.innerHTML = `<span class="status-dot"></span><span>Tentando reconectar... (${attempts || 0} tentativas)</span>`
    }
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionStatus('disconnected')
      this.showError('Falha ao conectar após múltiplas tentativas. Intervenção manual necessária.')
      return
    }

    const baseDelay = 5000
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), 60000)
    this.reconnectAttempts++

    this.updateConnectionStatus('reconnecting', this.reconnectAttempts)

    this.reconnectTimeout = setTimeout(() => {
      console.log('electron-orders:reconnecting', { attempt: this.reconnectAttempts })
      this.setupRealtimeSubscriptions()
    }, delay)
  }

  private showError(message: string, onRetry?: () => void) {
    setTimeout(() => {
      const container = document.getElementById('errorContainer')
      
      if (!container) {
        const mainContainer = document.querySelector('.container')
        if (mainContainer) {
          const newContainer = document.createElement('div')
          newContainer.id = 'errorContainer'
          const header = mainContainer.querySelector('.header')
          if (header && header.nextSibling) {
            mainContainer.insertBefore(newContainer, header.nextSibling)
          } else {
            mainContainer.appendChild(newContainer)
          }
          setTimeout(() => this.showError(message, onRetry), 50)
          return
        }
        return
      }

      container.innerHTML = `
        <div class="error">
          <p>${message}</p>
          ${onRetry ? '<button onclick="window.ordersApp.retry()">Tentar Novamente</button>' : ''}
        </div>
      `

      if (onRetry) {
        window.ordersApp.retry = onRetry
      }
    }, 50)
  }
}

console.log('electron-orders:renderer-script-loaded')

if (document.readyState === 'loading') {
  console.log('electron-orders:waiting-for-dom')
  document.addEventListener('DOMContentLoaded', () => {
    console.log('electron-orders:dom-ready')
    new OrdersApp()
  })
} else {
  console.log('electron-orders:dom-already-ready')
  new OrdersApp()
}

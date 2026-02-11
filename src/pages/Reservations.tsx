import { useEffect, useState } from 'react'
import { Table, Card, DatePicker, Select, Tag, message, Button, Space, Drawer, Descriptions, Tabs, Modal, Form, Input, Badge } from 'antd'
import { get, post, put } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Reservation {
  id: number
  serviceName: string
  date: string
  startTime: string
  endTime?: string
  status: string
  remark?: string
  customer?: { id: number; name: string; phone: string }
  staff?: { id: number; name: string }
  room?: { name: string }
  createdAt: string
}

interface Order {
  id: number
  totalAmount: number
  paymentMethod: string
  status: string
  customer?: { name: string; phone: string }
  items?: any[]
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'orange' },
  confirmed: { text: '已确认', color: 'blue' },
  in_progress: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'green' },
  cancelled: { text: '已取消', color: 'default' }
}

export default function Reservations() {
  const [activeTab, setActiveTab] = useState('reservations')
  // 预约
  const [list, setList] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(dayjs())
  const [status, setStatus] = useState<string | undefined>()
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  // 详情
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Reservation | null>(null)
  // 订单
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  // 新建预约
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: 20,
        date: date.format('YYYY-MM-DD')
      }
      if (status) params.status = status
      const res = await get<Reservation[]>('/reservations', params)
      const data = res.data as any
      setList(Array.isArray(data) ? data : data?.data ?? [])
      if (res.pagination) setPagination(p => ({ ...p, current: res.pagination!.page, total: res.pagination!.total }))
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const res = await get<Order[]>('/orders', { page: 1, pageSize: 50 })
      const data = res.data as any
      setOrders(Array.isArray(data) ? data : data?.data ?? [])
    } catch {
      // ignore
    }
    setOrdersLoading(false)
  }

  useEffect(() => { load(1) }, [date, status])
  useEffect(() => { if (activeTab === 'orders') loadOrders() }, [activeTab])

  const handleAction = async (id: number, action: string) => {
    try {
      const res = await post(`/reservations/${id}/${action}`)
      if (res.success) {
        message.success('操作成功')
        load(pagination.current)
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e: any) {
      message.error('操作失败')
    }
  }

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      const res = await post('/reservations', {
        ...values,
        date: values.date.format('YYYY-MM-DD')
      })
      if (res.success) {
        message.success('创建成功')
        setCreateOpen(false)
        createForm.resetFields()
        load(1)
      } else {
        message.error(res.message || '创建失败')
      }
    } catch {
      // validation error
    }
  }

  const columns: ColumnsType<Reservation> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '客户', dataIndex: ['customer', 'name'], width: 90 },
    { title: '手机', dataIndex: ['customer', 'phone'], width: 120 },
    { title: '服务', dataIndex: 'serviceName', width: 120 },
    { title: '日期', dataIndex: 'date', width: 110, render: v => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
    { title: '时段', dataIndex: 'startTime', width: 80 },
    { title: '技师', dataIndex: ['staff', 'name'], width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: v => {
        const s = statusMap[v] || { text: v, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      }
    },
    {
      title: '操作', width: 200, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <a onClick={() => { setDetail(r); setDetailOpen(true) }}>详情</a>
          {r.status === 'pending' && <a onClick={() => handleAction(r.id, 'confirm')}>确认</a>}
          {r.status === 'confirmed' && <a onClick={() => handleAction(r.id, 'start')}>开始</a>}
          {r.status === 'in_progress' && <a onClick={() => handleAction(r.id, 'complete')}>完成</a>}
          {['pending', 'confirmed'].includes(r.status) && (
            <a style={{ color: '#ff4d4f' }} onClick={() => handleAction(r.id, 'cancel')}>取消</a>
          )}
        </Space>
      )
    }
  ]

  const orderColumns: ColumnsType<Order> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '客户', dataIndex: ['customer', 'name'], width: 100 },
    { title: '金额', dataIndex: 'totalAmount', width: 100, render: v => `¥${v || 0}` },
    { title: '支付', dataIndex: 'paymentMethod', width: 80 },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag>{v}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' }
  ]

  // 统计各状态数量
  const statusCounts = list.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <Card
        title="预约收银"
        extra={<Button type="primary" onClick={() => setCreateOpen(true)}>新建预约</Button>}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'reservations',
              label: '预约管理',
              children: (
                <>
                  <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <DatePicker value={date} onChange={d => d && setDate(d)} />
                    <Select
                      placeholder="全部状态"
                      allowClear
                      style={{ width: 120 }}
                      options={Object.entries(statusMap).map(([k, v]) => ({ label: v.text, value: k }))}
                      value={status}
                      onChange={setStatus}
                    />
                    <Space>
                      {Object.entries(statusCounts).map(([k, v]) => {
                        const s = statusMap[k] || { text: k, color: 'default' }
                        return <Badge key={k} count={v} color={s.color === 'processing' ? '#1677ff' : undefined}><Tag>{s.text}</Tag></Badge>
                      })}
                    </Space>
                  </div>
                  <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={list}
                    scroll={{ x: 1000 }}
                    pagination={{ ...pagination, showTotal: t => `共 ${t} 条`, onChange: page => load(page) }}
                  />
                </>
              )
            },
            {
              key: 'orders',
              label: '订单管理',
              children: (
                <Table
                  rowKey="id"
                  loading={ordersLoading}
                  columns={orderColumns}
                  dataSource={orders}
                  pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* 预约详情抽屉 */}
      <Drawer
        title="预约详情"
        width={480}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="预约ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="客户">{detail.customer?.name} ({detail.customer?.phone})</Descriptions.Item>
            <Descriptions.Item label="服务">{detail.serviceName}</Descriptions.Item>
            <Descriptions.Item label="日期">{detail.date ? dayjs(detail.date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
            <Descriptions.Item label="时段">{detail.startTime}{detail.endTime ? ` - ${detail.endTime}` : ''}</Descriptions.Item>
            <Descriptions.Item label="技师">{detail.staff?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="房间">{detail.room?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[detail.status]?.color}>{statusMap[detail.status]?.text || detail.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="备注">{detail.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{detail.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* 新建预约弹窗 */}
      <Modal
        title="新建预约"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="serviceName" label="服务名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：盆底康复" />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="startTime" label="开始时间" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：09:00" />
          </Form.Item>
          <Form.Item name="customerId" label="客户ID">
            <Input type="number" placeholder="客户ID" />
          </Form.Item>
          <Form.Item name="staffId" label="技师ID">
            <Input type="number" placeholder="技师ID" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

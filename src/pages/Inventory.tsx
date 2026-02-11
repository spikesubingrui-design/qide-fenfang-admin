import { useEffect, useState } from 'react'
import { Table, Card, message, Button, Space, Modal, Form, Input, InputNumber, Tag, Tabs, Select } from 'antd'
import { get, post, put } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import { WarningOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface InventoryRow {
  id: number
  quantity: number
  item?: { id: number; name: string; category: string; unit: string; minStock: number }
  branch?: { id: number; name: string }
}

interface InventoryItem {
  id: number
  name: string
  category: string
  unit: string
  minStock: number
  price: number | null
}

export default function Inventory() {
  const [list, setList] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('stock')
  // 物品列表
  const [items, setItems] = useState<InventoryItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  // 入库/出库
  const [stockOpen, setStockOpen] = useState(false)
  const [stockType, setStockType] = useState<'in' | 'out'>('in')
  const [stockForm] = Form.useForm()
  // 添加物品
  const [itemOpen, setItemOpen] = useState(false)
  const [itemForm] = Form.useForm()

  const loadStock = async () => {
    setLoading(true)
    try {
      const res = await get('/inventory')
      const data = res.data as any
      setList(Array.isArray(data) ? data : data?.data ?? [])
    } catch (e: any) {
      message.error(e.message || '加载失败')
    }
    setLoading(false)
  }

  const loadItems = async () => {
    setItemsLoading(true)
    try {
      const res = await get('/inventory/items')
      const data = res.data as any
      setItems(Array.isArray(data) ? data : data?.data ?? [])
    } catch { /* ignore */ }
    setItemsLoading(false)
  }

  useEffect(() => { loadStock() }, [])
  useEffect(() => { if (activeTab === 'items') loadItems() }, [activeTab])

  // 库存预警：数量低于最低库存
  const lowStockItems = list.filter(r => r.item && r.quantity <= (r.item.minStock || 0))

  const openStockModal = (type: 'in' | 'out') => {
    setStockType(type)
    stockForm.resetFields()
    setStockOpen(true)
  }

  const handleStock = async () => {
    try {
      const values = await stockForm.validateFields()
      // 从选中的库存行提取 branchId 和 itemId
      const row = list.find(r => r.id === values.inventoryId)
      if (!row) { message.error('请选择物品'); return }
      const url = stockType === 'in' ? '/inventory/in' : '/inventory/out'
      const res = await post(url, {
        branchId: row.branch?.id || 1,
        itemId: row.item?.id || 0,
        quantity: values.quantity,
        reason: values.remark || ''
      })
      if (res.success) {
        message.success(stockType === 'in' ? '入库成功' : '出库成功')
        setStockOpen(false)
        loadStock()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch {
      // validation
    }
  }

  const handleAddItem = async () => {
    try {
      const values = await itemForm.validateFields()
      const res = await post('/inventory/items', values)
      if (res.success) {
        message.success('添加成功')
        setItemOpen(false)
        loadItems()
      } else {
        message.error(res.message || '添加失败')
      }
    } catch {
      // validation
    }
  }

  const stockColumns: ColumnsType<InventoryRow> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '物品', dataIndex: ['item', 'name'], width: 140 },
    { title: '分类', dataIndex: ['item', 'category'], width: 100 },
    {
      title: '数量', dataIndex: 'quantity', width: 100,
      render: (v, r) => {
        const isLow = r.item && v <= (r.item.minStock || 0)
        return (
          <span style={{ color: isLow ? '#ff4d4f' : undefined, fontWeight: isLow ? 'bold' : undefined }}>
            {v} {r.item?.unit || ''}
            {isLow && <WarningOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />}
          </span>
        )
      }
    },
    { title: '单位', dataIndex: ['item', 'unit'], width: 60 },
    {
      title: '最低库存', dataIndex: ['item', 'minStock'], width: 90,
      render: v => v || 0
    },
    { title: '门店', dataIndex: ['branch', 'name'], width: 120 }
  ]

  const itemColumns: ColumnsType<InventoryItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', width: 140 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    { title: '最低库存', dataIndex: 'minStock', width: 90 },
    { title: '单价', dataIndex: 'price', width: 90, render: v => v != null ? `¥${v}` : '-' }
  ]

  return (
    <>
      <Card
        title="库存管理"
        extra={
          <Space>
            {lowStockItems.length > 0 && (
              <Tag icon={<WarningOutlined />} color="error">{lowStockItems.length} 项低库存预警</Tag>
            )}
            <Button icon={<PlusOutlined />} onClick={() => openStockModal('in')}>入库</Button>
            <Button icon={<MinusOutlined />} onClick={() => openStockModal('out')}>出库</Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'stock',
              label: '库存概览',
              children: (
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={stockColumns}
                  dataSource={list}
                  pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
                />
              )
            },
            {
              key: 'items',
              label: (
                <span>
                  商品列表
                  <Button type="link" size="small" onClick={e => { e.stopPropagation(); setItemOpen(true); itemForm.resetFields() }}>
                    + 添加
                  </Button>
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  loading={itemsLoading}
                  columns={itemColumns}
                  dataSource={items}
                  pagination={{ pageSize: 20 }}
                />
              )
            },
            {
              key: 'alerts',
              label: `库存预警(${lowStockItems.length})`,
              children: lowStockItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#52c41a' }}>
                  所有物品库存充足
                </div>
              ) : (
                <Table
                  rowKey="id"
                  columns={stockColumns}
                  dataSource={lowStockItems}
                  pagination={false}
                />
              )
            }
          ]}
        />
      </Card>

      {/* 入库/出库弹窗 */}
      <Modal
        title={stockType === 'in' ? '入库操作' : '出库操作'}
        open={stockOpen}
        onOk={handleStock}
        onCancel={() => setStockOpen(false)}
        okText="确认"
      >
        <Form form={stockForm} layout="vertical">
          <Form.Item name="inventoryId" label="库存项ID" rules={[{ required: true, message: '请选择' }]}>
            <Select
              placeholder="选择物品"
              options={list.map(r => ({
                label: `${r.item?.name || '物品'} (当前: ${r.quantity}${r.item?.unit || ''})`,
                value: r.id
              }))}
              showSearch
              filterOption={(input, option) => (option?.label as string)?.toLowerCase()?.includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="入库/出库原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加物品弹窗 */}
      <Modal
        title="添加物品"
        open={itemOpen}
        onOk={handleAddItem}
        onCancel={() => setItemOpen(false)}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="name" label="物品名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={[
              { label: '耗材', value: '耗材' },
              { label: '设备', value: '设备' },
              { label: '产品', value: '产品' },
              { label: '食材', value: '食材' },
              { label: '其他', value: '其他' }
            ]} />
          </Form.Item>
          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <Input placeholder="如：个、瓶、箱" />
          </Form.Item>
          <Form.Item name="minStock" label="最低库存">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="单价">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

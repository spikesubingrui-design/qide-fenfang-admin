/**
 * 服务套餐管理 - 产康项目与月子套餐的管理
 */
import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Tag, message, Modal, Form, Input, InputNumber,
  Select, Tabs, Switch, Descriptions
} from 'antd'
import { get, post, put, del } from '../api/request'
import type { ColumnsType } from 'antd/es/table'

// ==================== 类型 ====================

interface ServiceCategory {
  id: number
  name: string
  sort: number
}

interface ServiceItem {
  id: number
  name: string
  categoryId: number
  category?: { id: number; name: string }
  price: number
  duration: number
  description?: string
  status: string
  isHot?: boolean
}

interface PackageItem {
  id: number
  name: string
  type: string
  originalPrice: number
  price: number
  sessions?: number
  validDays?: number
  description?: string
  status: string
  items?: { serviceName: string; sessions: number }[]
}

interface SuiteItem {
  id: number
  name: string
  roomType: string
  days28Price: number
  days35Price?: number
  days42Price?: number
  days56Price?: number
  features?: string
  status: string
}

// ==================== 常量 ====================

const SERVICE_CATEGORIES = [
  { id: 1, name: '胸部养护' },
  { id: 2, name: '产后黄金三项' },
  { id: 3, name: '体质调理' },
  { id: 4, name: '私密项目' },
  { id: 5, name: '产后特色项目' },
  { id: 6, name: '福利卡' }
]

// ==================== 组件 ====================

export default function Services() {
  const [tab, setTab] = useState('services')

  // 服务项目
  const [services, setServices] = useState<ServiceItem[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [serviceEditId, setServiceEditId] = useState<number | null>(null)
  const [serviceForm] = Form.useForm()

  // 套餐
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [packageOpen, setPackageOpen] = useState(false)
  const [packageEditId, setPackageEditId] = useState<number | null>(null)
  const [packageForm] = Form.useForm()

  // 月子套餐
  const [suites, setSuites] = useState<SuiteItem[]>([])
  const [suitesLoading, setSuitesLoading] = useState(false)
  const [suiteOpen, setSuiteOpen] = useState(false)
  const [suiteEditId, setSuiteEditId] = useState<number | null>(null)
  const [suiteForm] = Form.useForm()

  // ==================== 加载数据 ====================

  const loadServices = async () => {
    setServicesLoading(true)
    try {
      const res = await get<ServiceItem[]>('/services', { page: 1, pageSize: 200 })
      const data = res.data as any
      setServices(Array.isArray(data) ? data : data?.data ?? [])
    } catch (e: any) {
      message.error(e.message || '加载失败')
    }
    setServicesLoading(false)
  }

  const loadPackages = async () => {
    setPackagesLoading(true)
    try {
      const res = await get<PackageItem[]>('/packages', { page: 1, pageSize: 200 })
      const data = res.data as any
      setPackages(Array.isArray(data) ? data : data?.data ?? [])
    } catch { /* ignore */ }
    setPackagesLoading(false)
  }

  const loadSuites = async () => {
    setSuitesLoading(true)
    try {
      const res = await get<SuiteItem[]>('/packages', { page: 1, pageSize: 100, type: 'suite' })
      const data = res.data as any
      setSuites(Array.isArray(data) ? data : data?.data ?? [])
    } catch { /* ignore */ }
    setSuitesLoading(false)
  }

  useEffect(() => { loadServices() }, [])
  useEffect(() => {
    if (tab === 'packages') loadPackages()
    if (tab === 'suites') loadSuites()
  }, [tab])

  // ==================== 服务项目操作 ====================

  const openServiceCreate = () => {
    setServiceEditId(null)
    serviceForm.resetFields()
    serviceForm.setFieldsValue({ status: 'active', duration: 60 })
    setServiceOpen(true)
  }

  const openServiceEdit = (record: ServiceItem) => {
    setServiceEditId(record.id)
    serviceForm.setFieldsValue({
      name: record.name,
      categoryId: record.categoryId || record.category?.id,
      price: record.price,
      duration: record.duration,
      description: record.description,
      status: record.status
    })
    setServiceOpen(true)
  }

  const handleServiceSave = async () => {
    try {
      const values = await serviceForm.validateFields()
      let res
      if (serviceEditId) {
        res = await put(`/services/${serviceEditId}`, values)
      } else {
        res = await post('/services', values)
      }
      if (res.success) {
        message.success(serviceEditId ? '更新成功' : '创建成功')
        setServiceOpen(false)
        loadServices()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch { /* validation */ }
  }

  const handleServiceToggle = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const res = await put(`/services/${id}`, { status: newStatus })
    if (res.success) {
      message.success('状态已更新')
      loadServices()
    }
  }

  // ==================== 套餐操作 ====================

  const openPackageCreate = () => {
    setPackageEditId(null)
    packageForm.resetFields()
    packageForm.setFieldsValue({ status: 'active', type: 'times' })
    setPackageOpen(true)
  }

  const openPackageEdit = (record: PackageItem) => {
    setPackageEditId(record.id)
    packageForm.setFieldsValue({
      name: record.name,
      type: record.type,
      originalPrice: record.originalPrice,
      price: record.price,
      sessions: record.sessions,
      validDays: record.validDays,
      description: record.description,
      status: record.status
    })
    setPackageOpen(true)
  }

  const handlePackageSave = async () => {
    try {
      const values = await packageForm.validateFields()
      let res
      if (packageEditId) {
        res = await put(`/packages/${packageEditId}`, values)
      } else {
        res = await post('/packages', values)
      }
      if (res.success) {
        message.success(packageEditId ? '更新成功' : '创建成功')
        setPackageOpen(false)
        loadPackages()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch { /* validation */ }
  }

  // ==================== 月子套餐操作 ====================

  const openSuiteCreate = () => {
    setSuiteEditId(null)
    suiteForm.resetFields()
    suiteForm.setFieldsValue({ status: 'active' })
    setSuiteOpen(true)
  }

  const openSuiteEdit = (record: SuiteItem) => {
    setSuiteEditId(record.id)
    suiteForm.setFieldsValue(record)
    setSuiteOpen(true)
  }

  const handleSuiteSave = async () => {
    try {
      const values = await suiteForm.validateFields()
      let res
      if (suiteEditId) {
        res = await put(`/packages/${suiteEditId}`, { ...values, type: 'suite' })
      } else {
        res = await post('/packages', { ...values, type: 'suite' })
      }
      if (res.success) {
        message.success(suiteEditId ? '更新成功' : '创建成功')
        setSuiteOpen(false)
        loadSuites()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch { /* validation */ }
  }

  // ==================== 表格列 ====================

  const serviceColumns: ColumnsType<ServiceItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '项目名', dataIndex: 'name', width: 140 },
    {
      title: '分类', dataIndex: 'categoryId', width: 120,
      render: (v, r) => {
        const cat = SERVICE_CATEGORIES.find(c => c.id === v) || r.category
        return cat ? <Tag>{cat.name}</Tag> : '-'
      }
    },
    {
      title: '单次价格', dataIndex: 'price', width: 100,
      render: v => <span style={{ color: '#C9A962', fontWeight: 600 }}>¥{v}</span>
    },
    { title: '时长(分)', dataIndex: 'duration', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v, r) => (
        <Switch
          checked={v === 'active'}
          checkedChildren="上架"
          unCheckedChildren="下架"
          onChange={() => handleServiceToggle(r.id, v)}
        />
      )
    },
    {
      title: '操作', width: 80,
      render: (_, r) => <a onClick={() => openServiceEdit(r)}>编辑</a>
    }
  ]

  const packageColumns: ColumnsType<PackageItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '套餐名', dataIndex: 'name', width: 160 },
    {
      title: '类型', dataIndex: 'type', width: 80,
      render: v => <Tag color={v === 'times' ? 'blue' : v === 'amount' ? 'green' : 'purple'}>
        {v === 'times' ? '次卡' : v === 'amount' ? '储值卡' : v === 'period' ? '年卡' : v}
      </Tag>
    },
    {
      title: '原价', dataIndex: 'originalPrice', width: 100,
      render: v => v ? <span style={{ textDecoration: 'line-through', color: '#999' }}>¥{v}</span> : '-'
    },
    {
      title: '售价', dataIndex: 'price', width: 100,
      render: v => <span style={{ color: '#C9A962', fontWeight: 600 }}>¥{v}</span>
    },
    { title: '次数', dataIndex: 'sessions', width: 70, render: v => v ?? '-' },
    { title: '有效天数', dataIndex: 'validDays', width: 90, render: v => v ? `${v}天` : '-' },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '在售' : '停售'}</Tag>
    },
    {
      title: '操作', width: 80,
      render: (_, r) => <a onClick={() => openPackageEdit(r)}>编辑</a>
    }
  ]

  const suiteColumns: ColumnsType<SuiteItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '套餐名', dataIndex: 'name', width: 140 },
    { title: '房型', dataIndex: 'roomType', width: 100 },
    { title: '28天', dataIndex: 'days28Price', width: 100, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '35天', dataIndex: 'days35Price', width: 100, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '42天', dataIndex: 'days42Price', width: 100, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '56天', dataIndex: 'days56Price', width: 100, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '在售' : '停售'}</Tag>
    },
    {
      title: '操作', width: 80,
      render: (_, r) => <a onClick={() => openSuiteEdit(r)}>编辑</a>
    }
  ]

  return (
    <>
      <Card title="服务套餐管理">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'services',
              label: '产康项目',
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" onClick={openServiceCreate}>添加项目</Button>
                  </div>
                  <Table
                    rowKey="id"
                    loading={servicesLoading}
                    columns={serviceColumns}
                    dataSource={services}
                    scroll={{ x: 700 }}
                    pagination={{ pageSize: 20, showTotal: t => `共 ${t} 项` }}
                  />
                </>
              )
            },
            {
              key: 'packages',
              label: '套餐卡项',
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" onClick={openPackageCreate}>添加套餐</Button>
                  </div>
                  <Table
                    rowKey="id"
                    loading={packagesLoading}
                    columns={packageColumns}
                    dataSource={packages}
                    scroll={{ x: 900 }}
                    pagination={{ pageSize: 20, showTotal: t => `共 ${t} 项` }}
                  />
                </>
              )
            },
            {
              key: 'suites',
              label: '月子套餐',
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" onClick={openSuiteCreate}>添加月子套餐</Button>
                  </div>
                  <Table
                    rowKey="id"
                    loading={suitesLoading}
                    columns={suiteColumns}
                    dataSource={suites}
                    scroll={{ x: 900 }}
                    pagination={false}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      {/* 服务项目弹窗 */}
      <Modal
        title={serviceEditId ? '编辑服务项目' : '添加服务项目'}
        open={serviceOpen}
        onOk={handleServiceSave}
        onCancel={() => setServiceOpen(false)}
        width={500}
      >
        <Form form={serviceForm} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="如：盆底肌修复" />
          </Form.Item>
          <Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select options={SERVICE_CATEGORIES.map(c => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="price" label="单次价格 (元)" rules={[{ required: true, message: '请输入价格' }]}>
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="duration" label="时长 (分钟)">
              <InputNumber min={10} max={300} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="项目简介..." />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { label: '上架', value: 'active' },
              { label: '下架', value: 'inactive' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 套餐弹窗 */}
      <Modal
        title={packageEditId ? '编辑套餐' : '添加套餐'}
        open={packageOpen}
        onOk={handlePackageSave}
        onCancel={() => setPackageOpen(false)}
        width={500}
      >
        <Form form={packageForm} layout="vertical">
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input placeholder="如：黄金三项套餐 30次" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={[
              { label: '次卡', value: 'times' },
              { label: '储值卡', value: 'amount' },
              { label: '年卡', value: 'period' }
            ]} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="originalPrice" label="原价">
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="price" label="售价" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Space size="large">
            <Form.Item name="sessions" label="次数">
              <InputNumber min={1} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="validDays" label="有效天数">
              <InputNumber min={1} style={{ width: 140 }} placeholder="如365" />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { label: '在售', value: 'active' },
              { label: '停售', value: 'inactive' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 月子套餐弹窗 */}
      <Modal
        title={suiteEditId ? '编辑月子套餐' : '添加月子套餐'}
        open={suiteOpen}
        onOk={handleSuiteSave}
        onCancel={() => setSuiteOpen(false)}
        width={560}
      >
        <Form form={suiteForm} layout="vertical">
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input placeholder="如：豪华套房A" />
          </Form.Item>
          <Form.Item name="roomType" label="房型">
            <Select options={[
              { label: '温馨小雅', value: '温馨小雅' },
              { label: '舒适大床', value: '舒适大床' },
              { label: '舒适小套', value: '舒适小套' },
              { label: '豪华套房B', value: '豪华套房B' },
              { label: '豪华套房A', value: '豪华套房A' },
              { label: '精致尊享B', value: '精致尊享B' },
              { label: '精致尊享A', value: '精致尊享A' },
              { label: 'VIP 3楼', value: 'VIP 3楼' },
              { label: 'VIP 5楼', value: 'VIP 5楼' }
            ]} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="days28Price" label="28天价格" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="days35Price" label="35天价格">
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Space size="large">
            <Form.Item name="days42Price" label="42天价格">
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="days56Price" label="56天价格">
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="features" label="特色服务">
            <Input.TextArea rows={2} placeholder="含护士一对一、月子餐..." />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { label: '在售', value: 'active' },
              { label: '停售', value: 'inactive' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

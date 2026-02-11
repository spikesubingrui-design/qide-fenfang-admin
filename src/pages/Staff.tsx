import { useEffect, useState } from 'react'
import { Table, Card, Input, Tag, message, Button, Space, Modal, Form, Select, Tabs, Statistic, Row, Col } from 'antd'
import { get, post, put } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface StaffItem {
  id: number
  name: string
  phone: string
  role: string
  level: string | null
  status: string
  hireDate: string | null
  salary: number | null
  branch?: { name: string }
  createdAt: string
}

const roleOptions = [
  { label: '店长', value: '店长' },
  { label: '产康师', value: '产康师' },
  { label: '顾问', value: '顾问' },
  { label: '护士', value: '护士' },
  { label: '厨师', value: '厨师' },
  { label: '保洁', value: '保洁' },
  { label: '其他', value: '其他' }
]

export default function Staff() {
  const [list, setList] = useState<StaffItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [activeTab, setActiveTab] = useState('list')
  // 编辑/新建
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form] = Form.useForm()
  // 业绩
  const [perfList, setPerfList] = useState<any[]>([])
  const [perfLoading, setPerfLoading] = useState(false)

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, pageSize: pagination.pageSize }
      if (keyword) params.keyword = keyword
      const res = await get<StaffItem[]>('/staff', params)
      const data = res.data as any
      setList(Array.isArray(data) ? data : data?.data ?? [])
      if (res.pagination) setPagination(p => ({ ...p, current: res.pagination!.page, total: res.pagination!.total }))
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadPerformance = async () => {
    setPerfLoading(true)
    try {
      const res = await get<any[]>('/staff', { page: 1, pageSize: 100 })
      const data = res.data as any
      const staffList = Array.isArray(data) ? data : data?.data ?? []
      // 简单展示员工列表及统计
      setPerfList(staffList)
    } catch {
      // ignore
    }
    setPerfLoading(false)
  }

  useEffect(() => { load(1) }, [])
  useEffect(() => { if (activeTab === 'performance') loadPerformance() }, [activeTab])

  const openCreate = () => {
    setEditId(null)
    form.resetFields()
    setEditOpen(true)
  }

  const openEdit = (record: StaffItem) => {
    setEditId(record.id)
    form.setFieldsValue({
      name: record.name,
      phone: record.phone,
      role: record.role,
      status: record.status
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      let res
      if (editId) {
        res = await put(`/staff/${editId}`, values)
      } else {
        res = await post('/staff', values)
      }
      if (res.success) {
        message.success(editId ? '更新成功' : '创建成功')
        setEditOpen(false)
        load(pagination.current)
      } else {
        message.error(res.message || '操作失败')
      }
    } catch {
      // validation
    }
  }

  const columns: ColumnsType<StaffItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '手机', dataIndex: 'phone', width: 130 },
    { title: '角色', dataIndex: 'role', width: 100, render: v => <Tag color="blue">{v}</Tag> },
    { title: '等级', dataIndex: 'level', width: 80 },
    { title: '门店', dataIndex: ['branch', 'name'], width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => <Tag color={v === 'active' ? 'green' : v === 'resigned' ? 'red' : 'default'}>
        {v === 'active' ? '在岗' : v === 'resigned' ? '离职' : v}
      </Tag>
    },
    {
      title: '入职时间', dataIndex: 'hireDate', width: 120,
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : '-'
    },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_, r) => <a onClick={() => openEdit(r)}>编辑</a>
    }
  ]

  // 业绩排名
  const perfColumns: ColumnsType<any> = [
    { title: '排名', width: 60, render: (_, __, i) => i + 1 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '角色', dataIndex: 'role', width: 100 },
    { title: '预约数', dataIndex: ['_count', 'reservations'], width: 80, render: v => v || 0 },
    { title: '服务数', dataIndex: ['_count', 'serviceRecords'], width: 80, render: v => v || 0 }
  ]

  return (
    <>
      <Card
        title="员工管理"
        extra={<Button type="primary" onClick={openCreate}>添加员工</Button>}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '员工列表',
              children: (
                <>
                  <Input.Search
                    placeholder="姓名/手机"
                    allowClear
                    onSearch={v => { setKeyword(v || ''); load(1) }}
                    style={{ width: 240, marginBottom: 16 }}
                  />
                  <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={list}
                    scroll={{ x: 900 }}
                    pagination={{ ...pagination, showTotal: t => `共 ${t} 条`, onChange: page => load(page) }}
                  />
                </>
              )
            },
            {
              key: 'performance',
              label: '业绩统计',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                      <Card><Statistic title="在岗人数" value={perfList.filter(s => s.status === 'active').length} /></Card>
                    </Col>
                    <Col span={8}>
                      <Card><Statistic title="产康师" value={perfList.filter(s => s.role === '产康师').length} /></Card>
                    </Col>
                    <Col span={8}>
                      <Card><Statistic title="顾问" value={perfList.filter(s => s.role === '顾问').length} /></Card>
                    </Col>
                  </Row>
                  <Table
                    rowKey="id"
                    loading={perfLoading}
                    columns={perfColumns}
                    dataSource={perfList.filter(s => s.status === 'active')}
                    pagination={false}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editId ? '编辑员工' : '添加员工'}
        open={editOpen}
        onOk={handleSave}
        onCancel={() => setEditOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { label: '在岗', value: 'active' },
              { label: '休假', value: 'vacation' },
              { label: '离职', value: 'resigned' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

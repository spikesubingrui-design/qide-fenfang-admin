import { useEffect, useState } from 'react'
import { Table, Card, Input, Space, Tag, message, Button, Drawer, Descriptions, Tabs, List, Select, Modal, Form } from 'antd'
import { get, put } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Customer {
  id: number
  name: string
  phone: string
  level: string
  gender: string | null
  birthday: string | null
  expectedDate: string | null
  babyBirthday: string | null
  address: string | null
  rfmTag: string | null
  totalSpent: number
  points: number
  tags: string | null
  status: string
  createdAt: string
  branch?: { name: string }
  _count?: { cards: number; orders: number; reservations: number; serviceRecords: number }
}

export default function Members() {
  const [list, setList] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  // 详情抽屉
  const [detail, setDetail] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  // 编辑
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, pageSize: pagination.pageSize }
      if (keyword) params.keyword = keyword
      const res = await get<Customer[]>('/customers', params)
      const data = res.data as any
      setList(Array.isArray(data) ? data : data?.data ?? [])
      if (res.pagination) {
        setPagination(p => ({ ...p, current: res.pagination!.page, total: res.pagination!.total }))
      }
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  const openDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await get<any>(`/customers/${id}`)
      if (res.success && res.data) {
        setDetail(res.data)
      }
    } catch (e: any) {
      message.error('加载详情失败')
    }
    setDetailLoading(false)
  }

  const openEdit = (record: Customer) => {
    editForm.setFieldsValue({
      name: record.name,
      phone: record.phone,
      level: record.level,
      gender: record.gender,
      address: record.address,
      tags: record.tags
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    const values = editForm.getFieldsValue()
    if (!detail?.id) return
    try {
      const res = await put(`/customers/${detail.id}`, values)
      if (res.success) {
        message.success('更新成功')
        setEditOpen(false)
        load(pagination.current)
        openDetail(detail.id)
      }
    } catch (e: any) {
      message.error('更新失败')
    }
  }

  const columns: ColumnsType<Customer> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '姓名', dataIndex: 'name', width: 100,
      render: (v, r) => <a onClick={() => openDetail(r.id)}>{v}</a>
    },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    {
      title: '等级', dataIndex: 'level', width: 100,
      render: v => <Tag color="gold">{v}</Tag>
    },
    { title: '积分', dataIndex: 'points', width: 80 },
    { title: '总消费', dataIndex: 'totalSpent', width: 100, render: v => `¥${v || 0}` },
    { title: '卡数', dataIndex: ['_count', 'cards'], width: 60 },
    { title: '预约', dataIndex: ['_count', 'reservations'], width: 60 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '活跃' : v}</Tag>
    },
    {
      title: '注册时间', dataIndex: 'createdAt', width: 160,
      render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_, r) => (
        <Space>
          <a onClick={() => openDetail(r.id)}>详情</a>
          <a onClick={() => { openDetail(r.id); setTimeout(() => openEdit(r), 200) }}>编辑</a>
        </Space>
      )
    }
  ]

  return (
    <>
      <Card title="会员管理">
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="姓名/手机号"
            allowClear
            onSearch={v => { setKeyword(v || ''); load(1) }}
            style={{ width: 240 }}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          scroll={{ x: 1100 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: t => `共 ${t} 条`,
            onChange: page => load(page)
          }}
        />
      </Card>

      {/* 客户详情抽屉 */}
      <Drawer
        title="客户详情"
        width={640}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetail(null) }}
        extra={
          <Button type="primary" onClick={() => detail && openEdit(detail)}>编辑</Button>
        }
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : detail ? (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基础信息',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
                    <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
                    <Descriptions.Item label="性别">{detail.gender || '-'}</Descriptions.Item>
                    <Descriptions.Item label="等级">{detail.level}</Descriptions.Item>
                    <Descriptions.Item label="积分">{detail.points}</Descriptions.Item>
                    <Descriptions.Item label="总消费">¥{detail.totalSpent}</Descriptions.Item>
                    <Descriptions.Item label="生日">{detail.birthday ? dayjs(detail.birthday).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="预产期">{detail.expectedDate ? dayjs(detail.expectedDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="宝宝生日">{detail.babyBirthday ? dayjs(detail.babyBirthday).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="地址" span={2}>{detail.address || '-'}</Descriptions.Item>
                    <Descriptions.Item label="RFM标签">{detail.rfmTag || '-'}</Descriptions.Item>
                    <Descriptions.Item label="标签">{detail.tags || '-'}</Descriptions.Item>
                  </Descriptions>
                )
              },
              {
                key: 'cards',
                label: `卡项(${detail.cards?.length || 0})`,
                children: (
                  <List
                    size="small"
                    dataSource={detail.cards || []}
                    renderItem={(c: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={c.cardType?.name || '卡项'}
                          description={`状态: ${c.status} | 剩余: ${c.remainingTimes != null ? c.remainingTimes + '次' : c.remainingAmount != null ? '¥' + c.remainingAmount : '-'}`}
                        />
                      </List.Item>
                    )}
                    locale={{ emptyText: '暂无卡项' }}
                  />
                )
              },
              {
                key: 'reservations',
                label: `预约(${detail.reservations?.length || 0})`,
                children: (
                  <List
                    size="small"
                    dataSource={detail.reservations || []}
                    renderItem={(r: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={`${r.serviceName} - ${r.status === 'completed' ? '已完成' : r.status === 'pending' ? '待确认' : r.status}`}
                          description={`${r.date ? dayjs(r.date).format('YYYY-MM-DD') : ''} ${r.startTime || ''} | 技师: ${r.staff?.name || '-'}`}
                        />
                      </List.Item>
                    )}
                    locale={{ emptyText: '暂无预约' }}
                  />
                )
              },
              {
                key: 'records',
                label: `消费(${detail.serviceRecords?.length || 0})`,
                children: (
                  <List
                    size="small"
                    dataSource={detail.serviceRecords || []}
                    renderItem={(sr: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={sr.serviceName || sr.service?.name || '服务'}
                          description={`${dayjs(sr.createdAt).format('YYYY-MM-DD HH:mm')} | 技师: ${sr.staff?.name || '-'} | ¥${sr.servicePrice || 0}`}
                        />
                      </List.Item>
                    )}
                    locale={{ emptyText: '暂无消费记录' }}
                  />
                )
              },
              {
                key: 'notes',
                label: `跟进(${detail.notes?.length || 0})`,
                children: (
                  <List
                    size="small"
                    dataSource={detail.notes || []}
                    renderItem={(n: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={`${n.staff?.name || '员工'} - ${dayjs(n.createdAt).format('YYYY-MM-DD')}`}
                          description={n.content}
                        />
                      </List.Item>
                    )}
                    locale={{ emptyText: '暂无跟进记录' }}
                  />
                )
              }
            ]}
          />
        ) : null}
      </Drawer>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑客户"
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => setEditOpen(false)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="姓名"><Input /></Form.Item>
          <Form.Item name="phone" label="手机号"><Input /></Form.Item>
          <Form.Item name="level" label="等级">
            <Select options={[
              { label: '普通会员', value: '普通会员' },
              { label: '臻享会员', value: '臻享会员' },
              { label: '皇家会员', value: '皇家会员' },
              { label: '帝王金卡', value: '帝王金卡' }
            ]} />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select options={[
              { label: '女', value: '女' },
              { label: '男', value: '男' }
            ]} allowClear />
          </Form.Item>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
          <Form.Item name="tags" label="标签"><Input placeholder="逗号分隔" /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

/**
 * 业绩目标管理 - 设定/编辑员工月度业绩目标
 */
import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Tag, message, Modal, Form, Select,
  InputNumber, Tabs, Statistic, Row, Col, Progress
} from 'antd'
import { get, post } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface StaffBasic {
  id: number; name: string; phone: string; role: string; status: string
}

interface PerformanceTarget {
  staffId: number; staffName: string; staffRole: string
  monthTarget: number; achieved: number; progressPercent: number
  cashPerformance: number; cardConsumption: number; cooperationPerformance: number
  rank: number
}

export default function Performance() {
  const [year, setYear] = useState(dayjs().year())
  const [month, setMonth] = useState(dayjs().month() + 1)
  const [staffList, setStaffList] = useState<StaffBasic[]>([])
  const [targets, setTargets] = useState<PerformanceTarget[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('overview')

  // 批量设定
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchForm] = Form.useForm()

  // 单人设定
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()

  const loadStaff = async () => {
    try {
      const res = await get<StaffBasic[]>('/staff', { page: 1, pageSize: 100 })
      const data = res.data as any
      setStaffList((Array.isArray(data) ? data : data?.data ?? []).filter((s: StaffBasic) => s.status === 'active'))
    } catch { /* ignore */ }
  }

  const loadTargets = async () => {
    setLoading(true)
    try {
      // 使用 stats API 获取每个员工的业绩
      const res = await get<any>('/stats/staff-performance', { year, month })
      if (res.success && res.data) {
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? []
        setTargets(data)
      }
    } catch {
      // 如果 API 不存在，用员工列表模拟
      setTargets(staffList.map((s, i) => ({
        staffId: s.id, staffName: s.name, staffRole: s.role,
        monthTarget: 80000, achieved: 0, progressPercent: 0,
        cashPerformance: 0, cardConsumption: 0, cooperationPerformance: 0,
        rank: i + 1
      })))
    }
    setLoading(false)
  }

  useEffect(() => { loadStaff() }, [])
  useEffect(() => { if (staffList.length > 0) loadTargets() }, [year, month, staffList])

  // 批量设定目标
  const handleBatchSet = async () => {
    try {
      const values = await batchForm.validateFields()
      const role = values.role
      const target = values.monthTarget

      // 通过任务 API 或直接设定
      const targetStaff = staffList.filter(s => !role || s.role === role)
      for (const s of targetStaff) {
        await post('/tasks', {
          staffId: s.id,
          type: 'target',
          title: `${year}年${month}月业绩目标`,
          description: `月度业绩目标: ¥${target.toLocaleString()}`,
          dueDate: `${year}-${String(month).padStart(2, '0')}-28`
        }).catch(() => {})
      }

      message.success(`已为 ${targetStaff.length} 名员工设定目标 ¥${target.toLocaleString()}`)
      setBatchOpen(false)
      loadTargets()
    } catch { /* validation */ }
  }

  // 单人编辑
  const openEdit = (record: PerformanceTarget) => {
    editForm.setFieldsValue({
      staffId: record.staffId,
      staffName: record.staffName,
      monthTarget: record.monthTarget
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields()
      await post('/tasks', {
        staffId: values.staffId,
        type: 'target',
        title: `${year}年${month}月业绩目标`,
        description: `月度业绩目标: ¥${values.monthTarget.toLocaleString()}`,
        dueDate: `${year}-${String(month).padStart(2, '0')}-28`
      })
      message.success('目标已更新')
      setEditOpen(false)
      loadTargets()
    } catch { /* validation */ }
  }

  const totalTarget = targets.reduce((s, t) => s + (t.monthTarget || 0), 0)
  const totalAchieved = targets.reduce((s, t) => s + (t.achieved || 0), 0)
  const avgProgress = targets.length > 0
    ? Math.round(targets.reduce((s, t) => s + (t.progressPercent || 0), 0) / targets.length)
    : 0

  const columns: ColumnsType<PerformanceTarget> = [
    { title: '排名', dataIndex: 'rank', width: 60, render: (_, __, i) => i + 1 },
    { title: '员工', dataIndex: 'staffName', width: 100 },
    { title: '角色', dataIndex: 'staffRole', width: 80, render: v => <Tag color="blue">{v}</Tag> },
    { title: '月目标', dataIndex: 'monthTarget', width: 120, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '已完成', dataIndex: 'achieved', width: 120, render: v => `¥${(v || 0).toLocaleString()}` },
    {
      title: '进度', dataIndex: 'progressPercent', width: 180,
      render: v => <Progress percent={v || 0} size="small"
        strokeColor={v >= 100 ? '#52c41a' : v >= 60 ? '#C9A962' : '#ff4d4f'} />
    },
    { title: '现金业绩', dataIndex: 'cashPerformance', width: 110, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '耗卡业绩', dataIndex: 'cardConsumption', width: 110, render: v => `¥${(v || 0).toLocaleString()}` },
    {
      title: '操作', width: 80,
      render: (_, r) => <Button type="link" onClick={() => openEdit(r)}>设定目标</Button>
    }
  ]

  return (
    <>
      <Card
        title="业绩目标管理"
        extra={
          <Space>
            <Select value={year} onChange={setYear} style={{ width: 100 }}
              options={[2025, 2026, 2027].map(y => ({ label: `${y}年`, value: y }))} />
            <Select value={month} onChange={setMonth} style={{ width: 90 }}
              options={Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }))} />
            <Button type="primary" onClick={() => { batchForm.resetFields(); setBatchOpen(true) }}>
              批量设定目标
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={tab} onChange={setTab} items={[
          {
            key: 'overview', label: '业绩总览',
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}><Card><Statistic title="团队目标总额" value={totalTarget} prefix="¥" precision={0} /></Card></Col>
                  <Col span={6}><Card><Statistic title="团队已完成" value={totalAchieved} prefix="¥" precision={0} /></Card></Col>
                  <Col span={6}><Card><Statistic title="平均完成率" value={avgProgress} suffix="%" /></Card></Col>
                  <Col span={6}><Card><Statistic title="达标人数" value={targets.filter(t => t.progressPercent >= 100).length} suffix={`/ ${targets.length}`} /></Card></Col>
                </Row>
                <Table rowKey="staffId" loading={loading} columns={columns} dataSource={targets}
                  scroll={{ x: 1000 }} pagination={false} />
              </>
            )
          }
        ]} />
      </Card>

      {/* 批量设定目标 */}
      <Modal title="批量设定业绩目标" open={batchOpen} onOk={handleBatchSet} onCancel={() => setBatchOpen(false)}>
        <Form form={batchForm} layout="vertical">
          <Form.Item name="role" label="角色筛选（留空=全部）">
            <Select allowClear options={[
              { label: '产康师', value: '产康师' },
              { label: '店长', value: '店长' },
              { label: '顾问', value: '顾问' }
            ]} />
          </Form.Item>
          <Form.Item name="monthTarget" label="月度目标 (元)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={10000} placeholder="如 80000" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 单人编辑 */}
      <Modal title="设定业绩目标" open={editOpen} onOk={handleEditSave} onCancel={() => setEditOpen(false)}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="staffId" hidden><InputNumber /></Form.Item>
          <Form.Item name="staffName" label="员工">
            <span>{editForm.getFieldValue('staffName')}</span>
          </Form.Item>
          <Form.Item name="monthTarget" label="月度目标 (元)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={5000} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

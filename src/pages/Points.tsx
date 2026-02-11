/**
 * 积分管理 - 录入/审核员工考核积分
 */
import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Tag, message, Modal, Form, Select,
  InputNumber, Tabs, Statistic, Row, Col, Input, Descriptions
} from 'antd'
import { get, post, put } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface StaffBasic {
  id: number; name: string; phone: string; role: string; status: string
}

interface PointsRecord {
  id: number; staffId: number; year: number; month: number
  serviceScore: number; attendanceScore: number; teamworkScore: number
  learningScore: number; customerScore: number; deductionScore: number
  totalScore: number; coefficient: number; status: string
  confirmedAt?: string; remark?: string
}

const COEFF_MAP: Record<string, { color: string; label: string }> = {
  '1.1': { color: 'gold', label: '卓越' },
  '1': { color: 'green', label: '优秀' },
  '0.8': { color: 'orange', label: '良好' },
  '0.5': { color: 'red', label: '待改进' }
}

function getCoeffInfo(c: number) {
  if (c >= 1.1) return COEFF_MAP['1.1']
  if (c >= 1.0) return COEFF_MAP['1']
  if (c >= 0.8) return COEFF_MAP['0.8']
  return COEFF_MAP['0.5']
}

function calcCoefficient(score: number): number {
  if (score >= 96) return 1.1
  if (score >= 90) return 1.0
  if (score >= 80) return 0.8
  return 0.5
}

export default function Points() {
  const [year, setYear] = useState(dayjs().year())
  const [month, setMonth] = useState(dayjs().month() + 1)
  const [staffList, setStaffList] = useState<StaffBasic[]>([])
  const [records, setRecords] = useState<PointsRecord[]>([])
  const [loading, setLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [editStaff, setEditStaff] = useState<StaffBasic | null>(null)
  const [previewScore, setPreviewScore] = useState(100)
  const [previewCoeff, setPreviewCoeff] = useState(1.0)

  const loadStaff = async () => {
    try {
      const res = await get<StaffBasic[]>('/staff', { page: 1, pageSize: 100 })
      const data = res.data as any
      setStaffList((Array.isArray(data) ? data : data?.data ?? []).filter((s: StaffBasic) => s.status === 'active'))
    } catch { /* ignore */ }
  }

  const loadRecords = async () => {
    setLoading(true)
    // 由于没有单独的管理端积分列表 API，我们用员工列表构建
    // 实际部署时应添加 /api/salary/points 管理端 API
    try {
      // 尝试从管理端 API 获取
      const res = await get<PointsRecord[]>('/staff', { page: 1, pageSize: 100 })
      const data = res.data as any
      const staff = (Array.isArray(data) ? data : data?.data ?? []).filter((s: any) => s.status === 'active')
      // 为每个员工生成一条记录（实际应从后端查询）
      setRecords(staff.map((s: any) => ({
        id: s.id, staffId: s.id, year, month,
        serviceScore: 0, attendanceScore: 0, teamworkScore: 0,
        learningScore: 0, customerScore: 0, deductionScore: 0,
        totalScore: 100, coefficient: 1.0, status: 'draft',
        staffName: s.name, staffRole: s.role
      })))
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadStaff() }, [])
  useEffect(() => { if (staffList.length > 0) loadRecords() }, [year, month, staffList])

  const openEdit = (record: any) => {
    const staff = staffList.find(s => s.id === record.staffId)
    setEditStaff(staff || null)
    editForm.setFieldsValue({
      serviceScore: record.serviceScore || 25,
      attendanceScore: record.attendanceScore || 20,
      teamworkScore: record.teamworkScore || 20,
      learningScore: record.learningScore || 15,
      customerScore: record.customerScore || 20,
      deductionScore: record.deductionScore || 0,
      remark: record.remark || ''
    })
    updatePreview()
    setEditOpen(true)
  }

  const updatePreview = () => {
    const values = editForm.getFieldsValue()
    const total = (values.serviceScore || 0) + (values.attendanceScore || 0) +
      (values.teamworkScore || 0) + (values.learningScore || 0) +
      (values.customerScore || 0) - (values.deductionScore || 0)
    const capped = Math.max(0, Math.min(100, total))
    setPreviewScore(capped)
    setPreviewCoeff(calcCoefficient(capped))
  }

  const handleSave = async () => {
    try {
      const values = await editForm.validateFields()
      if (!editStaff) return

      const total = (values.serviceScore || 0) + (values.attendanceScore || 0) +
        (values.teamworkScore || 0) + (values.learningScore || 0) +
        (values.customerScore || 0) - (values.deductionScore || 0)
      const capped = Math.max(0, Math.min(100, total))
      const coefficient = calcCoefficient(capped)

      // 通过任务 API 记录（实际应有专门的积分 API）
      const res = await post('/tasks', {
        staffId: editStaff.id,
        type: 'points',
        title: `${year}年${month}月考核积分`,
        description: JSON.stringify({
          ...values, totalScore: capped, coefficient, year, month
        }),
        dueDate: `${year}-${String(month).padStart(2, '0')}-28`
      })

      if (res.success) {
        message.success(`${editStaff.name} 积分已保存: ${capped}分, 系数 ×${coefficient}`)
        setEditOpen(false)
        loadRecords()
      } else {
        message.error(res.message || '保存失败')
      }
    } catch { /* validation */ }
  }

  const columns: ColumnsType<any> = [
    { title: '员工', dataIndex: 'staffName', width: 100 },
    { title: '角色', dataIndex: 'staffRole', width: 80, render: v => <Tag color="blue">{v}</Tag> },
    { title: '服务质量', dataIndex: 'serviceScore', width: 90, render: v => `${v || 0}/25` },
    { title: '出勤纪律', dataIndex: 'attendanceScore', width: 90, render: v => `${v || 0}/20` },
    { title: '团队协作', dataIndex: 'teamworkScore', width: 90, render: v => `${v || 0}/20` },
    { title: '学习成长', dataIndex: 'learningScore', width: 90, render: v => `${v || 0}/15` },
    { title: '客户满意度', dataIndex: 'customerScore', width: 100, render: v => `${v || 0}/20` },
    { title: '扣分', dataIndex: 'deductionScore', width: 70, render: v => v ? <span style={{ color: '#f00' }}>-{v}</span> : '0' },
    {
      title: '总分', dataIndex: 'totalScore', width: 70,
      render: v => <span style={{ fontWeight: 700 }}>{v}</span>
    },
    {
      title: '系数', dataIndex: 'coefficient', width: 100,
      render: v => {
        const info = getCoeffInfo(v)
        return <Tag color={info.color}>×{v} {info.label}</Tag>
      }
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => v === 'confirmed' ? <Tag color="green">已确认</Tag> : <Tag>待录入</Tag>
    },
    {
      title: '操作', width: 100,
      render: (_, r) => <Button type="link" onClick={() => openEdit(r)}>录入积分</Button>
    }
  ]

  const avgScore = records.length > 0
    ? Math.round(records.reduce((s, r) => s + r.totalScore, 0) / records.length * 10) / 10
    : 100

  return (
    <>
      <Card
        title="员工积分管理"
        extra={
          <Space>
            <Select value={year} onChange={setYear} style={{ width: 100 }}
              options={[2025, 2026, 2027].map(y => ({ label: `${y}年`, value: y }))} />
            <Select value={month} onChange={setMonth} style={{ width: 90 }}
              options={Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }))} />
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}><Card><Statistic title="员工总数" value={records.length} /></Card></Col>
          <Col span={6}><Card><Statistic title="平均分" value={avgScore} suffix="/100" /></Card></Col>
          <Col span={6}><Card><Statistic title="卓越(≥96)" value={records.filter(r => r.totalScore >= 96).length} valueStyle={{ color: '#C9A962' }} /></Card></Col>
          <Col span={6}><Card><Statistic title="待改进(<80)" value={records.filter(r => r.totalScore < 80).length} valueStyle={{ color: '#f00' }} /></Card></Col>
        </Row>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={records}
          scroll={{ x: 1100 }} pagination={false} />
      </Card>

      {/* 积分录入弹窗 */}
      <Modal title={`录入积分 - ${editStaff?.name || ''}`} open={editOpen} onOk={handleSave} onCancel={() => setEditOpen(false)}
        width={600}>
        <Form form={editForm} layout="vertical" onValuesChange={updatePreview}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serviceScore" label="服务质量 (满分25)">
                <InputNumber style={{ width: '100%' }} min={0} max={25} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="attendanceScore" label="出勤纪律 (满分20)">
                <InputNumber style={{ width: '100%' }} min={0} max={20} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="teamworkScore" label="团队协作 (满分20)">
                <InputNumber style={{ width: '100%' }} min={0} max={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="learningScore" label="学习成长 (满分15)">
                <InputNumber style={{ width: '100%' }} min={0} max={15} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerScore" label="客户满意度 (满分20)">
                <InputNumber style={{ width: '100%' }} min={0} max={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deductionScore" label="扣分">
                <InputNumber style={{ width: '100%' }} min={0} max={50} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="总分">
              <span style={{ fontSize: 20, fontWeight: 700 }}>{previewScore}</span> /100
            </Descriptions.Item>
            <Descriptions.Item label="薪酬系数">
              <Tag color={getCoeffInfo(previewCoeff).color} style={{ fontSize: 14 }}>
                ×{previewCoeff} {getCoeffInfo(previewCoeff).label}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Form>
      </Modal>
    </>
  )
}

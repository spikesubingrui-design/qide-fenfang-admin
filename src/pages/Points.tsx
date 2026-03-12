import { useEffect, useState } from 'react'
import { Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, message } from 'antd'
import { get, put } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface PointsRecord {
  id: number | string
  staffId: number
  staffName: string
  staffRole: string
  branchName: string
  year: number
  month: number
  serviceScore: number
  attendanceScore: number
  teamworkScore: number
  learningScore: number
  customerScore: number
  deductionScore: number
  totalScore: number
  coefficient: number
  status: 'draft' | 'confirmed'
  confirmedBy?: string | null
  confirmedAt?: string | null
  remark?: string | null
  details?: Array<{ category?: string; item?: string; score?: number; date?: string }>
}

const STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '待确认', value: 'draft' },
  { label: '已确认', value: 'confirmed' },
]

function calcCoefficient(score: number): number {
  if (score >= 96) return 1.1
  if (score >= 90) return 1
  if (score >= 80) return 0.8
  return 0.5
}

function getCoeffInfo(value: number) {
  if (value >= 1.1) return { color: 'gold', label: '卓越' }
  if (value >= 1) return { color: 'green', label: '优秀' }
  if (value >= 0.8) return { color: 'orange', label: '良好' }
  return { color: 'red', label: '待改进' }
}

export default function Points() {
  const [form] = Form.useForm()
  const [year, setYear] = useState(dayjs().year())
  const [month, setMonth] = useState(dayjs().month() + 1)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<PointsRecord[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PointsRecord | null>(null)
  const [previewScore, setPreviewScore] = useState(100)
  const [previewCoeff, setPreviewCoeff] = useState(1)

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await get<PointsRecord[]>('/staff-app/manage/points', { year, month, status, keyword })
      const data = Array.isArray(res.data) ? res.data : ((res.data as any)?.data ?? [])
      setRecords(data)
    } catch (error: any) {
      message.error(error.message || '加载绩效考核失败')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRecords()
  }, [year, month, status, keyword])

  const updatePreview = () => {
    const values = form.getFieldsValue()
    const total = Math.max(0, Math.min(100,
      Number(values.serviceScore || 0)
      + Number(values.attendanceScore || 0)
      + Number(values.teamworkScore || 0)
      + Number(values.learningScore || 0)
      + Number(values.customerScore || 0)
      - Number(values.deductionScore || 0)
    ))
    setPreviewScore(total)
    setPreviewCoeff(calcCoefficient(total))
  }

  const openEdit = (record: PointsRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      serviceScore: record.serviceScore,
      attendanceScore: record.attendanceScore,
      teamworkScore: record.teamworkScore,
      learningScore: record.learningScore,
      customerScore: record.customerScore,
      deductionScore: record.deductionScore,
      remark: record.remark || '',
    })
    setPreviewScore(record.totalScore)
    setPreviewCoeff(record.coefficient)
    setEditOpen(true)
  }

  const saveRecord = async (nextStatus: 'draft' | 'confirmed') => {
    if (!editingRecord) return
    try {
      const values = await form.validateFields()
      const totalScore = Math.max(0, Math.min(100,
        Number(values.serviceScore || 0)
        + Number(values.attendanceScore || 0)
        + Number(values.teamworkScore || 0)
        + Number(values.learningScore || 0)
        + Number(values.customerScore || 0)
        - Number(values.deductionScore || 0)
      ))
      setSaving(true)
      const res = await put(`/staff-app/manage/points/${editingRecord.staffId}/${year}/${month}`, {
        ...values,
        totalScore,
        status: nextStatus,
      })
      if (res.success) {
        message.success(nextStatus === 'confirmed' ? '绩效已确认' : '绩效已保存')
        setEditOpen(false)
        loadRecords()
      } else {
        message.error(res.message || '保存失败')
      }
    } catch {
      // form validation
    }
    setSaving(false)
  }

  const avgScore = records.length
    ? Math.round((records.reduce((sum, item) => sum + item.totalScore, 0) / records.length) * 10) / 10
    : 0

  const columns: ColumnsType<PointsRecord> = [
    { title: '员工', dataIndex: 'staffName', width: 100 },
    { title: '角色', dataIndex: 'staffRole', width: 100, render: (value) => <Tag color="blue">{value}</Tag> },
    { title: '门店', dataIndex: 'branchName', width: 140 },
    { title: '服务', dataIndex: 'serviceScore', width: 80, render: (value) => `${value}/25` },
    { title: '出勤', dataIndex: 'attendanceScore', width: 80, render: (value) => `${value}/20` },
    { title: '协作', dataIndex: 'teamworkScore', width: 80, render: (value) => `${value}/20` },
    { title: '成长', dataIndex: 'learningScore', width: 80, render: (value) => `${value}/15` },
    { title: '满意度', dataIndex: 'customerScore', width: 90, render: (value) => `${value}/20` },
    { title: '扣分', dataIndex: 'deductionScore', width: 70, render: (value) => value ? <span style={{ color: '#cf1322' }}>-{value}</span> : '0' },
    { title: '总分', dataIndex: 'totalScore', width: 80, render: (value) => <strong>{value}</strong> },
    {
      title: '系数',
      dataIndex: 'coefficient',
      width: 110,
      render: (value) => {
        const info = getCoeffInfo(value)
        return <Tag color={info.color}>×{value} {info.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value) => value === 'confirmed' ? <Tag color="green">已确认</Tag> : <Tag color="orange">待确认</Tag>,
    },
    {
      title: '确认人',
      dataIndex: 'confirmedBy',
      width: 110,
      render: (value) => value || '-',
    },
    {
      title: '确认时间',
      dataIndex: 'confirmedAt',
      width: 150,
      render: (value) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEdit(record)}>录入</Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card
        title="绩效考核管理"
        extra={(
          <Space wrap>
            <Input.Search
              placeholder="搜索员工姓名/手机号"
              allowClear
              style={{ width: 220 }}
              onSearch={(value) => {
                setKeyword(value || '')
              }}
            />
            <Select
              value={year}
              style={{ width: 100 }}
              onChange={setYear}
              options={[2025, 2026, 2027].map((item) => ({ label: `${item}年`, value: item }))}
            />
            <Select
              value={month}
              style={{ width: 90 }}
              onChange={setMonth}
              options={Array.from({ length: 12 }, (_, index) => ({ label: `${index + 1}月`, value: index + 1 }))}
            />
            <Select
              value={status}
              style={{ width: 120 }}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
          </Space>
        )}
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}><Card><Statistic title="考核人数" value={records.length} /></Card></Col>
          <Col span={6}><Card><Statistic title="平均分" value={avgScore} suffix="/100" /></Card></Col>
          <Col span={6}><Card><Statistic title="已确认" value={records.filter((item) => item.status === 'confirmed').length} valueStyle={{ color: '#389e0d' }} /></Card></Col>
          <Col span={6}><Card><Statistic title="待确认" value={records.filter((item) => item.status !== 'confirmed').length} valueStyle={{ color: '#d48806' }} /></Card></Col>
        </Row>
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          当前页面用于领导检查评分和审核确认。可查看各维度分数、确认状态、确认人、确认时间以及备注；若需记录更细的评分依据，可在备注中补充。
        </Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={records}
          scroll={{ x: 1600 }}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />
      </Card>

      <Modal
        title={`录入绩效 - ${editingRecord?.staffName || ''}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={(
          <Space>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button loading={saving} onClick={() => void saveRecord('draft')}>保存草稿</Button>
            <Button type="primary" loading={saving} onClick={() => void saveRecord('confirmed')}>
              保存并确认
            </Button>
          </Space>
        )}
        width={640}
      >
        <Form form={form} layout="vertical" onValuesChange={updatePreview}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="serviceScore" label="服务质量 (满分25)"><InputNumber min={0} max={25} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="attendanceScore" label="出勤纪律 (满分20)"><InputNumber min={0} max={20} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="teamworkScore" label="团队协作 (满分20)"><InputNumber min={0} max={20} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="learningScore" label="学习成长 (满分15)"><InputNumber min={0} max={15} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="customerScore" label="客户满意度 (满分20)"><InputNumber min={0} max={20} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="deductionScore" label="扣分"><InputNumber min={0} max={50} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="可记录考核依据、异常情况、改进建议" />
          </Form.Item>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="总分">{previewScore} / 100</Descriptions.Item>
            <Descriptions.Item label="薪酬系数">
              <Tag color={getCoeffInfo(previewCoeff).color}>×{previewCoeff} {getCoeffInfo(previewCoeff).label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              {editingRecord?.status === 'confirmed' ? <Tag color="green">已确认</Tag> : <Tag color="orange">待确认</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="确认信息">
              {editingRecord?.confirmedBy ? `${editingRecord.confirmedBy}${editingRecord.confirmedAt ? ` / ${dayjs(editingRecord.confirmedAt).format('YYYY-MM-DD HH:mm')}` : ''}` : '未确认'}
            </Descriptions.Item>
          </Descriptions>
          {editingRecord?.details?.length ? (
            <div style={{ marginTop: 16 }}>
              <strong>评分依据</strong>
              <div style={{ marginTop: 8, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                {editingRecord.details.map((item, index) => (
                  <div
                    key={`${item.category || 'detail'}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '6px 0',
                      borderBottom: index === editingRecord.details!.length - 1 ? 'none' : '1px solid #f5f5f5'
                    }}
                  >
                    <span>{item.category || '评分项'} / {item.item || '明细'}</span>
                    <span>{item.score ?? 0}分{item.date ? ` · ${item.date}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Form>
      </Modal>
    </>
  )
}

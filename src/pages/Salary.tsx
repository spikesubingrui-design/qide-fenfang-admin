/**
 * 薪酬管理 - 月薪计算、确认发放、手工录入
 */
import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Tag, message, Modal, Form, Select,
  InputNumber, DatePicker, Tabs, Descriptions, Statistic, Row, Col, Input
} from 'antd'
import { get, post } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface StaffBasic {
  id: number; name: string; phone: string; role: string; status: string
  branch?: { name: string }
}

interface MonthlySalary {
  id: number; staffId: number; staffName: string; staffRole: string
  year: number; month: number; baseSalary: number; commission: number
  manualFee: number; bonus: number; deduction: number; totalSalary: number
  status: string; confirmedAt?: string; confirmedBy?: string
}

interface ManualRecord {
  id: number; staffId: number; staffName?: string
  serviceName: string; quantity: number; unitFee: number; totalFee: number
  serviceDate: string; remark?: string
}

export default function Salary() {
  const [tab, setTab] = useState('monthly')

  // 月薪
  const [year, setYear] = useState(dayjs().year())
  const [month, setMonth] = useState(dayjs().month() + 1)
  const [monthlyList, setMonthlyList] = useState<MonthlySalary[]>([])
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  // 计算
  const [calcOpen, setCalcOpen] = useState(false)
  const [staffList, setStaffList] = useState<StaffBasic[]>([])
  const [calcForm] = Form.useForm()
  const [calculating, setCalculating] = useState(false)
  const [calcResult, setCalcResult] = useState<any>(null)

  // 手工录入
  const [manualList, setManualList] = useState<ManualRecord[]>([])
  const [manualLoading, setManualLoading] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualForm] = Form.useForm()

  // 加载员工
  const loadStaff = async () => {
    try {
      const res = await get<StaffBasic[]>('/staff', { page: 1, pageSize: 100 })
      const data = res.data as any
      setStaffList((Array.isArray(data) ? data : data?.data ?? []).filter((s: StaffBasic) => s.status === 'active'))
    } catch { /* ignore */ }
  }

  // 加载月薪
  const loadMonthly = async () => {
    setMonthlyLoading(true)
    try {
      const res = await get<MonthlySalary[]>('/salary/monthly', { year, month })
      const data = res.data as any
      setMonthlyList(Array.isArray(data) ? data : data?.data ?? [])
    } catch (e: any) {
      message.error(e.message || '加载失败')
    }
    setMonthlyLoading(false)
  }

  // 加载手工记录
  const loadManual = async () => {
    setManualLoading(true)
    try {
      const res = await get<ManualRecord[]>('/salary/manual-records', { year, month })
      const data = res.data as any
      setManualList(Array.isArray(data) ? data : data?.data ?? [])
    } catch { /* ignore */ }
    setManualLoading(false)
  }

  useEffect(() => { loadStaff() }, [])
  useEffect(() => {
    if (tab === 'monthly') loadMonthly()
    if (tab === 'manual') loadManual()
  }, [tab, year, month])

  // 计算薪酬
  const handleCalc = async () => {
    try {
      const values = await calcForm.validateFields()
      setCalculating(true)
      const res = await post<any>('/salary/calculate', {
        staffId: values.staffId, year, month,
        cashPerformance: values.cashPerformance || 0,
        cardConsumption: values.cardConsumption || 0,
        inviteCount: values.inviteCount || 0,
        conversionRate: values.conversionRate || 0,
        manualRecords: []
      })
      if (res.success && res.data) {
        setCalcResult(res.data)
        message.success('计算完成')
        loadMonthly()
      } else {
        message.error(res.message || '计算失败')
      }
    } catch { /* validation */ }
    setCalculating(false)
  }

  // 确认发放
  const handleConfirm = async (record: MonthlySalary) => {
    Modal.confirm({
      title: '确认发放',
      content: `确认发放 ${record.staffName} ${record.year}年${record.month}月薪酬 ¥${record.totalSalary}？`,
      onOk: async () => {
        const res = await post(`/salary/monthly/${record.id}/confirm`)
        if (res.success) {
          message.success('已确认')
          loadMonthly()
        } else {
          message.error(res.message || '确认失败')
        }
      }
    })
  }

  // 手工录入
  const handleManualSubmit = async () => {
    try {
      const values = await manualForm.validateFields()
      const res = await post('/salary/manual-records', {
        staffId: values.staffId,
        serviceName: values.serviceName,
        quantity: values.quantity || 1,
        unitFee: values.unitFee,
        serviceDate: values.serviceDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        remark: values.remark
      })
      if (res.success) {
        message.success('录入成功')
        setManualOpen(false)
        manualForm.resetFields()
        loadManual()
      } else {
        message.error(res.message || '录入失败')
      }
    } catch { /* validation */ }
  }

  const monthlyColumns: ColumnsType<MonthlySalary> = [
    { title: '员工', dataIndex: 'staffName', width: 100 },
    { title: '角色', dataIndex: 'staffRole', width: 80, render: v => <Tag color="blue">{v}</Tag> },
    { title: '底薪', dataIndex: 'baseSalary', width: 100, render: v => `¥${v?.toLocaleString() || 0}` },
    { title: '提成', dataIndex: 'commission', width: 100, render: v => `¥${v?.toLocaleString() || 0}` },
    { title: '手工费', dataIndex: 'manualFee', width: 100, render: v => `¥${v?.toLocaleString() || 0}` },
    { title: '奖金', dataIndex: 'bonus', width: 100, render: v => `¥${v?.toLocaleString() || 0}` },
    { title: '扣除', dataIndex: 'deduction', width: 100, render: v => v ? <span style={{ color: '#f00' }}>-¥{v.toLocaleString()}</span> : '-' },
    {
      title: '合计', dataIndex: 'totalSalary', width: 120,
      render: v => <span style={{ fontWeight: 700, color: '#C9A962' }}>¥{v?.toLocaleString() || 0}</span>
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => v === 'confirmed' ? <Tag color="green">已确认</Tag> :
        v === 'calculated' ? <Tag color="orange">待确认</Tag> : <Tag>草稿</Tag>
    },
    {
      title: '操作', width: 120,
      render: (_, r) => r.status !== 'confirmed' ? (
        <Button type="link" onClick={() => handleConfirm(r)}>确认发放</Button>
      ) : <span style={{ color: '#999' }}>{dayjs(r.confirmedAt).format('MM-DD')}</span>
    }
  ]

  const manualColumns: ColumnsType<ManualRecord> = [
    { title: '员工', dataIndex: 'staffName', width: 100 },
    { title: '项目', dataIndex: 'serviceName', width: 150 },
    { title: '数量', dataIndex: 'quantity', width: 60 },
    { title: '单价', dataIndex: 'unitFee', width: 100, render: v => `¥${v}` },
    { title: '合计', dataIndex: 'totalFee', width: 100, render: v => `¥${v}` },
    { title: '日期', dataIndex: 'serviceDate', width: 120, render: v => dayjs(v).format('YYYY-MM-DD') },
    { title: '备注', dataIndex: 'remark' }
  ]

  const totalSalary = monthlyList.reduce((s, r) => s + (r.totalSalary || 0), 0)
  const confirmedCount = monthlyList.filter(r => r.status === 'confirmed').length

  return (
    <>
      <Card
        title="薪酬管理"
        extra={
          <Space>
            <Select value={year} onChange={setYear} style={{ width: 100 }}
              options={[2025, 2026, 2027].map(y => ({ label: `${y}年`, value: y }))} />
            <Select value={month} onChange={setMonth} style={{ width: 90 }}
              options={Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }))} />
          </Space>
        }
      >
        <Tabs activeKey={tab} onChange={setTab} items={[
          {
            key: 'monthly', label: '月薪管理',
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}><Card><Statistic title="员工人数" value={monthlyList.length} /></Card></Col>
                  <Col span={6}><Card><Statistic title="已确认" value={confirmedCount} suffix={`/ ${monthlyList.length}`} /></Card></Col>
                  <Col span={6}><Card><Statistic title="薪酬总额" value={totalSalary} prefix="¥" precision={0} /></Card></Col>
                  <Col span={6}><Card>
                    <Button type="primary" block onClick={() => { calcForm.resetFields(); setCalcResult(null); setCalcOpen(true) }}>
                      计算薪酬
                    </Button>
                  </Card></Col>
                </Row>
                <Table rowKey="id" loading={monthlyLoading} columns={monthlyColumns} dataSource={monthlyList}
                  scroll={{ x: 1000 }} pagination={false} />
              </>
            )
          },
          {
            key: 'manual', label: '手工服务录入',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" onClick={() => { manualForm.resetFields(); setManualOpen(true) }}>新增记录</Button>
                </div>
                <Table rowKey="id" loading={manualLoading} columns={manualColumns} dataSource={manualList}
                  scroll={{ x: 700 }} pagination={false} />
              </>
            )
          }
        ]} />
      </Card>

      {/* 计算薪酬弹窗 */}
      <Modal title="计算员工薪酬" open={calcOpen} onCancel={() => setCalcOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCalcOpen(false)}>取消</Button>,
          <Button key="calc" type="primary" loading={calculating} onClick={handleCalc}>计算并保存</Button>
        ]} width={600}>
        <Form form={calcForm} layout="vertical">
          <Form.Item name="staffId" label="选择员工" rules={[{ required: true, message: '请选择员工' }]}>
            <Select showSearch optionFilterProp="label"
              options={staffList.map(s => ({ label: `${s.name} (${s.role})`, value: s.id }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cashPerformance" label="现金业绩 (元)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cardConsumption" label="耗卡业绩 (元)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="inviteCount" label="邀约到店数"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="conversionRate" label="转化率 (%)"><InputNumber style={{ width: '100%' }} min={0} max={100} /></Form.Item>
            </Col>
          </Row>
        </Form>
        {calcResult && (
          <Descriptions title="计算结果" bordered size="small" column={2} style={{ marginTop: 16 }}>
            <Descriptions.Item label="底薪">¥{calcResult.baseSalary?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="提成">¥{calcResult.commission?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="手工费">¥{calcResult.manualFee?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="奖金">¥{calcResult.bonus?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="合计" span={2}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#C9A962' }}>
                ¥{calcResult.totalSalary?.toLocaleString()}
              </span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 手工录入弹窗 */}
      <Modal title="录入手工服务" open={manualOpen} onOk={handleManualSubmit} onCancel={() => setManualOpen(false)}>
        <Form form={manualForm} layout="vertical">
          <Form.Item name="staffId" label="员工" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={staffList.map(s => ({ label: `${s.name} (${s.role})`, value: s.id }))} />
          </Form.Item>
          <Form.Item name="serviceName" label="服务项目" rules={[{ required: true }]}>
            <Input placeholder="如：肩颈理疗" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="quantity" label="数量" initialValue={1}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
            <Col span={8}><Form.Item name="unitFee" label="单价 (元)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="serviceDate" label="服务日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

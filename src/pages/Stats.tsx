import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, message, Tabs, Tag, DatePicker, Space } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, CalendarOutlined, DollarOutlined, ShoppingOutlined } from '@ant-design/icons'
import { get } from '../api/request'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

export default function Stats() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  // 会员分析
  const [members, setMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  // 员工业绩
  const [staffPerf, setStaffPerf] = useState<any[]>([])
  const [staffLoading, setStaffLoading] = useState(false)

  useEffect(() => {
    loadOverview()
  }, [])

  useEffect(() => {
    if (activeTab === 'members') loadMembers()
    if (activeTab === 'staff') loadStaffPerf()
  }, [activeTab])

  const loadOverview = async () => {
    setLoading(true)
    try {
      const res = await get('/stats/overview')
      setStats((res.data as any) ?? {})
    } catch (e: any) {
      message.error(e.message || '加载失败')
    }
    setLoading(false)
  }

  const loadMembers = async () => {
    setMembersLoading(true)
    try {
      const res = await get<any[]>('/customers', { page: 1, pageSize: 100 })
      const data = res.data as any
      const list = Array.isArray(data) ? data : data?.data ?? []
      setMembers(list)
    } catch { /* ignore */ }
    setMembersLoading(false)
  }

  const loadStaffPerf = async () => {
    setStaffLoading(true)
    try {
      const res = await get<any[]>('/staff', { page: 1, pageSize: 100 })
      const data = res.data as any
      const list = Array.isArray(data) ? data : data?.data ?? []
      setStaffPerf(list.filter((s: any) => s.status === 'active'))
    } catch { /* ignore */ }
    setStaffLoading(false)
  }

  // 会员等级分布
  const levelDistribution = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.level || '普通会员'] = (acc[m.level || '普通会员'] || 0) + 1
    return acc
  }, {})

  // 会员消费力排名
  const topSpenders = [...members].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 10)

  const memberColumns: ColumnsType<any> = [
    { title: '排名', width: 60, render: (_, __, i) => i + 1 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '等级', dataIndex: 'level', width: 100, render: v => <Tag color="gold">{v}</Tag> },
    { title: '总消费', dataIndex: 'totalSpent', width: 100, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '积分', dataIndex: 'points', width: 80 },
    { title: '卡数', dataIndex: ['_count', 'cards'], width: 60, render: v => v || 0 },
    { title: '注册', dataIndex: 'createdAt', width: 110, render: v => v ? dayjs(v).format('YYYY-MM-DD') : '-' }
  ]

  const staffColumns: ColumnsType<any> = [
    { title: '排名', width: 60, render: (_, __, i) => i + 1 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '角色', dataIndex: 'role', width: 100, render: v => <Tag color="blue">{v}</Tag> },
    { title: '预约数', dataIndex: ['_count', 'reservations'], width: 80, render: v => v || 0 },
    { title: '服务数', dataIndex: ['_count', 'serviceRecords'], width: 80, render: v => v || 0 },
    { title: '门店', dataIndex: ['branch', 'name'], width: 120 }
  ]

  return (
    <Card title="数据报表">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: '经营看板',
            children: (
              <>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic
                        title="今日订单"
                        value={stats.todayOrders ?? 0}
                        prefix={<ShoppingOutlined />}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic
                        title="今日营业额"
                        value={stats.todayRevenue ?? 0}
                        prefix={<DollarOutlined />}
                        precision={2}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic
                        title="会员总数"
                        value={stats.totalCustomers ?? 0}
                        prefix={<UserOutlined />}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic
                        title="今日预约"
                        value={stats.todayReservations ?? 0}
                        prefix={<CalendarOutlined />}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic title="本月订单" value={stats.monthOrders ?? 0} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic title="本月营业额" value={stats.monthRevenue ?? 0} prefix="¥" precision={2} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic title="本月新客" value={stats.monthNewCustomers ?? 0} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card loading={loading}>
                      <Statistic title="本月预约" value={stats.monthReservations ?? 0} />
                    </Card>
                  </Col>
                </Row>
              </>
            )
          },
          {
            key: 'members',
            label: '会员分析',
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={12}>
                    <Card title="会员等级分布">
                      {Object.entries(levelDistribution).map(([level, count]) => (
                        <div key={level} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <Tag color="gold">{level}</Tag>
                          <span>{count as number} 人</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 12, fontWeight: 'bold' }}>
                        总计: {members.length} 人
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="会员统计">
                      <Statistic title="平均消费" value={members.length ? Math.round(members.reduce((s, m) => s + (m.totalSpent || 0), 0) / members.length) : 0} prefix="¥" />
                      <Statistic title="平均积分" value={members.length ? Math.round(members.reduce((s, m) => s + (m.points || 0), 0) / members.length) : 0} style={{ marginTop: 16 }} />
                    </Card>
                  </Col>
                </Row>
                <Card title="消费力排名 TOP10">
                  <Table
                    rowKey="id"
                    loading={membersLoading}
                    columns={memberColumns}
                    dataSource={topSpenders}
                    pagination={false}
                  />
                </Card>
              </>
            )
          },
          {
            key: 'staff',
            label: '员工业绩排名',
            children: (
              <Card title="员工业绩排名（按服务数排序）">
                <Table
                  rowKey="id"
                  loading={staffLoading}
                  columns={staffColumns}
                  dataSource={[...staffPerf].sort((a, b) => (b._count?.serviceRecords || 0) - (a._count?.serviceRecords || 0))}
                  pagination={false}
                />
              </Card>
            )
          }
        ]}
      />
    </Card>
  )
}

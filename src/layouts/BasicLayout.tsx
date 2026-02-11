import { useState } from 'react'
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  BarChartOutlined,
  InboxOutlined,
  LogoutOutlined,
  DollarOutlined,
  TrophyOutlined,
  StarOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import { logout } from '../api/auth'

const { Header, Sider, Content } = Layout

const menus = [
  { key: '/members', icon: <UserOutlined />, label: '会员管理' },
  { key: '/reservations', icon: <CalendarOutlined />, label: '预约收银' },
  { key: '/services', icon: <AppstoreOutlined />, label: '服务套餐' },
  { key: '/staff', icon: <TeamOutlined />, label: '员工管理' },
  { key: '/salary', icon: <DollarOutlined />, label: '薪酬管理' },
  { key: '/performance', icon: <TrophyOutlined />, label: '业绩目标' },
  { key: '/points', icon: <StarOutlined />, label: '积分管理' },
  { key: '/stats', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/inventory', icon: <InboxOutlined />, label: '库存管理' }
]

export default function BasicLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, color: '#fff', textAlign: 'center', lineHeight: '32px' }}>
          奇德芬芳
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          items={menus}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Dropdown
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }]
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>管理员</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

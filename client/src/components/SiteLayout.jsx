import { Layout } from 'antd';
import ConnectWalletButton from './ConnectWalletButton';
import 'antd/dist/reset.css';

const { Header, Footer, Content } = Layout;

export default function SiteLayout({ children }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 99,
          padding: '0 16px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <h3
            style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
              margin: 0,
            }}
          >
            🕐 SendLater
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ConnectWalletButton />
        </div>
      </Header>
      <Content
        style={{
          margin: '12px 8px',
          padding: 8,
          minHeight: '100%',
          color: 'black',
          maxHeight: '100%',
        }}
      >
        {children}
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        <a
          href="https://github.com/Salmandabbakuti"
          target="_blank"
          rel="noopener noreferrer"
        >
          ©{new Date().getFullYear()} SendLater. Powered by Massa
        </a>
        <p style={{ fontSize: '12px' }}>v0.1.5</p>
      </Footer>
    </Layout>
  );
}

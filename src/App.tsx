import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AppRoutes } from '@/router/AppRoutes';
import { COLOR_PRIMARY } from '@/constants/ui';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: COLOR_PRIMARY,
          borderRadius: 6,
          fontSize: 14,
          fontSizeSM: 12,
          fontSizeLG: 16,
          controlHeight: 32,
          paddingLG: 24,
        },
        components: {
          Table: {
            cellPaddingBlock: 12,
          },
          Form: {
            itemMarginBottom: 16,
          },
          Card: {
            paddingLG: 24,
          },
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;

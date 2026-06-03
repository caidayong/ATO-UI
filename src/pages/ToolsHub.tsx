/**
 * @page 测试工具
 * @version V1.0.1-P6
 * @base docs/spec/01-信息架构与路由.md §4；docs/prd/V1.0.1-P6/ATO_V1.0.1-P6-页面需求与交互规格.md §1.1
 * @changes
 *   - V1.0.1-P6: 测试工具 Hub 改为卡片入口（项目日&周报、市场缺陷分析），替代「测试日报」残留入口
 */
import { Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

const { Text } = Typography;

function ToolCard(props: { title: string; description: string; onClick: () => void }) {
  return (
    <Card
      hoverable
      title={props.title}
      onClick={props.onClick}
      styles={{ body: { minHeight: 84 } }}
    >
      <Text type="secondary">{props.description}</Text>
    </Card>
  );
}

export function ToolsHub() {
  const navigate = useNavigate();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={8}>
        <ToolCard
          title="项目日&周报"
          description="维护项目日报配置、填写团队周报、查看数据统计（P6 全 Mock）"
          onClick={() => navigate(ROUTES.TOOLS_PROJECT_REPORTS)}
        />
      </Col>
      <Col xs={24} sm={12} lg={8}>
        <ToolCard
          title="市场缺陷分析"
          description="列表检索、生成报表、查看报告详情"
          onClick={() => navigate(ROUTES.TOOLS_MARKET_DEFECTS)}
        />
      </Col>
    </Row>
  );
}


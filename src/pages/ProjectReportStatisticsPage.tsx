/**
 * @page 测试工具 / 项目日&周报 / 数据统计
 * @version V1.0.1-P6
 * @base docs/prd/V1.0.1-P6/ATO_V1.0.1-P6-页面需求与交互规格.md §3.3；docs/spec/04-页面契约.md § 页面 18
 * @changes
 *   - V1.0.1-P6: 初始实现
 *   - V1.0.1-P6: 进入默认自然季度并自动查询；2026-06-03 UI 验收通过
 */
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Empty, Form, Select, Space, Statistic, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import type { StatisticsMetrics } from '@/types/projectReports';
import { getStatistics, listRdmsProducts, listTeams } from '@/mocks/projectReports';

const { Text } = Typography;
const { RangePicker } = DatePicker;

function quarterRange(d: Dayjs): [Dayjs, Dayjs] {
  const q = Math.floor(d.month() / 3);
  const start = d.month(q * 3).startOf('month');
  const end = start.add(2, 'month').endOf('month');
  return [start, end];
}

export function ProjectReportStatisticsPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const teamOptions = useMemo(
    () => [{ value: 'all', label: '全部' }, ...listTeams().filter((t) => t.id !== 'all').map((t) => ({ value: t.id, label: t.name }))],
    []
  );
  const productOptions = useMemo(
    () => [{ value: 'all', label: '全部' }, ...listRdmsProducts().map((p) => ({ value: p.id, label: p.name }))],
    []
  );

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<StatisticsMetrics | null>(null);

  const onQuery = useCallback(async () => {
    const v = await form.validateFields();
    const [from, to] = v.dateRange as [Dayjs, Dayjs];
    setLoading(true);
    try {
      const res = await getStatistics({
        teamId: v.teamId,
        productId: v.productId,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setMetrics(res);
      if (!res) message.info('无统计数据');
    } catch (e) {
      message.error((e as Error).message || '查询失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    const [from, to] = quarterRange(dayjs());
    form.setFieldsValue({
      teamId: 'all',
      productId: 'all',
      dateRange: [from, to],
    });
    void (async () => {
      setLoading(true);
      try {
        const res = await getStatistics({
          teamId: 'all',
          productId: 'all',
          from: from.toISOString(),
          to: to.toISOString(),
        });
        setMetrics(res);
      } catch (e) {
        message.error((e as Error).message || '查询失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`${ROUTES.TOOLS_PROJECT_REPORTS}?tab=weekly`)}>
            返回
          </Button>
          <Text>数据统计</Text>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Form form={form} layout="inline">
          <Form.Item label="团队" name="teamId" rules={[{ required: true, message: '请选择团队' }]}>
            <Select style={{ width: 200 }} options={teamOptions} />
          </Form.Item>
          <Form.Item label="产品" name="productId" rules={[{ required: true, message: '请选择产品' }]}>
            <Select style={{ width: 220 }} options={productOptions} />
          </Form.Item>
          <Form.Item label="时间范围" name="dateRange" rules={[{ required: true, message: '请选择时间范围' }]}>
            <RangePicker style={{ width: 360 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={onQuery}>
              查询
            </Button>
          </Form.Item>
        </Form>

        {metrics ? (
          <Space wrap size={16}>
            <Card size="small" style={{ width: 240 }}>
              <Statistic title="基线版本数量" value={metrics.baselineVersionCount} />
            </Card>
            <Card size="small" style={{ width: 240 }}>
              <Statistic title="补丁版本数量" value={metrics.patchVersionCount} />
            </Card>
            <Card size="small" style={{ width: 240 }}>
              <Statistic title="新增用例数量" value={metrics.newCaseCount} />
            </Card>
            <Card size="small" style={{ width: 240 }}>
              <Statistic title="提交 Bug 数量" value={metrics.submittedBugCount} />
            </Card>
          </Space>
        ) : (
          <Empty description="请先选择筛选条件并点击「查询」" />
        )}
      </Space>
    </Card>
  );
}


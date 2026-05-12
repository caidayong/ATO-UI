/**
 * @page 市场缺陷分析 · 报表
 * @version V1.0.1-P5
 * @base docs/prd/V1.0.1-P5/ATO_V1.0.1-P5-页面需求与交互规格.md §3.4
 * @changes
 *   - V1.0.1-P5: 顶栏「返回 + 报表」；左右分栏：左为数据范围 + 报表类型，右为图表 Tab + 注 + 占位区
 *   - V1.0.1-P5 验收: 数据范围首行展示列表页年/季/月快照；实际归属团队、是否有效问题下拉默认「全部」
 *   - V1.0.1-P5: 报表类型 Checkbox 与迭代需求清单 REQ-V1.0.1-P5-030「需求说明」一致（非原始线框 16 项）
 *   - V1.0.1-P5: 生成报表后按维度默认图型（饼/柱）展示 Mock 聚合与表格占比
 *   - V1.0.1-P5 验收: 左侧配置区收窄；右侧图表与表格同排；右侧独立滚动 + 左侧 sticky，互不影响
 *   - V1.0.1-P5 验收: 顶栏「返回 + 报表」压缩行高，减少灰底区纵向占位
 *   - V1.0.1-P5: 报表类型增加「按自动化不可覆盖原因」（与缺陷分析报告后台固定维度之一对齐）
 */
import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { ROUTES } from '@/constants/routes';
import {
  MARKET_DEFECT_ACTUAL_TEAM_OPTIONS,
  MARKET_DEFECT_REPORT_TYPE_OPTIONS,
  selectWithAll,
} from '@/constants/marketDefectMockOptions';
import { loadMarketDefectListSnapshot } from '@/utils/marketDefectListSnapshot';
import { buildReportBlocks, filterDefectsForReport, type BuiltReportBlock } from '@/utils/marketDefectReportDataset';
import type { MarketDefectListSnapshot } from '@/types';
import { mockMarketDefects } from '@/mocks/data';
import { ReportBlocksFiltered, ReportBlocksGrid } from '@/components/MarketDefectReportCharts';

const VALID_ISSUE_SCOPE_OPTIONS = selectWithAll(['是', '否']);

const REPORT_DATA_NOTE =
  '注：统计报表的数据来源于列表页面的检索结果，生成统计报表前请先在列表页面进行检索。比如列表页面我们检索的是未关闭 Bug，那么报表就是基于之前检索的未关闭 Bug 的结果集进行统计。';

const REPORT_TAB_SCROLL: CSSProperties = {
  maxHeight: 'calc(100vh - 196px)',
  overflowY: 'auto',
  paddingRight: 4,
  marginTop: 12,
};

function formatYearLabel(y: string | undefined): string {
  if (!y || y === '全部') return '全部';
  return `${y}年`;
}

function formatListTimeRangeText(filters: MarketDefectListSnapshot['filters']): string {
  const y = formatYearLabel(filters.year);
  const q = filters.quarter?.trim() ? filters.quarter : '全部';
  const m = filters.month?.trim() ? filters.month : '全部';
  return `${y}　${q}　${m}`;
}

export function MarketDefectReportPage() {
  const navigate = useNavigate();
  const snap = useMemo(() => loadMarketDefectListSnapshot(), []);

  const [scopeTeam, setScopeTeam] = useState('全部');
  const [scopeValid, setScopeValid] = useState('全部');
  const [checkedTypes, setCheckedTypes] = useState<string[]>([]);
  const [activeVizTab, setActiveVizTab] = useState('default');
  const [generated, setGenerated] = useState(false);
  const [reportBlocks, setReportBlocks] = useState<BuiltReportBlock[] | null>(null);

  const teamOptions = useMemo(() => selectWithAll([...MARKET_DEFECT_ACTUAL_TEAM_OPTIONS]), []);

  const timeLine = useMemo(() => {
    if (!snap) return '暂无列表快照（请返回列表页检索后点击「报表」进入）';
    return formatListTimeRangeText(snap.filters);
  }, [snap]);

  const allTypeValues = useMemo(() => [...MARKET_DEFECT_REPORT_TYPE_OPTIONS], []);

  const toggleSelectAllTypes = useCallback(() => {
    setCheckedTypes((prev) => (prev.length === allTypeValues.length ? [] : [...allTypeValues]));
  }, [allTypeValues]);

  const onGenerate = useCallback(() => {
    if (checkedTypes.length === 0) {
      message.warning('请至少选择一种报表类型');
      return;
    }
    const filtered = filterDefectsForReport(mockMarketDefects, snap, scopeTeam, scopeValid);
    setReportBlocks(buildReportBlocks(filtered, checkedTypes));
    setGenerated(true);
    message.success(`已生成报表（Mock）：${checkedTypes.length} 个统计维度，共 ${filtered.length} 条缺陷`);
  }, [checkedTypes, snap, scopeTeam, scopeValid]);

  const emptyBeforeGenerate = <Empty description="请先勾选报表类型并点击「生成报表」" style={{ marginTop: 48 }} />;

  const lineTabEmpty = (
    <Empty
      description="当前所选统计维度未配置折线图；趋势类展示可在后续迭代对接折线图库与数据口径。"
      style={{ marginTop: 48 }}
    />
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          minHeight: 0,
        }}
      >
        <Button
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`${ROUTES.TOOLS_MARKET_DEFECTS}?tab=list`)}
        >
          返回
        </Button>
        <Typography.Title level={5} style={{ margin: 0, lineHeight: 1.2, fontSize: 16, fontWeight: 600 }}>
          报表
        </Typography.Title>
      </div>

      <Row gutter={16} align="top" wrap>
        <Col xs={24} lg={5} xl={4}>
          <div
            style={{
              position: 'sticky',
              top: 16,
              zIndex: 2,
              alignSelf: 'flex-start',
            }}
          >
          <Card size="small" styles={{ body: { paddingBottom: 12 } }}>
            <Typography.Text strong>数据范围配置</Typography.Text>
            <div style={{ marginTop: 12 }}>
              <Typography.Text type="secondary">时间范围（与列表页一致）</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <Typography.Text>{timeLine}</Typography.Text>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Typography.Text type="secondary">实际归属团队</Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 6 }}
                value={scopeTeam}
                options={teamOptions}
                onChange={setScopeTeam}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <Typography.Text type="secondary">是否有效问题</Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 6 }}
                value={scopeValid}
                options={VALID_ISSUE_SCOPE_OPTIONS}
                onChange={setScopeValid}
              />
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Typography.Text strong>报表类型配置</Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 8, fontSize: 12 }}>
              请选择报表类型
            </Typography.Paragraph>
            <Checkbox.Group
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              value={checkedTypes}
              onChange={(v) => setCheckedTypes(v as string[])}
            >
              {MARKET_DEFECT_REPORT_TYPE_OPTIONS.map((label) => (
                <Checkbox key={label} value={label}>
                  {label}
                </Checkbox>
              ))}
            </Checkbox.Group>
            <Space style={{ marginTop: 16 }} wrap>
              <Button onClick={toggleSelectAllTypes}>
                {checkedTypes.length === allTypeValues.length ? '取消全选' : '全选'}
              </Button>
              <Button type="primary" onClick={onGenerate}>
                生成报表
              </Button>
            </Space>
          </Card>
          </div>
        </Col>

        <Col xs={24} lg={19} xl={20} style={{ minHeight: 0 }}>
          <Card size="small">
            <Tabs
              activeKey={activeVizTab}
              onChange={setActiveVizTab}
              items={[
                {
                  key: 'default',
                  label: (
                    <span>
                      <TableOutlined /> 默认
                    </span>
                  ),
                  children: (
                    <>
                      <Alert type="info" showIcon message={REPORT_DATA_NOTE} style={{ marginBottom: 0 }} />
                      <div style={REPORT_TAB_SCROLL}>
                        {generated && reportBlocks ? (
                          <ReportBlocksGrid blocks={reportBlocks} />
                        ) : (
                          emptyBeforeGenerate
                        )}
                      </div>
                    </>
                  ),
                },
                {
                  key: 'pie',
                  label: (
                    <span>
                      <PieChartOutlined /> 饼图
                    </span>
                  ),
                  children: (
                    <>
                      <Alert type="info" showIcon message={REPORT_DATA_NOTE} />
                      <div style={REPORT_TAB_SCROLL}>
                        {generated && reportBlocks ? (
                          <ReportBlocksFiltered blocks={reportBlocks} chart="pie" />
                        ) : (
                          emptyBeforeGenerate
                        )}
                      </div>
                    </>
                  ),
                },
                {
                  key: 'bar',
                  label: (
                    <span>
                      <BarChartOutlined /> 柱状图
                    </span>
                  ),
                  children: (
                    <>
                      <Alert type="info" showIcon message={REPORT_DATA_NOTE} />
                      <div style={REPORT_TAB_SCROLL}>
                        {generated && reportBlocks ? (
                          <ReportBlocksFiltered blocks={reportBlocks} chart="bar" />
                        ) : (
                          emptyBeforeGenerate
                        )}
                      </div>
                    </>
                  ),
                },
                {
                  key: 'line',
                  label: (
                    <span>
                      <LineChartOutlined /> 折线图
                    </span>
                  ),
                  children: (
                    <>
                      <Alert type="info" showIcon message={REPORT_DATA_NOTE} />
                      <div style={REPORT_TAB_SCROLL}>
                        {generated && reportBlocks ? lineTabEmpty : emptyBeforeGenerate}
                      </div>
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/**
 * @page 市场缺陷分析
 * @version V1.0.1-P5
 * @base docs/prd/V1.0.1-P5/ATO_V1.0.1-P5-页面需求与交互规格.md §3.3
 */
import { Tabs } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MarketDefectListTab } from '@/pages/MarketDefectListTab';
import { MarketDefectAnalysisTasksTab } from '@/pages/MarketDefectAnalysisTasksTab';

const TAB_LIST = 'list';
const TAB_ANALYSIS = 'analysis';

export function MarketDefectAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const raw = searchParams.get('tab');
  const activeKey =
    raw === TAB_ANALYSIS ? TAB_ANALYSIS : TAB_LIST;

  return (
    <Tabs
      activeKey={activeKey}
      onChange={(key) => {
        const next = new URLSearchParams(searchParams);
        if (key === TAB_LIST) {
          next.delete('tab');
        } else {
          next.set('tab', key);
        }
        navigate({ search: next.toString() ? `?${next.toString()}` : '' }, { replace: true });
      }}
      items={[
        { key: TAB_LIST, label: '市场缺陷列表', children: <MarketDefectListTab /> },
        { key: TAB_ANALYSIS, label: '分析报告', children: <MarketDefectAnalysisTasksTab /> },
      ]}
    />
  );
}

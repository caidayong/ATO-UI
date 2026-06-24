/**
 * @page 测试工具 / 项目日&周报 / 日报详情
 * @version V1.0.1-P6
 * @base docs/prd/V1.0.1-P6/ATO_V1.0.1-P6-页面需求与交互规格.md §3.2；docs/spec/04-页面契约.md § 页面 17
 * @changes
 *   - V1.0.1-P6: 初始实现
 *   - V1.0.1-P6: 报告预览 + 报告编辑态；标题栏展示生成时间
 *   - V1.0.1-P6: 2026-06-03 UI 验收通过
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Form, Space, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectDailyReportPreview } from '@/components/ProjectDailyReportPreview';
import {
  ProjectDailyReportEditor,
  initReportEditForm,
  reportFromFormValues,
} from '@/components/ProjectDailyReportEditor';
import { ROUTES } from '@/constants/routes';
import { getGeneratedDailyReport, saveGeneratedDailyReport } from '@/mocks/dailyReportGenerated';
import type { DailyGeneratedReport } from '@/types/dailyReportGenerated';
import type { DailyReportConfig } from '@/types/projectReports';
import { getDailyConfig, getLatestDailyBody } from '@/mocks/projectReports';

const { Title, Text } = Typography;

type ViewMode = 'preview' | 'edit';

export function ProjectReportDetailPage() {
  const navigate = useNavigate();
  const { reportConfigId } = useParams<{ reportConfigId: string }>();
  const id = reportConfigId ?? '';

  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<DailyReportConfig | null>(null);
  const [generated, setGenerated] = useState<DailyGeneratedReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm();
  const reportSnapshotRef = useRef<DailyGeneratedReport | null>(null);

  const title = useMemo(() => config?.name ?? '日报详情', [config?.name]);

  const generatedAtText = useMemo(() => {
    if (!generated?.generatedAt) return '—';
    return dayjs(generated.generatedAt).format('YYYY-MM-DD HH:mm:ss');
  }, [generated?.generatedAt]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const cfg = await getDailyConfig(id);
      if (!cfg) {
        setConfig(null);
        setGenerated(null);
        return;
      }
      const b = await getLatestDailyBody(id);
      const gen = await getGeneratedDailyReport(cfg, b);
      setConfig(cfg);
      setGenerated(gen);
      reportSnapshotRef.current = gen;
    } catch (e) {
      message.error((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onBack = useCallback(() => {
    navigate(`${ROUTES.TOOLS_PROJECT_REPORTS}?tab=daily`);
  }, [navigate]);

  const onStartEdit = useCallback(() => {
    if (!generated) return;
    initReportEditForm(editForm, generated);
    setViewMode('edit');
  }, [editForm, generated]);

  const onCancelEdit = useCallback(() => {
    editForm.resetFields();
    setViewMode('preview');
    message.info('已取消编辑（未保存）');
  }, [editForm]);

  const onSave = useCallback(async () => {
    if (!id || !generated) return;
    const values = await editForm.validateFields();
    setSaving(true);
    try {
      const next = reportFromFormValues(generated, values);
      const saved = await saveGeneratedDailyReport(id, next);
      setGenerated(saved);
      reportSnapshotRef.current = saved;
      setViewMode('preview');
      message.success('已保存报告（Mock）');
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [editForm, generated, id]);

  const mainContent = useMemo(() => {
    if (!config) {
      return <Empty description="未找到日报配置" style={{ padding: '48px 0' }} />;
    }
    if (viewMode === 'edit' && generated) {
      return <ProjectDailyReportEditor form={editForm} baseReport={generated} />;
    }
    if (!generated) {
      return <Empty description="报告生成中，请稍后刷新" style={{ padding: '48px 0' }} />;
    }
    return <ProjectDailyReportPreview report={generated} />;
  }, [config, editForm, generated, viewMode]);

  return (
    <Card loading={loading} styles={{ body: { paddingTop: 16 } }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap size={12} align="start">
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回列表
          </Button>
          <Space size={12} align="center" wrap>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            {config ? (
              <Text type="secondary">
                产品：{config.productName}　版本：{config.projectVersion}
              </Text>
            ) : null}
          </Space>
        </Space>

        <Text type="secondary" style={{ flex: 1, textAlign: 'center', minWidth: 200, paddingTop: 6 }}>
          报告生成时间：{generatedAtText}
        </Text>

        <Space wrap>
          {viewMode === 'preview' ? (
            <Button icon={<EditOutlined />} onClick={onStartEdit} disabled={!generated}>
              编辑
            </Button>
          ) : (
            <>
              <Button icon={<SaveOutlined />} type="primary" loading={saving} onClick={onSave}>
                保存
              </Button>
              <Button icon={<StopOutlined />} onClick={onCancelEdit} disabled={saving}>
                取消
              </Button>
            </>
          )}
        </Space>
      </div>

      {mainContent}
    </Card>
  );
}

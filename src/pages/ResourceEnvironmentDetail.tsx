/**
 * @page 资源管理 / 环境详情
 * @version V1.0.1
 * @base 历史页面补充，参考环境详情截图
 * @changes
 *   - V1.0.0: 环境详情页（概要信息 + 设备/执行机/控制盒详情分区 + 环境检测）
 *   - V1.0.1: 返回时定位资源管理「自动化环境」Tab
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Button, Card, Descriptions, Empty, Flex, Space, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { PAGE_MIN_HEIGHT, SPACING } from '@/constants/ui';
import { ROUTES } from '@/constants/routes';
import { mockAutomationEnvironments } from '@/mocks/data';
import type { AutomationEnvironment, AutomationEnvStatus } from '@/types';

const { Text } = Typography;

const STATUS_OK_COLOR = '#52c41a';
const STATUS_ERROR_COLOR = '#ff4d4f';

const SECTION_BORDER = '1px solid #f0f0f0';

function resolveComponentStatus(
  checkError?: string,
  explicit?: AutomationEnvStatus
): AutomationEnvStatus {
  if (explicit) return explicit;
  return checkError ? '异常' : '正常';
}

function formatExecutorOs(os?: AutomationEnvironment['executorOs']) {
  if (os === 'linux') return 'linux';
  return 'win';
}

function renderStatusText(status: AutomationEnvStatus) {
  return (
    <Text style={{ color: status === '正常' ? STATUS_OK_COLOR : STATUS_ERROR_COLOR }}>{status}</Text>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: SPACING.lg }}>
      <Text type="secondary">{title}</Text>
      <Card
        size="small"
        styles={{ body: { padding: SPACING.md } }}
        style={{ marginTop: SPACING.xs, border: SECTION_BORDER }}
      >
        {children}
      </Card>
    </div>
  );
}

export function ResourceEnvironmentDetail() {
  const navigate = useNavigate();
  const { envId = '' } = useParams();
  const [envRecord, setEnvRecord] = useState<AutomationEnvironment | undefined>(() =>
    mockAutomationEnvironments.find((item) => item.id === envId)
  );

  const env = useMemo(
    () => envRecord ?? mockAutomationEnvironments.find((item) => item.id === envId),
    [envId, envRecord]
  );

  const deviceStatus = useMemo(
    () => resolveComponentStatus(env?.deviceCheckError, env?.deviceStatus),
    [env?.deviceCheckError, env?.deviceStatus]
  );
  const executorStatus = useMemo(
    () => resolveComponentStatus(env?.executorCheckError, env?.executorStatus),
    [env?.executorCheckError, env?.executorStatus]
  );
  const controlBoxStatus = useMemo(
    () => resolveComponentStatus(env?.controlBoxCheckError, env?.controlBoxStatus),
    [env?.controlBoxCheckError, env?.controlBoxStatus]
  );

  const handleBack = () => {
    navigate(`${ROUTES.AUTOMATION_RESOURCES}?tab=environment`);
  };

  const handleCheck = () => {
    if (!env) return;
    message.loading({ content: '正在检测环境…', key: `check-detail-${env.id}` });
    window.setTimeout(() => {
      setEnvRecord((prev) => {
        const base = prev ?? env;
        return {
          ...base,
          status: '正常',
          deviceStatus: '正常',
          executorStatus: '正常',
          controlBoxStatus: '正常',
          executorCheckError: undefined,
          deviceCheckError: undefined,
          controlBoxCheckError: undefined,
        };
      });
      message.success({ content: '检测完成，环境状态已更新为正常', key: `check-detail-${env.id}` });
    }, 800);
  };

  if (!env) {
    return (
      <div style={{ minHeight: PAGE_MIN_HEIGHT }}>
        <Card>
          <Space direction="vertical" size={SPACING.md}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack}>
              环境详情
            </Button>
            <Empty description="环境不存在或已删除" />
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: PAGE_MIN_HEIGHT }}>
      <Card>
        <Flex justify="space-between" align="center" style={{ marginBottom: SPACING.lg }}>
          <Space align="center">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} />
            <span>环境详情</span>
          </Space>
          <Button type="primary" onClick={handleCheck}>
            环境检测
          </Button>
        </Flex>

        <Descriptions column={4} style={{ marginBottom: SPACING.lg }}>
          <Descriptions.Item label="环境名称">{env.name}</Descriptions.Item>
          <Descriptions.Item label="所属团队">{env.team}</Descriptions.Item>
          <Descriptions.Item label="使用人">{env.user || '-'}</Descriptions.Item>
          <Descriptions.Item label="环境状态">{renderStatusText(env.status)}</Descriptions.Item>
        </Descriptions>

        <DetailSection title="设备详情：">
          <Descriptions column={5}>
            <Descriptions.Item label="设备IP">{env.deviceIp}</Descriptions.Item>
            <Descriptions.Item label="机型">{env.modelName}</Descriptions.Item>
            <Descriptions.Item label="登录用户名">{env.deviceUsername || '-'}</Descriptions.Item>
            <Descriptions.Item label="密码">{env.devicePassword || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{renderStatusText(deviceStatus)}</Descriptions.Item>
          </Descriptions>
          <Descriptions column={4} style={{ marginTop: SPACING.md }}>
            <Descriptions.Item label="序列号">{env.deviceSerialNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{env.devicePhone || '-'}</Descriptions.Item>
            <Descriptions.Item label="车牌号">{env.devicePlateNo || '-'}</Descriptions.Item>
          </Descriptions>
        </DetailSection>

        <DetailSection title="执行机详情：">
          <Descriptions column={5}>
            <Descriptions.Item label="执行机IP">{env.executorIp}</Descriptions.Item>
            <Descriptions.Item label="操作系统">{formatExecutorOs(env.executorOs)}</Descriptions.Item>
            <Descriptions.Item label="登录用户名">{env.executorUsername || '-'}</Descriptions.Item>
            <Descriptions.Item label="密码">{env.executorPassword || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{renderStatusText(executorStatus)}</Descriptions.Item>
          </Descriptions>
        </DetailSection>

        <DetailSection title="控制盒详情：">
          <Descriptions column={4}>
            <Descriptions.Item label="控制盒ID">{env.controlBoxId || '-'}</Descriptions.Item>
            <Descriptions.Item label="控制盒版本">{env.controlBoxVersion}</Descriptions.Item>
            <Descriptions.Item label="camid">{env.camid || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{renderStatusText(controlBoxStatus)}</Descriptions.Item>
          </Descriptions>
        </DetailSection>
      </Card>
    </div>
  );
}

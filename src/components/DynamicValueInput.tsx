/**
 * 通用：变量值 / 参数值 / 配置值等输入框右侧「插入动态值」入口。
 * 交互统一维护在本文件，其它页面按需引入即可同步升级。
 */
import { useMemo, useState, type ChangeEvent } from 'react';
import {
  Button,
  Card,
  Input,
  List,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { InputProps } from 'antd';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  DeploymentUnitOutlined,
  FunctionOutlined,
  HighlightOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';

type Step = 'menu' | 'global' | 'datagen';

const DATA_GEN_PRESETS: {
  label: string;
  value: string;
  expr: string;
  preview: () => string;
}[] = [
  {
    label: '随机 UUID',
    value: 'uuid',
    expr: '$uuid()',
    preview: () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  },
  {
    label: 'Unix 时间戳（秒）',
    value: 'ts',
    expr: '$timestamp()',
    preview: () => String(Math.floor(Date.now() / 1000)),
  },
  {
    label: '随机整数（0–9999）',
    value: 'rand',
    expr: '$randomInt(0,9999)',
    preview: () => String(Math.floor(Math.random() * 10000)),
  },
];

export type DynamicValueInputProps = Omit<InputProps, 'suffix' | 'addonAfter'> & {
  /** 「插入全局变量」可选名称；为空时使用内置示例名便于联调 */
  globalVariableOptions?: string[];
};

export function DynamicValueInput({
  globalVariableOptions,
  value,
  onChange,
  ...rest
}: DynamicValueInputProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [search, setSearch] = useState('');
  const [pickedGlobal, setPickedGlobal] = useState<string | null>(null);
  const [genKind, setGenKind] = useState<string | null>(null);
  const [previewTick, setPreviewTick] = useState(0);

  const varNames = useMemo(() => {
    const raw = globalVariableOptions?.map((s) => s.trim()).filter(Boolean) ?? [];
    const uniq = [...new Set(raw)];
    return uniq.length ? uniq : ['case_level', 'file_id'];
  }, [globalVariableOptions]);

  const filteredVars = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return varNames;
    return varNames.filter((n) => n.toLowerCase().includes(k));
  }, [varNames, search]);

  const resetModalState = () => {
    setStep('menu');
    setSearch('');
    setPickedGlobal(null);
    setGenKind(null);
  };

  const closeAll = () => {
    setOpen(false);
    resetModalState();
  };

  const append = (inserted: string) => {
    const cur = String(value ?? '');
    const next = cur + inserted;
    onChange?.({ target: { value: next } } as ChangeEvent<HTMLInputElement>);
    message.success('已插入');
    closeAll();
  };

  const genPreset = genKind ? DATA_GEN_PRESETS.find((o) => o.value === genKind) : undefined;
  const previewValue = genPreset && previewTick >= 0 ? genPreset.preview() : '';

  const suffix = (
    <Tooltip title="插入动态值">
      <Button
        type="text"
        size="small"
        icon={<HighlightOutlined style={{ color: '#faad14' }} />}
        onClick={(e) => {
          e.stopPropagation();
          resetModalState();
          setOpen(true);
        }}
        aria-label="插入动态值"
        style={{ marginInlineEnd: -6 }}
      />
    </Tooltip>
  );

  const menuTitle = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: -8,
        paddingBottom: 4,
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 600 }}>插入动态值</span>
      <Button type="text" icon={<CloseOutlined />} onClick={closeAll} aria-label="关闭" />
    </div>
  );

  const subTitle = (label: string, onBack: () => void) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 4,
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        aria-label="返回"
      />
      <span style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{label}</span>
      <Button type="text" icon={<CloseOutlined />} onClick={closeAll} aria-label="关闭" />
    </div>
  );

  return (
    <>
      <Input {...rest} value={value} onChange={onChange} suffix={suffix} />
      <Modal
        open={open}
        onCancel={closeAll}
        footer={null}
        width={440}
        closable={false}
        destroyOnClose
        styles={{ body: { paddingTop: 12 } }}
        title={
          step === 'menu'
            ? menuTitle
            : step === 'global'
              ? subTitle('插入全局变量', () => {
                  setStep('menu');
                  setPickedGlobal(null);
                  setSearch('');
                })
              : subTitle('数据生成', () => {
                  setStep('menu');
                  setGenKind(null);
                })
        }
      >
        {step === 'menu' ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card
              size="small"
              hoverable
              styles={{ body: { padding: 14 } }}
              onClick={() => {
                setStep('global');
                setPickedGlobal(null);
                setSearch('');
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size={12}>
                  <DeploymentUnitOutlined style={{ fontSize: 22, color: '#eb2f96' }} />
                  <div>
                    <Typography.Text strong>全局变量</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        插入全局变量
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
                <RightOutlined style={{ color: '#bfbfbf' }} />
              </Space>
            </Card>
            <Card
              size="small"
              hoverable
              styles={{ body: { padding: 14 } }}
              onClick={() => {
                setStep('datagen');
                setGenKind(null);
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size={12}>
                  <FunctionOutlined style={{ fontSize: 22, color: '#13c2c2' }} />
                  <div>
                    <Typography.Text strong>数据生成</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        生成特定规则/随机数据
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
                <RightOutlined style={{ color: '#bfbfbf' }} />
              </Space>
            </Card>
          </Space>
        ) : null}

        {step === 'global' ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="查询"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
              <List
                size="small"
                dataSource={filteredVars}
                locale={{ emptyText: '无匹配变量' }}
                renderItem={(name) => (
                  <List.Item
                    key={name}
                    onClick={() => setPickedGlobal(name)}
                    style={{
                      cursor: 'pointer',
                      background: pickedGlobal === name ? '#e6f4ff' : undefined,
                    }}
                  >
                    <Typography.Text code>{name}</Typography.Text>
                  </List.Item>
                )}
              />
            </div>
            <Button
              type="primary"
              block
              disabled={!pickedGlobal}
              onClick={() => pickedGlobal && append(`{{${pickedGlobal}}}`)}
            >
              插入
            </Button>
          </Space>
        ) : null}

        {step === 'datagen' ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Select
              placeholder="选择生成规则"
              allowClear
              style={{ width: '100%' }}
              value={genKind}
              onChange={(v) => {
                setGenKind(v ?? null);
                setPreviewTick((t) => t + 1);
              }}
              options={DATA_GEN_PRESETS.map((p) => ({ label: p.label, value: p.value }))}
            />
            <div
              style={{
                background: '#e6f4ff',
                borderRadius: 8,
                padding: 12,
                position: 'relative',
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                aria-label="刷新预览"
                onClick={() => setPreviewTick((t) => t + 1)}
                style={{ position: 'absolute', right: 8, top: 8 }}
              />
              <Space direction="vertical" size={6} style={{ paddingRight: 28 }}>
                <div>
                  <Typography.Text type="secondary">表达式：</Typography.Text>
                  <Typography.Text code style={{ marginLeft: 8 }}>
                    {genPreset?.expr ?? '—'}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary">预览：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{previewValue || '—'}</Typography.Text>
                </div>
              </Space>
            </div>
            <Button
              type="primary"
              block
              disabled={!genPreset}
              onClick={() => genPreset && append(genPreset.expr)}
            >
              插入
            </Button>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

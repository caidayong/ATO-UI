import { useMemo } from 'react';
import { Typography } from 'antd';
import type { CaseModule, VersionSuite } from '@/types';
import { getSuiteConfigPreviewLines } from '@/utils/suiteScopeDisplay';
import { mockTagManagementGroups } from '@/mocks/data';

type Props = {
  suite: VersionSuite;
  versionModules: CaseModule[];
};

const BLOCK_STYLE = {
  background: '#fff',
  borderRadius: 6,
  padding: '8px 10px',
  border: '1px solid #f0f0f0',
  marginTop: 8,
} as const;

const TITLE_STYLE = { display: 'block', marginBottom: 4, fontSize: 13 } as const;

const LINE_STYLE = { display: 'block', fontSize: 12, lineHeight: 1.45, marginBottom: 2 } as const;

export function SuiteConfigPreview({ suite, versionModules }: Props) {
  const groupIdToName = useMemo(
    () => new Map(mockTagManagementGroups.map((g) => [g.id, g.name])),
    []
  );

  const { scopeLines, parallelLines } = useMemo(
    () => getSuiteConfigPreviewLines(suite, versionModules, groupIdToName),
    [suite, versionModules, groupIdToName]
  );

  return (
    <div style={BLOCK_STYLE}>
      <Typography.Text strong style={TITLE_STYLE}>
        套件配置预览
      </Typography.Text>
      <Typography.Text type="secondary" style={{ ...TITLE_STYLE, marginBottom: 6 }}>
        用例范围
      </Typography.Text>
      <Typography.Text style={LINE_STYLE}>{scopeLines[0]}</Typography.Text>
      <Typography.Text type="secondary" style={LINE_STYLE}>
        {scopeLines[1]}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ ...TITLE_STYLE, marginTop: 8, marginBottom: 4 }}>
        并行配置
      </Typography.Text>
      {parallelLines.map((line) => (
        <Typography.Text key={line} style={LINE_STYLE}>
          {line}
        </Typography.Text>
      ))}
      {suite.description ? (
        <Typography.Text type="secondary" style={{ ...LINE_STYLE, marginTop: 6 }}>
          套件说明：{suite.description}
        </Typography.Text>
      ) : null}
    </div>
  );
}

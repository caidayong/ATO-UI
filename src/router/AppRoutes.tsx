import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { VersionDevLayout } from '@/layouts/VersionDevLayout';
import { DeviceVersionDevLayout } from '@/layouts/DeviceVersionDevLayout';
import { ProjectList } from '@/pages/ProjectList';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { VersionDetail } from '@/pages/VersionDetail';
import { BasicData } from '@/pages/BasicData';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { CaseManagement } from '@/pages/CaseManagement';
import { VariableManagement } from '@/pages/VariableManagement';
import { FileManagement } from '@/pages/FileManagement';
import { CustomFunctionManagement } from '@/pages/CustomFunctionManagement';
import { TagManagement } from '@/pages/TagManagement';
import { TestRuns } from '@/pages/TestRuns';
import { TestRunDetail } from '@/pages/TestRunDetail';
import { PlatformAutomation } from '@/pages/PlatformAutomation';
import { PlatformAutomationTaskDetail } from '@/pages/PlatformAutomationTaskDetail';
import { ProductionPlanList } from '@/pages/ProductionPlanList';
import { ProductionPlanDetail } from '@/pages/ProductionPlanDetail';
import { HistoricalPlanDataManagement } from '@/pages/HistoricalPlanDataManagement';
import { ResumeManagement } from '@/pages/ResumeManagement';
import { SuiteManagement } from '@/pages/SuiteManagement';
import { MarketDefectAnalysis } from '@/pages/MarketDefectAnalysis';
import { MarketDefectReportPage } from '@/pages/MarketDefectReportPage';
import { MarketDefectReportDetailPage } from '@/pages/MarketDefectReportDetailPage';
import { InterfaceManagement } from '@/pages/InterfaceManagement';
import { ToolsHub } from '@/pages/ToolsHub';
import { ProjectReportsPage } from '@/pages/ProjectReportsPage';
import { ProjectReportDetailPage } from '@/pages/ProjectReportDetailPage';
import { ProjectReportStatisticsPage } from '@/pages/ProjectReportStatisticsPage';
import { ResourceManagement } from '@/pages/ResourceManagement';
import { ResourceEnvironmentDetail } from '@/pages/ResourceEnvironmentDetail';
import { DocsLayout } from '@/layouts/DocsLayout';
import { DocsVersionHub } from '@/pages/docs/DocsVersionHub';
import { DocsVersionList } from '@/pages/docs/DocsVersionList';
import { DocsViewer } from '@/pages/docs/DocsViewer';
import {
  DeviceCaseManagement,
  DeviceVariableManagement,
  DeviceFileManagement,
  DeviceTagManagement,
  DeviceSuiteManagement,
  DeviceCustomFunctionManagement,
  DeviceTestRuns,
  DeviceTestRunDetail,
} from '@/pages/device-case-dev';

function VersionDevIndexRedirect() {
  const { search } = useLocation();
  return <Navigate to={`cases${search}`} replace />;
}

function VersionDevFileAliasRedirect() {
  const { search } = useLocation();
  return <Navigate to={`../files${search}`} replace />;
}

function VersionDevFallbackRedirect() {
  const { search } = useLocation();
  return <Navigate to={`cases${search}`} replace />;
}

function DeviceVersionDevIndexRedirect() {
  const { search } = useLocation();
  return <Navigate to={`cases${search}`} replace />;
}

function DeviceVersionDevFileAliasRedirect() {
  const { search } = useLocation();
  return <Navigate to={`../files${search}`} replace />;
}

function DeviceVersionDevFallbackRedirect() {
  const { search } = useLocation();
  return <Navigate to={`cases${search}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* 需求文档（只读 Markdown，独立布局） */}
      <Route path="/docs" element={<DocsLayout />}>
        <Route index element={<DocsVersionHub />} />
        <Route path=":version" element={<DocsVersionList />} />
        <Route path=":version/:docSlug" element={<DocsViewer />} />
      </Route>

      {/* 新窗口：版本用例开发（无主框架） */}
      <Route path="/version-dev/:projectId/:versionId" element={<VersionDevLayout />}>
        <Route index element={<VersionDevIndexRedirect />} />
        <Route path="cases" element={<CaseManagement />} />
        <Route path="variables" element={<VariableManagement />} />
        <Route path="files" element={<FileManagement />} />
        <Route path="file" element={<VersionDevFileAliasRedirect />} />
        <Route path="functions" element={<CustomFunctionManagement />} />
        <Route path="tags" element={<TagManagement />} />
        <Route path="suites" element={<SuiteManagement />} />
        <Route path="runs" element={<TestRuns />} />
        <Route path="runs/:runId" element={<TestRunDetail />} />
        <Route path="*" element={<VersionDevFallbackRedirect />} />
      </Route>

      {/* 新窗口：整机版本用例开发（与平台 /version-dev 路由隔离） */}
      <Route
        path="/device-version-dev/:projectId/:versionId"
        element={<DeviceVersionDevLayout />}
      >
        <Route index element={<DeviceVersionDevIndexRedirect />} />
        <Route path="cases" element={<DeviceCaseManagement />} />
        <Route path="variables" element={<DeviceVariableManagement />} />
        <Route path="files" element={<DeviceFileManagement />} />
        <Route path="file" element={<DeviceVersionDevFileAliasRedirect />} />
        <Route path="tags" element={<DeviceTagManagement />} />
        <Route path="suites" element={<DeviceSuiteManagement />} />
        <Route path="functions" element={<DeviceCustomFunctionManagement />} />
        <Route path="runs" element={<DeviceTestRuns />} />
        <Route path="runs/:runId" element={<DeviceTestRunDetail />} />
        <Route path="*" element={<DeviceVersionDevFallbackRedirect />} />
      </Route>

      {/* 主框架 */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<PlaceholderPage title="欢迎来到自动化测试平台" description="请从左侧菜单进入各模块" />} />
        <Route path="dashboard" element={<PlaceholderPage title="仪表盘" />} />
        <Route path="automation/projects" element={<ProjectList />} />
        <Route path="automation/projects/:id" element={<ProjectDetail />} />
        <Route path="automation/projects/:projectId/versions/:versionId" element={<VersionDetail />} />
        <Route path="automation/interface-management" element={<InterfaceManagement />} />
        <Route path="resources" element={<ResourceManagement />} />
        <Route path="resources/environments/:envId" element={<ResourceEnvironmentDetail />} />
        <Route path="application/platform" element={<PlatformAutomation />} />
        <Route path="application/platform/tasks/:taskId" element={<PlatformAutomationTaskDetail />} />
        <Route path="application/device" element={<PlaceholderPage title="设备自动化" />} />
        <Route path="settings/basic" element={<BasicData />} />
        <Route path="ptsw/plans" element={<ProductionPlanList />} />
        <Route path="ptsw/plans/history" element={<HistoricalPlanDataManagement />} />
        <Route path="ptsw/plans/:planId" element={<ProductionPlanDetail />} />
        <Route path="ptsw/resume" element={<ResumeManagement />} />
        <Route path="tools" element={<ToolsHub />} />
        <Route path="tools/project-reports" element={<ProjectReportsPage />} />
        <Route path="tools/project-reports/statistics" element={<ProjectReportStatisticsPage />} />
        <Route path="tools/project-reports/:reportConfigId" element={<ProjectReportDetailPage />} />
        <Route path="tools/market-defects" element={<MarketDefectAnalysis />} />
        <Route path="tools/market-defects/report" element={<MarketDefectReportPage />} />
        <Route path="tools/market-defects/reports/:reportId" element={<MarketDefectReportDetailPage />} />
        <Route path="*" element={<PlaceholderPage title="页面建设中…" />} />
      </Route>
    </Routes>
  );
}

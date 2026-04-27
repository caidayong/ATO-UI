import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { VersionDevLayout } from '@/layouts/VersionDevLayout';
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
import { ResumeManagement } from '@/pages/ResumeManagement';

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

export function AppRoutes() {
  return (
    <Routes>
      {/* 新窗口：版本用例开发（无主框架） */}
      <Route path="/version-dev/:projectId/:versionId" element={<VersionDevLayout />}>
        <Route index element={<VersionDevIndexRedirect />} />
        <Route path="cases" element={<CaseManagement />} />
        <Route path="variables" element={<VariableManagement />} />
        <Route path="files" element={<FileManagement />} />
        <Route path="file" element={<VersionDevFileAliasRedirect />} />
        <Route path="functions" element={<CustomFunctionManagement />} />
        <Route path="tags" element={<TagManagement />} />
        <Route path="runs" element={<TestRuns />} />
        <Route path="runs/:runId" element={<TestRunDetail />} />
        <Route path="*" element={<VersionDevFallbackRedirect />} />
      </Route>

      {/* 主框架 */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<PlaceholderPage title="欢迎来到自动化测试平台" description="请从左侧菜单进入各模块" />} />
        <Route path="dashboard" element={<PlaceholderPage title="仪表盘" />} />
        <Route path="automation/projects" element={<ProjectList />} />
        <Route path="automation/projects/:id" element={<ProjectDetail />} />
        <Route path="automation/projects/:projectId/versions/:versionId" element={<VersionDetail />} />
        <Route path="application/platform" element={<PlatformAutomation />} />
        <Route path="application/platform/tasks/:taskId" element={<PlatformAutomationTaskDetail />} />
        <Route path="application/device" element={<PlaceholderPage title="设备自动化" />} />
        <Route path="settings/basic" element={<BasicData />} />
        <Route path="ptsw/plans" element={<ProductionPlanList />} />
        <Route path="ptsw/plans/:planId" element={<ProductionPlanDetail />} />
        <Route path="ptsw/resume" element={<ResumeManagement />} />
        <Route path="*" element={<PlaceholderPage title="页面建设中…" />} />
      </Route>
    </Routes>
  );
}

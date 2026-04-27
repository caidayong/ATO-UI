/**
 * @page 自定义函数
 * @version V1.0.1
 * @base docs/prd/ATO_V1.0.0-页面需求与交互规格.md §4.8；docs/spec/04-页面契约.md §页面 8
 * @changes
 *   - V1.0.0: 初始实现自定义函数页；支持函数列表搜索、新增/导入/批量删除、重命名、删除及 Python 文本编辑（Mock）
 *   - V1.0.1: 编辑界面「返回」置于标题前；增加「运行」并在底部展示 Mock 运行输出
 */
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  ImportOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { mockFunctionFiles } from '@/mocks/data';

type FunctionFile = {
  id: string;
  fileName: string;
  language: 'python';
  updatedAt: string;
  author: string;
  content: string;
};

function nowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function nowTimeString(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function normalizeFunctionFileName(rawName: string): string {
  const name = rawName.trim();
  if (!name) return '';
  return name.endsWith('.py') ? name : `${name}.py`;
}

export function CustomFunctionManagement() {
  const [files, setFiles] = useState<FunctionFile[]>(() => [...mockFunctionFiles]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentUser] = useState('AI');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm<{ fileName: string }>();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFiles, setImportFiles] = useState<UploadFile[]>([]);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FunctionFile | null>(null);
  const [renameForm] = Form.useForm<{ fileName: string }>();

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [runOutput, setRunOutput] = useState('');

  const filteredFiles = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return files;
    return files.filter(
      (f) =>
        f.fileName.toLowerCase().includes(keyword) ||
        f.language.toLowerCase().includes(keyword) ||
        f.author.toLowerCase().includes(keyword)
    );
  }, [files, searchText]);

  const editingFile = useMemo(
    () => files.find((item) => item.id === editingFileId) ?? null,
    [editingFileId, files]
  );

  const ensureUniqueName = (name: string, excludeId?: string): boolean =>
    !files.some((f) => f.id !== excludeId && f.fileName.toLowerCase() === name.toLowerCase());

  const openAddModal = () => {
    addForm.resetFields();
    setAddModalOpen(true);
  };

  const submitAddFunction = async () => {
    const values = await addForm.validateFields();
    const fileName = normalizeFunctionFileName(values.fileName);
    if (!fileName) {
      message.warning('请输入函数文件名称');
      return;
    }
    if (!ensureUniqueName(fileName)) {
      message.warning('函数文件名称已存在');
      return;
    }
    const newFile: FunctionFile = {
      id: nowId('func'),
      fileName,
      language: 'python',
      updatedAt: nowTimeString(),
      author: currentUser,
      content: 'def new_function():\n    pass\n',
    };
    setFiles((prev) => [newFile, ...prev]);
    setAddModalOpen(false);
    message.success('函数文件已添加');
  };

  const submitImportFunctions = () => {
    if (!importFiles.length) {
      message.warning('请至少选择一个函数文件');
      return;
    }
    const now = nowTimeString();
    const nextFiles: FunctionFile[] = [];
    const skipped: string[] = [];

    importFiles.forEach((f) => {
      const normalized = normalizeFunctionFileName(f.name || '');
      if (!normalized) return;
      const isPy = normalized.toLowerCase().endsWith('.py');
      if (!isPy) {
        skipped.push(normalized);
        return;
      }
      if (!ensureUniqueName(normalized)) {
        skipped.push(normalized);
        return;
      }
      nextFiles.push({
        id: nowId('func'),
        fileName: normalized,
        language: 'python',
        updatedAt: now,
        author: currentUser,
        content: `# imported from ${normalized}\n`,
      });
    });

    if (nextFiles.length) {
      setFiles((prev) => [...nextFiles, ...prev]);
      message.success(`成功导入 ${nextFiles.length} 个函数文件`);
    }
    if (skipped.length) {
      message.warning(`已跳过 ${skipped.length} 个文件（非 .py 或重名）`);
    }

    setImportFiles([]);
    setImportModalOpen(false);
  };

  const openRenameModal = (row: FunctionFile) => {
    setRenamingFile(row);
    renameForm.setFieldsValue({ fileName: row.fileName });
    setRenameModalOpen(true);
  };

  const submitRename = async () => {
    if (!renamingFile) return;
    const values = await renameForm.validateFields();
    const nextName = normalizeFunctionFileName(values.fileName);
    if (!nextName) {
      message.warning('请输入函数文件名称');
      return;
    }
    if (!ensureUniqueName(nextName, renamingFile.id)) {
      message.warning('函数文件名称已存在');
      return;
    }
    setFiles((prev) =>
      prev.map((f) =>
        f.id === renamingFile.id ? { ...f, fileName: nextName, updatedAt: nowTimeString() } : f
      )
    );
    setRenameModalOpen(false);
    message.success('函数文件已重命名');
  };

  const deleteFunction = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
    if (editingFileId === id) {
      setEditingFileId(null);
      setEditorContent('');
      setRunPanelOpen(false);
      setRunOutput('');
    }
    message.success('函数文件已删除');
  };

  const bulkDeleteFunctions = () => {
    Modal.confirm({
      title: `确认删除已选 ${selectedRowKeys.length} 个函数文件？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const idSet = new Set(selectedRowKeys as string[]);
        setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));
        setSelectedRowKeys([]);
        if (editingFileId && idSet.has(editingFileId)) {
          setEditingFileId(null);
          setEditorContent('');
          setRunPanelOpen(false);
          setRunOutput('');
        }
        message.success('已批量删除函数文件');
      },
    });
  };

  const exitEditor = () => {
    setEditingFileId(null);
    setEditorContent('');
    setRunPanelOpen(false);
    setRunOutput('');
  };

  const openEditor = (row: FunctionFile) => {
    setEditingFileId(row.id);
    setEditorContent(row.content);
    setRunPanelOpen(false);
    setRunOutput('');
  };

  const runFunctionMock = () => {
    if (!editingFile) return;
    const ts = nowTimeString();
    const lines = [
      `[Mock] ${ts}`,
      `文件: ${editingFile.fileName}`,
      '--- 标准输出 ---',
      '（联调后将显示 Python 解释器 stdout/stderr）',
      `当前脚本行数: ${editorContent.split('\n').length}`,
      'exit code: 0',
    ];
    setRunOutput(lines.join('\n'));
    setRunPanelOpen(true);
    message.success('已执行运行（Mock）');
  };

  const saveEditorContent = () => {
    if (!editingFile) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === editingFile.id
          ? { ...f, content: editorContent, updatedAt: nowTimeString(), author: currentUser }
          : f
      )
    );
    message.success('函数内容已保存（Mock）');
  };

  const columns: ColumnsType<FunctionFile> = [
    { title: '文件名', dataIndex: 'fileName', ellipsis: true },
    {
      title: '语言',
      dataIndex: 'language',
      width: 120,
      render: () => <Tag color="blue">python</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
    { title: '作者', dataIndex: 'author', width: 120 },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditor(row)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => openRenameModal(row)}>
            重命名
          </Button>
          <Popconfirm title="确认删除该函数文件？" onConfirm={() => deleteFunction(row.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (editingFile) {
    return (
      <Card
        size="small"
        title={
          <Space align="center" size="middle" wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={exitEditor}>
              返回
            </Button>
            <Typography.Text strong>
              编辑函数：{editingFile.fileName}
            </Typography.Text>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PlayCircleOutlined />} onClick={runFunctionMock}>
              运行
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveEditorContent}>
              保存
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Python 文本编辑（Mock）：支持直接编辑函数脚本内容。
        </Typography.Paragraph>
        <Input.TextArea
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          autoSize={{ minRows: runPanelOpen ? 14 : 22, maxRows: runPanelOpen ? 18 : 28 }}
          style={{ fontFamily: 'Consolas, Monaco, monospace' }}
          placeholder="请输入 Python 函数内容"
        />
        {runPanelOpen ? (
          <div
            style={{
              marginTop: 16,
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
            }}
          >
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              运行结果
            </Typography.Text>
            <pre
              style={{
                margin: 0,
                padding: 12,
                maxHeight: 220,
                overflow: 'auto',
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {runOutput}
            </pre>
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <>
      <Card
        size="small"
        styles={{ body: { padding: 16, height: 'calc(100vh - 140px)', minHeight: 560, overflow: 'auto' } }}
      >
        <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
              添加函数
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>
              导入函数
            </Button>
            <Button
              icon={<DeleteOutlined />}
              danger
              disabled={!selectedRowKeys.length}
              onClick={bulkDeleteFunctions}
            >
              删除
            </Button>
          </Space>
          <Input.Search
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索文件名/语言/作者"
            style={{ width: 320 }}
          />
        </Space>

        <Table
          size="small"
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={filteredFiles}
          pagination={{ pageSize: 8, showSizeChanger: true }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无函数文件" /> }}
        />
      </Card>

      <Modal
        title="添加函数"
        open={addModalOpen}
        onOk={submitAddFunction}
        onCancel={() => setAddModalOpen(false)}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            label="函数文件名称"
            name="fileName"
            rules={[
              { required: true, message: '请输入函数文件名称' },
              { max: 64, message: '长度不能超过 64' },
            ]}
          >
            <Input placeholder="例如：request_helpers.py（可省略 .py）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导入函数"
        open={importModalOpen}
        onOk={submitImportFunctions}
        onCancel={() => {
          setImportModalOpen(false);
          setImportFiles([]);
        }}
        destroyOnClose
      >
        <Upload.Dragger
          multiple
          fileList={importFiles}
          beforeUpload={() => false}
          onChange={(info) => setImportFiles(info.fileList)}
        >
          <p style={{ marginBottom: 8 }}>
            <ImportOutlined />
          </p>
          <p style={{ margin: 0 }}>点击或拖拽文件到此区域上传（支持批量）</p>
          <p style={{ marginTop: 8, color: '#8c8c8c' }}>仅支持 Python 文件（.py）</p>
        </Upload.Dragger>
      </Modal>

      <Modal
        title="重命名函数文件"
        open={renameModalOpen}
        onOk={submitRename}
        onCancel={() => setRenameModalOpen(false)}
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical">
          <Form.Item
            label="函数文件名称"
            name="fileName"
            rules={[
              { required: true, message: '请输入函数文件名称' },
              { max: 64, message: '长度不能超过 64' },
            ]}
          >
            <Input placeholder="例如：request_helpers.py（可省略 .py）" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

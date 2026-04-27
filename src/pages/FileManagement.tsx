/**
 * @page 文件管理
 * @version V1.0.1
 * @base ATO_V1.0.0-页面需求与交互规格.md §4.7；docs/spec/04-页面契约.md §页面 7
 * @changes
 *   - V1.0.0: 初始实现文件管理页；支持目录树增删改、文件上传/编辑、文件搜索、批量删除与下载（Mock）
 *   - V1.0.1: 左栏改为“文件目录”+搜索/添加布局；目录限制一级；目录操作改为 hover 三点菜单；文件列表分页固定右下
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tree,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FolderAddOutlined,
  MoreOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { mockFileFolders, mockManagedFiles } from '@/mocks/data';

type FileFolder = {
  id: string;
  name: string;
  parentId: string | null;
};

type ManagedFile = {
  id: string;
  folderId: string;
  name: string;
  type: string;
  path: string;
  description: string;
  updatedAt: string;
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function getFolderPath(folderId: string, folders: FileFolder[]): string {
  const path: string[] = [];
  let current = folders.find((x) => x.id === folderId) || null;
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? folders.find((x) => x.id === current!.parentId) || null : null;
  }
  return `/${path.join('/')}`;
}

function buildFolderTree(folders: FileFolder[]): DataNode[] {
  return folders
    .filter((f) => f.parentId === null)
    .map((f) => ({
      key: f.id,
      title: f.name,
      isLeaf: true,
    }));
}

export function FileManagement() {
  const [folders, setFolders] = useState<FileFolder[]>(
    () => mockFileFolders.filter((f) => f.parentId === null).map((f) => ({ ...f, parentId: null }))
  );
  const [files, setFiles] = useState<ManagedFile[]>(() => [...mockManagedFiles]);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('root-api');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [folderKeyword, setFolderKeyword] = useState<string>('');

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderEditing, setFolderEditing] = useState<FileFolder | null>(null);
  const [folderForm] = Form.useForm<{ name: string }>();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm] = Form.useForm<{ folderId: string; description?: string }>();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<ManagedFile | null>(null);
  const [editForm] = Form.useForm<{ name: string; description?: string }>();
  const [replaceFiles, setReplaceFiles] = useState<UploadFile[]>([]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const filteredFolderTree = useMemo(() => {
    const keyword = folderKeyword.trim().toLowerCase();
    if (!keyword) return folderTree;
    return folderTree.filter((node) =>
      String(node.title).toLowerCase().includes(keyword)
    );
  }, [folderKeyword, folderTree]);
  const filteredFiles = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const rows = files.filter((f) => f.folderId === selectedFolderId);
    if (!keyword) return rows;
    return rows.filter(
      (f) =>
        f.name.toLowerCase().includes(keyword) ||
        f.type.toLowerCase().includes(keyword) ||
        f.path.toLowerCase().includes(keyword) ||
        f.description.toLowerCase().includes(keyword)
    );
  }, [files, searchText, selectedFolderId]);

  const openCreateFolder = () => {
    setFolderEditing(null);
    folderForm.resetFields();
    setFolderModalOpen(true);
  };

  const openRenameFolder = (folder: FileFolder) => {
    setFolderEditing(folder);
    folderForm.setFieldsValue({ name: folder.name });
    setFolderModalOpen(true);
  };

  const saveFolder = async () => {
    const values = await folderForm.validateFields();
    const name = values.name.trim();
    if (folderEditing) {
      setFolders((prev) => prev.map((f) => (f.id === folderEditing.id ? { ...f, name } : f)));
      setFiles((prev) =>
        prev.map((item) => ({
          ...item,
          path: getFolderPath(item.folderId, folders.map((f) => (f.id === folderEditing.id ? { ...f, name } : f))),
        }))
      );
      message.success('目录已重命名');
    } else {
      const newFolder: FileFolder = { id: makeId('folder'), name, parentId: null };
      setFolders((prev) => [...prev, newFolder]);
      message.success('已新增目录');
    }
    setFolderModalOpen(false);
  };

  const deleteFolder = (folderId: string) => {
    const hasChild = folders.some((f) => f.parentId === folderId);
    const hasFile = files.some((f) => f.folderId === folderId);
    if (hasChild || hasFile) {
      message.warning('请先清空子目录或文件后再删除');
      return;
    }
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (selectedFolderId === folderId) {
      const fallback = folders.find((f) => f.id !== folderId)?.id;
      if (fallback) setSelectedFolderId(fallback);
    }
    message.success('目录已删除');
  };

  const submitUpload = async () => {
    const values = await uploadForm.validateFields();
    if (!uploadFiles.length) {
      message.warning('请至少选择一个文件');
      return;
    }
    const folderId = values.folderId;
    const path = getFolderPath(folderId, folders);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newRows: ManagedFile[] = uploadFiles.map((f) => {
      const fileName = f.name || 'unnamed.file';
      const seg = fileName.split('.');
      const type = seg.length > 1 ? seg[seg.length - 1].toLowerCase() : 'unknown';
      return {
        id: makeId('file'),
        folderId,
        name: fileName,
        type,
        path,
        description: values.description?.trim() || '',
        updatedAt: now,
      };
    });
    setFiles((prev) => [...newRows, ...prev]);
    setUploadFiles([]);
    setUploadModalOpen(false);
    uploadForm.resetFields();
    message.success(`已上传 ${newRows.length} 个文件（Mock）`);
  };

  const openEditFile = (row: ManagedFile) => {
    setEditingFile(row);
    setReplaceFiles([]);
    editForm.setFieldsValue({ name: row.name, description: row.description });
    setEditModalOpen(true);
  };

  const submitEditFile = async () => {
    if (!editingFile) return;
    const values = await editForm.validateFields();
    const replacement = replaceFiles[0];
    const nextName = replacement?.name ? replacement.name : values.name.trim();
    const seg = nextName.split('.');
    const nextType = seg.length > 1 ? seg[seg.length - 1].toLowerCase() : editingFile.type;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setFiles((prev) =>
      prev.map((f) =>
        f.id === editingFile.id
          ? {
              ...f,
              name: nextName,
              type: nextType,
              description: values.description?.trim() || '',
              updatedAt: now,
            }
          : f
      )
    );
    setEditModalOpen(false);
    setReplaceFiles([]);
    message.success('文件已更新');
  };

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
    message.success('文件已删除');
  };

  const bulkDeleteFiles = () => {
    Modal.confirm({
      title: `确认删除已选 ${selectedRowKeys.length} 个文件？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const keySet = new Set(selectedRowKeys as string[]);
        setFiles((prev) => prev.filter((f) => !keySet.has(f.id)));
        setSelectedRowKeys([]);
        message.success('已批量删除');
      },
    });
  };

  const downloadSelected = () => {
    if (!selectedRowKeys.length) return;
    message.success(`已触发 ${selectedRowKeys.length} 个文件下载（Mock）`);
  };

  const columns: ColumnsType<ManagedFile> = [
    { title: '文件名称', dataIndex: 'name', ellipsis: true },
    { title: '文件类型', dataIndex: 'type', width: 110 },
    { title: '所属路径', dataIndex: 'path', width: 220, ellipsis: true },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, row) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => message.success(`开始下载：${row.name}（Mock）`)}
          >
            下载
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditFile(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该文件？" onConfirm={() => deleteFile(row.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const folderMenuItems = (_folder: FileFolder): MenuProps['items'] => [
    { key: 'rename', label: '重命名', icon: <EditOutlined /> },
    { type: 'divider' },
    { key: 'delete', label: '删除', danger: true, icon: <DeleteOutlined /> },
  ];

  const onFolderMenuClick = (folder: FileFolder, key: string) => {
    if (key === 'rename') openRenameFolder(folder);
    if (key === 'delete') deleteFolder(folder.id);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 16,
        height: 'calc(100vh - 140px)',
        minHeight: 560,
      }}
    >
      <Card
        size="small"
        title="文件目录"
      >
        <style>
          {`
            .file-folder-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              min-width: 0;
              gap: 6px;
            }
            .file-folder-row .file-folder-row-action {
              opacity: 0;
              pointer-events: none;
              transition: opacity .15s ease;
            }
            .file-folder-row:hover .file-folder-row-action {
              opacity: 1;
              pointer-events: auto;
            }
          `}
        </style>

        <Space
          size={8}
          style={{ width: '100%', marginBottom: 10, justifyContent: 'space-between' }}
        >
          <Input
            allowClear
            placeholder="Search"
            value={folderKeyword}
            onChange={(e) => setFolderKeyword(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ flex: 1 }}
          />
          <Button type="primary" size="middle" icon={<FolderAddOutlined />} onClick={openCreateFolder} />
        </Space>

        {filteredFolderTree.length ? (
          <Tree
            selectedKeys={[selectedFolderId]}
            onSelect={(keys) => {
              if (keys[0] && typeof keys[0] === 'string') setSelectedFolderId(keys[0]);
            }}
            treeData={filteredFolderTree}
            defaultExpandAll
            titleRender={(node) => {
              const folder = folders.find((f) => f.id === String(node.key));
              if (!folder) return node.title as ReactNode;
              return (
                <div className="file-folder-row">
                  <Typography.Text
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {folder.name}
                  </Typography.Text>
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: folderMenuItems(folder),
                      onClick: ({ key }) => onFolderMenuClick(folder, String(key)),
                    }}
                  >
                    <Button
                      className="file-folder-row-action"
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              );
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={folderKeyword ? '未找到匹配目录' : '暂无目录'}
          />
        )}
      </Card>

      <Card size="small" styles={{ body: { padding: 16 } }}>
        <div
          style={{
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Space>
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
              上传文件
            </Button>
            <Button
              icon={<DeleteOutlined />}
              disabled={!selectedRowKeys.length}
              onClick={bulkDeleteFiles}
            >
              删除
            </Button>
            <Button
              icon={<DownloadOutlined />}
              disabled={!selectedRowKeys.length}
              onClick={downloadSelected}
            >
              下载
            </Button>
          </Space>
          <Input.Search
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索文件名称/类型/路径/说明"
            style={{ width: 320 }}
          />
        </div>

        <Table
          size="small"
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={filteredFiles}
          pagination={{ pageSize: 8, showSizeChanger: true, position: ['bottomRight'] }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文件" /> }}
        />
      </Card>

      <Modal
        title={folderEditing ? '重命名文件夹' : '添加文件夹'}
        open={folderModalOpen}
        onOk={saveFolder}
        onCancel={() => setFolderModalOpen(false)}
        destroyOnClose
      >
        <Form form={folderForm} layout="vertical">
          <Form.Item
            label="文件夹名称"
            name="name"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              { max: 64, message: '长度不能超过 64' },
            ]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上传文件"
        open={uploadModalOpen}
        onOk={submitUpload}
        onCancel={() => {
          setUploadModalOpen(false);
          setUploadFiles([]);
        }}
        destroyOnClose
      >
        <Form
          form={uploadForm}
          layout="vertical"
          initialValues={{ folderId: selectedFolderId }}
        >
          <Form.Item
            label="所属文件夹"
            name="folderId"
            rules={[{ required: true, message: '请选择所属文件夹' }]}
          >
            <select
              style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid #d9d9d9' }}
              value={uploadForm.getFieldValue('folderId')}
              onChange={(e) => uploadForm.setFieldValue('folderId', e.target.value)}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {getFolderPath(f.id, folders)}
                </option>
              ))}
            </select>
          </Form.Item>
          <Form.Item label="文件" required>
            <Upload.Dragger
              multiple
              fileList={uploadFiles}
              beforeUpload={() => false}
              onChange={(info) => setUploadFiles(info.fileList)}
            >
              <p style={{ marginBottom: 8 }}>
                <UploadOutlined />
              </p>
              <p style={{ margin: 0 }}>点击或拖拽文件到此区域上传（支持批量）</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} placeholder="可选，填写文件说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑文件"
        open={editModalOpen}
        onOk={submitEditFile}
        onCancel={() => setEditModalOpen(false)}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="文件名称"
            name="name"
            rules={[{ required: true, message: '请输入文件名称' }]}
          >
            <Input placeholder="请输入文件名称" />
          </Form.Item>
          <Form.Item label="替换文件">
            <Upload
              maxCount={1}
              fileList={replaceFiles}
              beforeUpload={() => false}
              onChange={(info) => setReplaceFiles(info.fileList)}
            >
              <Button icon={<UploadOutlined />}>选择替换文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} placeholder="可选，填写文件说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export async function loadDocContent(relativePath: string): Promise<string> {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^docs\/prd\//, '');
  const url = `/docs-assets/${normalized.split('/').map(encodeURIComponent).join('/')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`文档未找到: ${relativePath}`);
  }

  return response.text();
}

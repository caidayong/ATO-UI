/* eslint-disable react-refresh/only-export-components -- 文档 Markdown 渲染工具模块，非页面组件 */
import type { Components } from 'react-markdown';
import {
  DocsCode,
  DocsImage,
  DocsPre,
  DocsVersionProvider,
} from '@/docs/markdownElements';

export { DocsVersionProvider };

export function createMarkdownComponents(): Components {
  return {
    img: DocsImage,
    code: DocsCode,
    pre: DocsPre,
  };
}

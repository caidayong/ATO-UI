import { Modal } from 'antd';
import type { ModalProps } from 'antd';

export type FormModalProps = ModalProps;

/**
 * 带确认/取消的表单 Modal：默认防误关（docs/spec/03-组件规范 §3.6）。
 */
export function FormModal({
  closable = false,
  maskClosable = false,
  keyboard = false,
  destroyOnClose = true,
  cancelText = '取消',
  okText = '确定',
  ...rest
}: FormModalProps) {
  return (
    <Modal
      closable={closable}
      maskClosable={maskClosable}
      keyboard={keyboard}
      destroyOnClose={destroyOnClose}
      cancelText={cancelText}
      okText={okText}
      {...rest}
    />
  );
}

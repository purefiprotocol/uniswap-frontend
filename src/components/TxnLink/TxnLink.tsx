import { FC } from 'react';
import { ExportOutlined } from '@ant-design/icons';

import styles from './TxnLink.module.scss';

interface TxnLinkProps {
  href: string;
  title?: string;
}

const TxnLink: FC<TxnLinkProps> = (props) => {
  const { href, title } = props;

  return (
    <a
      className={styles.link}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      {title}
      <span style={{ marginLeft: 5 }}>
        txn
        <ExportOutlined style={{ marginLeft: 5, fontSize: 12 }} />
      </span>
    </a>
  );
};

export default TxnLink;

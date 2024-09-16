import { FC } from 'react';
import { ExportOutlined } from '@ant-design/icons';

import styles from './TxnLink.module.scss';

interface DashboardLinkProps {
  href: string;
  message: string;
  title: string;
}

const DashboardLink: FC<DashboardLinkProps> = (props) => {
  const { href, message, title } = props;

  return (
    <div>
      <span style={{ marginRight: 5 }}>{message}</span>
      <a
        className={styles.link}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
      >
        <div>
          {title}
          <ExportOutlined style={{ marginLeft: 5, fontSize: 12 }} />
        </div>
      </a>
    </div>
  );
};

export default DashboardLink;

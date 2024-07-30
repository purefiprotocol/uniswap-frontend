import { FC } from 'react';
import { Link } from 'react-router-dom';

const NotFound: FC = () => {
  return (
    <div>
      <h2>Not found</h2>
      <div>
        <Link to="/">Go to the home page</Link>
      </div>
    </div>
  );
};

export default NotFound;

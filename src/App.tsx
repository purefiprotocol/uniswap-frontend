import { FC } from 'react';
import { Routes, Route } from 'react-router-dom';

import { Layout } from './components';
import { Home, NotFound } from './pages';

const App: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;

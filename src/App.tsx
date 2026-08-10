import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BadgeHome } from './pages/BadgeHome';
import { AIAssistant } from './components/AIAssistant';
import { BlogArchive } from './pages/BlogArchive';
import { BlogPost } from './pages/BlogPost';
import { BlogPreview } from './pages/BlogPreview';
import { CareerPassport } from './pages/CareerPassport';
import { ProjectPlaceholder } from './pages/ProjectPlaceholder';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppRoutes = () => {
  const { pathname } = useLocation();
  const isPreview = pathname.startsWith('/preview/');

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<BadgeHome />} />
        <Route path="/career" element={<CareerPassport />} />
        <Route path="/projects" element={<ProjectPlaceholder />} />
        <Route path="/blog" element={<BlogArchive />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/preview/posts/:id" element={<BlogPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isPreview && <AIAssistant />}
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;

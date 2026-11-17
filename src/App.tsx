import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Index from './pages/Index';
import NotFound from './pages/NotFound';

const App = () => (
  <>
    <Toaster position="top-center" theme="dark" duration={2400} visibleToasts={2} />
    <BrowserRouter basename="/virtual-card-playground">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;

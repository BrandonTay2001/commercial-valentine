import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loading pages
const Home = lazy(() => import('./pages/Home'));
const Album = lazy(() => import('./pages/Album'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const CoupleSite = lazy(() => import('./pages/CoupleSite'));

function App() {
  return (
    <Router>
      <Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-stone-50">
          <div className="text-display italic text-2xl animate-pulse text-stone-300">Loading...</div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/album" element={<Album />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/:path" element={<CoupleSite />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

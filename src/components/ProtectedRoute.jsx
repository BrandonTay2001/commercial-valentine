import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute - Wrapper component that checks authentication before rendering children.
 * Immediately redirects to /login if not authenticated (no flash of protected content).
 */
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;

import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TrialSubscriptionPopup } from './TrialSubscriptionPopup';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

interface TrialInfo {
  daysRemaining: number;
  expiresAt: string;
}

const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showTrialPopup, setShowTrialPopup] = useState(false);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);

  useEffect(() => {
    console.log('ProtectedAdminRoute useEffect triggered');
    console.log('User in ProtectedAdminRoute:', user);
    console.log('Is loading in ProtectedAdminRoute:', isLoading);

    // If not authenticated or not admin, redirect to login
    if (!isLoading && (!user || user.role !== 'admin')) {
      console.log('User not authenticated as admin, redirecting to /admin');
      navigate('/admin', { replace: true });
      return;
    }

    // If user is admin, immediately allow access
    if (user?.role === 'admin') {
      console.log('Admin user detected, allowing access immediately');
      // Show trial popup for new trial users (check from sessionStorage)
      const hasSeenPopup = sessionStorage.getItem('trial_popup_dismissed');
      if (!hasSeenPopup) {
        // You can set trial info here if needed
        // setShowTrialPopup(true);
      }
    }
  }, [user, isLoading, navigate]);

  // If still loading, show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If not authenticated or not an admin, redirect to login
  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  // Admin is active - allow access
  console.log('Admin subscription is active, allowing access to current page');

  // Render the children with optional trial popup
  return (
    <>
      {children}
      {showTrialPopup && trialInfo && (
        <TrialSubscriptionPopup
          daysRemaining={trialInfo.daysRemaining}
          expiresAt={trialInfo.expiresAt}
          onDismiss={() => {
            setShowTrialPopup(false);
            sessionStorage.setItem('trial_popup_dismissed', 'true');
          }}
        />
      )}
    </>
  );
};

export default ProtectedAdminRoute;
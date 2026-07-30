import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { JSX } from 'react';
import { toast } from 'react-toastify';
import Button from './Button';

function MessageBox({
  message,
  title = 'Access Denied',
  buttonText = 'Go Back',
  onBack,
  type = 'error',
}: {
  message: string;
  title?: string;
  buttonText?: string;
  onBack: () => void;
  type?: 'error' | 'login' | 'session';
}) {
  const getIconAndColors = () => {
    switch (type) {
      case 'login':
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          ),
          colors: {
            primary: 'text-blue-600',
            bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
            cardBg: 'bg-white/90 backdrop-blur-md',
            border: 'border-blue-200',
            shadow: 'shadow-blue-200/50',
          },
        };
      case 'session':
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          colors: {
            primary: 'text-orange-600',
            bg: 'bg-gradient-to-br from-orange-50 to-amber-100',
            cardBg: 'bg-white/90 backdrop-blur-md',
            border: 'border-orange-200',
            shadow: 'shadow-orange-200/50',
          },
        };
      default:
        return {
          icon: (
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          ),
          colors: {
            primary: 'text-red-600',
            bg: 'bg-gradient-to-br from-red-50 to-rose-100',
            cardBg: 'bg-white/90 backdrop-blur-md',
            border: 'border-red-200',
            shadow: 'shadow-red-200/50',
          },
        };
    }
  };

  const { icon, colors } = getIconAndColors();

  return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center p-4 relative`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            radial-gradient(circle at 25px 25px, rgba(0,0,0,0.1) 2px, transparent 2px),
            radial-gradient(circle at 75px 75px, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
            backgroundSize: '100px 100px',
          }}
        ></div>
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
        <div
          className="absolute top-3/4 right-1/4 w-3 h-3 bg-white/40 rounded-full animate-bounce"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-white/50 rounded-full animate-ping"
          style={{ animationDelay: '2s' }}
        ></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div
          className={`${colors.cardBg} ${colors.border} border-2 rounded-2xl ${colors.shadow} shadow-2xl p-8`}
        >
          {/* Icon */}
          <div className="text-center mb-6">
            <div className={`${colors.primary} inline-block p-3 rounded-full bg-white shadow-lg`}>
              {icon}
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <h1 className={`${colors.primary} text-2xl font-bold`}>{title}</h1>
            <p className="text-gray-700 leading-relaxed">{message}</p>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onBack}
              className="w-full py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {buttonText}
            </Button>

            {type === 'login' && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (window.location.href = '/login')}
                  className="py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = '/')}
                  className="py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Home
                </Button> */}
              </div>
            )}

            {type !== 'login' && (
              <Button
                variant="outline"
                size="md"
                onClick={() => (window.location.href = '/')}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors mt-3"
              >
                ← Return Home
              </Button>
            )}
          </div>
        </div>

        {/* Bottom text */}
        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            {type === 'login' && (
              <>
                Don't have an account?{' '}
                <a
                  href="/register"
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                >
                  Sign up
                </a>
              </>
            )}
            {type === 'session' && 'Please refresh and try again'}
            {type === 'error' && 'Need help? Contact our support team'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: JSX.Element;
  allowedRoles?: string[];
}) {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  let errorMsg = '';
  let errorTitle = 'Access Denied';
  let errorType: 'error' | 'login' | 'session' = 'error';

  if (!token) {
    errorMsg = 'Authentication required. Please sign in to continue.';
    errorTitle = 'Sign In Required';
    errorType = 'login';
  } else {
    try {
      const decoded: any = jwtDecode(token);
      const role = decoded.role;
      console.log('Decoded role:', role);
      if (allowedRoles && !allowedRoles.includes(role)) {
        errorMsg = 'Insufficient permissions to access this resource.';
        errorTitle = 'Access Restricted';
        errorType = 'error';
      }
    } catch {
      errorMsg = 'Session expired. Please sign in again.';
      errorTitle = 'Session Expired';
      errorType = 'session';
    }
  }

  useEffect(() => {
    if (errorMsg) toast.error(errorMsg);
  }, [errorMsg]);

  if (errorMsg) {
    return (
      <MessageBox
        message={errorMsg}
        title={errorTitle}
        buttonText="Go Back"
        onBack={() => navigate(-1)}
        type={errorType}
      />
    );
  }

  return children;
}

import React, { useState } from 'react';
import logo from '../../assets/Logodark.png';
import bgImg from '../../assets/forget.jpg';
import InPuts from '../../components/InPuts';
import Button from '../../components/Button';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function NewPasswordPage() {
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRetype, setShowRetype] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; retype?: string }>({});
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { password?: string; retype?: string } = {};
    if (!password) newErrors.password = 'Password is required';
    if (!retypePassword) newErrors.retype = 'Retype password is required';
    if (password && retypePassword && password !== retypePassword) {
      newErrors.retype = 'Passwords do not match';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Handle password reset logic here
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      <div className="hidden lg:flex items-center justify-center bg-secondary-300 lg:w-1/2 p-0 min-h-[30vh] lg:min-h-screen relative overflow-hidden">
        <img
          src={bgImg}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
        <div className="absolute inset-0 bg-primary-800/75" style={{ zIndex: 1 }} />
        <div className="relative z-10 w-full"></div>
      </div>
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-6 lg:p-12 min-h-[70vh] lg:min-h-screen">
        <img src={logo} alt="Logo" className="w-24 h-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Create New Password</h2>
        <form className="w-full max-w-xs mx-auto" onSubmit={handleSubmit}>
          {/* Password Field */}
          <div className="mb-4">
            <div className="relative">
              <InPuts
                placeholder="Enter password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                type={showPassword ? 'text' : 'password'}
                error={undefined}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-primary-800"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <span className="text-red-500 text-sm">{errors.password}</span>}
          </div>
          {/* Retype Password Field */}
          <div className="mb-6">
            <div className="relative">
              <InPuts
                placeholder="Retype your Password"
                name="retypePassword"
                value={retypePassword}
                onChange={(e) => setRetypePassword(e.target.value)}
                className="pr-10"
                type={showRetype ? 'text' : 'password'}
                error={undefined}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-primary-800"
                onClick={() => setShowRetype((prev) => !prev)}
                tabIndex={-1}
                aria-label={showRetype ? 'Hide password' : 'Show password'}
              >
                {showRetype ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.retype && <span className="text-red-500 text-sm">{errors.retype}</span>}
          </div>
          <Button type="submit" className="w-full bg-primary-800 text-white py-2 rounded-md mb-2">
            Continue
          </Button>
        </form>
        <div className="text-center mt-2 w-full max-w-xs mx-auto">
          <p className="text-sm text-secondary-300">
            Don’t have an account!{' '}
            <a
              href="#"
              className="text-primary-800 hover:underline font-bold"
              onClick={() => navigate('/register')}
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import logo from '../../assets/Logodark.png';
import forgetImg from '../../assets/forget.jpg';
import InPuts from '../../components/InPuts';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError('Please enter correct email');
    } else {
      setError('');
      navigate('/verification');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      <div className="hidden lg:flex items-center justify-center bg-secondary-300 lg:w-1/2 p-0 min-h-[30vh] lg:min-h-screen relative overflow-hidden">
        <img
          src={forgetImg}
          alt="Forget Password"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
        <div className="absolute inset-0 bg-primary-800/75" style={{ zIndex: 1 }} />
        <div className="relative z-10 w-full"></div>
      </div>
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-6 lg:p-12 min-h-[70vh] lg:min-h-screen">
        <img src={logo} alt="Logo" className="w-24 h-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Forget Password</h2>
        <form className="w-full max-w-xs mx-auto" onSubmit={handleSubmit}>
          <InPuts
            placeholder="Enter your email address"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            className="mb-4"
            error={error}
          />
          <div className="mb-4 text-secondary-300 text-sm">
            <p>Please enter correct email</p>
          </div>
          <Button type="submit" className="w-full bg-primary-800 text-white py-2 rounded-md mb-2">
            Continue
          </Button>
        </form>
        <div className="text-center mt-2 w-full max-w-xs mx-auto">
          <p className="text-sm text-secondary-300">
            Don&apos;t have account!{' '}
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

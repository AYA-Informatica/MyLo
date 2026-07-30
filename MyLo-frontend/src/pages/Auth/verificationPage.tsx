import React, { useState, useRef } from 'react';
import logo from '../../assets/Logodark.png';
import verificationBg from '../../assets/forget.jpg';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';

export default function VerificationPage() {
  const [codes, setCodes] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputsRef = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);
    setError('');
    if (value && index < 3) {
      // @ts-ignore
      inputsRef[index + 1].current.focus();
    }
  };

  const handleResend = () => {
    // Handle resend logic here
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codes.some((c) => c === '')) {
      setError('Please enter the complete code');
      return;
    }
    setError('');
    navigate('/new-password');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      <div className="hidden lg:flex items-center justify-center bg-secondary-300 lg:w-1/2 p-0 min-h-[30vh] lg:min-h-screen relative overflow-hidden">
        <img
          src={verificationBg}
          alt="Verification"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
        <div className="absolute inset-0 bg-primary-800/75" style={{ zIndex: 1 }} />
        <div className="relative z-10 w-full"></div>
      </div>
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-6 lg:p-12 min-h-[70vh] lg:min-h-screen">
        <img src={logo} alt="Logo" className="w-24 h-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Verification Code</h2>
        <div className="w-full max-w-xs mx-auto">
          <div className="bg-secondary-300 text-secondary-200 text-center rounded mb-6 py-2 px-2 font-medium">
            We've send code to your email. please enter it below to continue
          </div>
          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-4 mb-2">
              {codes.map((code, idx) => (
                <input
                  key={idx}
                  ref={inputsRef[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  className="w-12 h-12 text-center border-2 border-primary-800 rounded text-xl focus:outline-none focus:ring-2 focus:ring-primary-800"
                />
              ))}
            </div>
            {error && <div className="text-red-500 text-sm text-center mb-2">{error}</div>}
            <div className="text-center text-secondary-300 text-sm mb-4">
              Don’t get code?{' '}
              <button
                type="button"
                className="text-primary-800 font-bold hover:underline"
                onClick={handleResend}
              >
                Resend
              </button>
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
    </div>
  );
}

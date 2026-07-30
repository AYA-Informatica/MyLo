import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logodark from '../assets/Logodark.png';
import profile from '../assets/profile.jpg';
import { useState, useRef, useEffect } from 'react';
import { useLogoutMutation } from '../app/api/auth';
import { toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function GeneralNav() {
  const [language, setLanguage] = useState('EN');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    }
    if (isAvatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAvatarMenuOpen]);

    const handleLogout = async () => {
      try {
        await logout().unwrap();
        localStorage.removeItem('token');
        toast.success('Logged out successfully!', { position: 'top-right' });
        setTimeout(() => {
          navigate('/');
        }   , 1500);
      } catch (err) {
        // Optionally show error toast or message
        toast.error('Logout failed. Please try again.', { position: 'top-right' });
      }
    };


  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white text-primary-500 border-b-2 border-primary-800/20 flex items-center justify-between px-4 md:px-10 shadow z-50">
      <div className="w-12 h-12 md:w-15 md:h-15 p-2">
        <Link to="/feed">
          <img src={Logodark} alt="Logo" />
        </Link>
      </div>

      <div
        className={`${
          isMobileMenuOpen ? 'block' : 'hidden'
        } md:flex gap-8 font-bold absolute md:static top-16 left-0 w-full md:w-auto bg-white md:bg-transparent shadow md:shadow-none p-4 md:p-0`}
      >
        <Link
          to="/feed"
          className={`font-medium pb-4 block md:inline ${
            location.pathname === '/feed'
              ? 'text-primary-700'
              : 'text-gray-600/75 hover:text-gray-900'
          }`}
        >
          Feed
        </Link>
        <Link
          to="/firms"
          className={`font-medium pb-4 block md:inline ${
            location.pathname === '/firms'
              ? 'text-primary-700'
              : 'text-gray-600/75 hover:text-gray-900'
          }`}
        >
          Firms
        </Link>
        <Link
          to="/ai"
          className={`font-medium pb-4 block md:inline ${
            location.pathname === '/ask-ai'
              ? 'text-primary-700'
              : 'text-gray-600/75 hover:text-gray-900'
          }`}
        >
          Ask AI
        </Link>
        <Link
          to="/community"
          className={`font-medium pb-4 block md:inline ${
            location.pathname === '/community'
              ? 'text-primary-700'
              : 'text-gray-600/75 hover:text-gray-900'
          }`}
        >
          Community
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            {language}
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded shadow-lg z-10 text-primary-800 px-2 py-2">
              <ul className="py-1">
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleLanguageChange('EN')}
                >
                  English
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleLanguageChange('RW')}
                >
                  Kinyarwanda
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleLanguageChange('FR')}
                >
                  French
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="relative" ref={avatarMenuRef}>
          <button
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300 flex items-center justify-center focus:outline-none"
            onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
            aria-label="User menu"
          >
            <img src={profile} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </button>
          {isAvatarMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg z-50 border border-gray-200">
              <button
                className="w-full text-left px-4 py-2 hover:bg-primary-100 text-primary-800"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  navigate('/user');
                }}
              >
                Profile
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600 border-t border-gray-100"
                onClick={() => {
                  setIsAvatarMenuOpen(false);
                  handleLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <button onClick={toggleMobileMenu} className="text-gray-600 hover:text-gray-900">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}

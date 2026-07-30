import { useState } from 'react';
import Logo from '../assets/Logo.png';
import Button from './Button';
import HeroImage from '../assets/HeroImage.jpg';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative h-full w-full">
      {/* Background Image */}
      <img
        src={HeroImage}
        alt="Hero Background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-800/95 to-transparent"></div>

      {/* Navbar Content */}
      <nav className="relative z-10 flex justify-between items-center px-8 border-b-0 py-1">
        {/* Logo Section */}
        <div className="w-20 h-20 p-2">
          <img src={Logo} alt="Logo" />
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex md:items-center gap-6 text-white text-sm font-medium">
          <a href="#process" className="hover:text-primary-500 text-white">
            Process
          </a>
          <a href="#features" className="hover:text-primary-500 text-white">
            Features
          </a>
          <a href="#audience" className="hover:text-primary-500 text-white">
            Audience
          </a>
        </div>

        {/* Buttons */}
        <div className="hidden md:flex gap-4">
          <Button
            variant="outline"
            size="sm"
            className="bg-primary-800 text-white h-10 w-20"
            type="button"
          >
            Register
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-primary-800 text-white h-10 w-20"
            type="button"
          >
            Login
          </Button>
        </div>

        {/* Hamburger Menu for Small Screens */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-primary-800 focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              ></path>
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`${
            isMenuOpen ? 'block' : 'hidden'
          } md:hidden absolute top-full left-0 w-full bg-primary-800 text-white text-sm font-medium`}
        >
          <div className="flex flex-col text-center gap-4 py-4">
            <a href="#process" className="hover:text-primary-500">
              Process
            </a>
            <a href="#features" className="hover:text-primary-500">
              Features
            </a>
            <a href="#audience" className="hover:text-primary-500">
              Audience
            </a>
            <Button
              variant="outline"
              size="sm"
              className="bg-primary-800 text-white h-10 w-full"
              type="button"
            >
              Register
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-primary-800 text-white h-10 w-full"
              type="button"
            >
              Login
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}

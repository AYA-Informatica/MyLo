import React, { useState, useEffect } from 'react';
import { Home, Bell, Users, FileText, Search, Settings, LogOut, Menu } from 'lucide-react';
import type { SidebarItem } from '../types/sidebartypes';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogoutMutation } from '../app/api/auth';
import { toast } from 'react-toastify';

const routeToItem: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/verification': 'verification',
  '/content': 'content',
  '/dashlaw': 'dashlaw',
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<string>(
    routeToItem[location.pathname] || 'dashboard',
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setActiveItem(routeToItem[location.pathname] || 'dashboard');
  }, [location.pathname]);

  const navigationItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'verification', label: 'Verification', icon: Bell },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'dashlaw', label: 'Law', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const [logout] = useLogoutMutation();

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);
    if (itemId === 'users') navigate('/users');
    if (itemId === 'verification') navigate('/verification');
    if (itemId === 'content') navigate('/content');
    if (itemId === 'dashlaw') navigate('/dashlaw');
    if (itemId === 'dashboard') navigate('/dashboard');
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      localStorage.removeItem('token');
      toast.success('Logged out successfully!', { position: 'top-right' });
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      toast.error('Logout failed. Please try again.', { position: 'top-right' });
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow"
        onClick={() => setOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu size={24} className="text-primary-800" />
      </button>

      {/* Sidebar - Always Fixed */}
      <div
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col pt-20 shadow-lg z-40
          overflow-y-auto transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:w-64
          w-4/5 max-w-xs
        `}
      >
        {/* Close button for mobile */}
        <div className="w-full flex md:hidden justify-end px-4 pt-4">
          <button
            className="text-2xl text-gray-500"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            &times;
          </button>
        </div>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-primary-800 border-r-2 border-primary-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon
                      size={20}
                      className={`mr-3 ${isActive ? 'text-primary-800' : 'text-gray-500'}`}
                    />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
          >
            <LogOut size={20} className="mr-3 text-gray-500 hover:text-red-700" />
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;

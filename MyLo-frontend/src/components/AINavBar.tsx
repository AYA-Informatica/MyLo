import profileImg from '../assets/profile.jpg'; // Update path if needed
import { Link } from 'react-router-dom';

export default function AINavBar() {
  return (
    <nav className="w-full bg-white flex items-center px-6 py-3 shadow-sm">
      <div className="flex-1" />
      {/* Profile image aligned right */}
      <div className="flex items-center justify-end w-12">
        <Link to="/user">
          <img
            src={profileImg}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
        </Link>
      </div>
    </nav>
  );
}

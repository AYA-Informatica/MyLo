import { FaStar, FaMapMarkerAlt } from 'react-icons/fa';
import type { FirmType } from '../types/firmtypes';
import Button from './Button';
import { useNavigate } from 'react-router-dom';
import { VscVerifiedFilled } from 'react-icons/vsc';



type FirmCardProps = {
  firm: FirmType;
};

const FirmCard: React.FC<FirmCardProps> = ({ firm }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-xs mx-auto" onClick={() => navigate(`/firms/${encodeURIComponent(firm.name)}`, { state: { firm } })} style={{ cursor: 'pointer' }}>
      {/* Top Row: Verified & Location */}
      <div className="flex items-center justify-between mb-2">
        {firm.isVerified && (
          <span className="flex items-center gap-1 bg-secondary-400 text-secondary-50 text-xs px-2 py-1 rounded-full">
            <VscVerifiedFilled className="text-primary-800 text-xs size-4" />
            Verified
          </span>
        )}
        <span className="flex items-center gap-1 text-primary-800 text-xs">
          <FaMapMarkerAlt className="text-primary-800" />
          {firm.location}
        </span>
      </div>
      {/* Name */}
      <div className="font-bold text-lg text-primary-900 mb-1">{firm.name}</div>
      {/* Categories */}
      <div className="flex gap-4 text-secondary-300 text-base font-medium mb-1">
        {firm.categories.map((cat) => (
          <span key={cat}>{cat}</span>
        ))}
      </div>
      {/* Description */}
      <div className="text-secondary-300 text-xs mb-3">{firm.description}</div>
      <hr className="border-gray-200 mb-2" />
      {/* Rating, Review, Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-primary-800 text-1xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <FaStar
              key={i}
              className={`text-sm ${i < Math.round(firm.rating) ? 'text-primary-800' : 'text-gray-300'}`}
            />
          ))}
        </div>
        <span className="text-secondary-300 text-sm ml-2">
          ({firm.reviewCount} review{firm.reviewCount !== 1 ? 's' : ''})
        </span>
        <Button
          variant="primary"
          size="sm"
          className="ml-auto px-4 py-1 rounded-full bg-primary-800 text-white text-sm font-semibold hover:bg-primary-700"
          onClick={() => navigate(`/firms/${encodeURIComponent(firm.name)}`, { state: { firm } })}
        >
          View Profile
        </Button>
      </div>
    </div>
  );
};

export default FirmCard;

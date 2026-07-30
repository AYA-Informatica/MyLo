import React from 'react';
import type { FeedCardProps } from '../types/feedCardtypes';
import { FiBookmark, FiMoreHorizontal } from 'react-icons/fi';
import { BsBookmarkFill } from 'react-icons/bs';
import { FaArrowUp, FaRegEnvelope } from 'react-icons/fa';
import { VscVerifiedFilled } from 'react-icons/vsc';


const FeedCard: React.FC<FeedCardProps> = ({
  firmLogo,
  firmName,
  isVerified,
  title,
  description,
  image,
  views,
  comments,
  date,
  isBookmarked,
  onBookmark,
  onMoreOptions,
}) => {
  return (
    <div className="bg-white p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full rounded-lg">
      {/* Left: Content */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Firm Info */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <img
            src={firmLogo}
            alt={firmName}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border object-cover"
          />
          <span className="text-secondary-300 text-base sm:text-xl font-normal">{firmName}</span>
          {isVerified && (
            <VscVerifiedFilled className="text-primary-800 text-base sm:text-xl" title="Verified" />
          )}
        </div>
        {/* Title & Verified */}
        <div className="flex items-center gap-1 sm:gap-2 mb-1">
          <h2 className="text-lg sm:text-2xl font-bold text-primary-900">{title}</h2>
        </div>
        {/* Description */}
        <div className="block text-secondary-300 text-base sm:text-[22px] leading-snug font-normal mt-1 mb-2">
          {description}
        </div>
        {/* Footer: Stats & Actions */}
        <div className="flex items-center gap-3 sm:gap-6 mt-2">
          <div className="flex items-center gap-1 text-secondary-300 text-xs sm:text-sm">
            <FaArrowUp className="text-sm sm:text-base" />
            <span>{views}</span>
          </div>
          <div className="flex items-center gap-1 text-secondary-300 text-xs sm:text-sm">
            <FaRegEnvelope className="text-sm sm:text-base" />
            <span>{comments}</span>
          </div>
          <span className="text-secondary-300 text-xs sm:text-sm">{date}</span>
          <button className="ml-auto" onClick={onBookmark} aria-label="Bookmark">
            {isBookmarked ? (
              <BsBookmarkFill className="text-primary-800 text-base sm:text-xl" />
            ) : (
              <FiBookmark className="text-primary-800 text-base sm:text-xl" />
            )}
          </button>
          <button className="ml-2" onClick={onMoreOptions} aria-label="More options">
            <FiMoreHorizontal className="text-secondary-300 text-base sm:text-xl" />
          </button>
        </div>
      </div>
      {/* Right: Image */}
      <div className="w-full h-36 sm:w-40 sm:h-32 flex-shrink-0 rounded overflow-hidden mt-3 sm:mt-0">
        <img src={image} alt={title} className="w-full h-full object-cover rounded" />
      </div>
    </div>
  );
};

export default FeedCard;

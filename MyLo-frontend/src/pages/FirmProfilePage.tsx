import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { FaStar, FaPhoneAlt, FaEnvelope, FaGlobe, FaMapMarkerAlt } from 'react-icons/fa';
import { useState } from 'react';
import type { FirmType } from '../types/firmtypes';
import hero from '../assets/HeroImage.jpg';

const DEFAULT_FIRM: FirmType = {
  name: 'LexBrige Firms',
  location: 'New York,NY',
  isVerified: true,
  categories: ['Corporate Law', 'Intellectual Law', 'Real Estate', 'Employment Law'],
  description:
    'Founded in 1995, LexBridge firm has been a cornerstone of legal excellence nearly three decades. Our firm specializes in providing comprehensives legal solution across multiple practice areas, serving both individual clients and Fortune 500 companies. With a team of 45 experiences attorney, we pride ourselves delivery personalized legal strategies that align with our clients unique needs and objectives.',
  rating: 4.8,
  reviewCount: 128,
  profileUrl: '#',
};

export default function FirmProfilePage() {
  const { state } = useLocation();
  const firm: FirmType = state?.firm || DEFAULT_FIRM;

  // Tab state: "overview" | "tools" | "posts"
  const [tab, setTab] = useState<'overview' | 'tools' | 'posts'>('overview');

  return (
    <Layout>
      {/* Banner */}
      <div className="relative bg-primary-800 h-40 md:h-48 flex items-end px-6 md:px-16 py-30">
        <img
          src={hero}
          alt="hero"
          className="absolute inset-0 h-full w-full object-cover brightness-30"
        />
        <div className="absolute left-1/2 -translate-x-1/2 md:left-16 md:translate-x-0 bottom-0  rounded-xl shadow-lg px-6 py-4 flex items-center gap-4 w-[95vw] md:w-auto mb-8">
          <div className="w-16 h-16 rounded-full bg-primary-400 flex items-center justify-center text-3xl font-bold text-white border-4 border-white overflow-hidden">
            {firm.profileUrl ? (
              <img
                src={firm.profileUrl}
                alt={firm.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              firm.name[0]
            )}
          </div>
          <div>
            <div className="font-bold text-lg text-primary-50">{firm.name}</div>
            <div className="text-primary-50 text-sm">
              Navigation Legal Complexities With Excellents
            </div>
            <div className="flex items-center gap-3 mt-1 text-secondary-400 text-xs">
              <span className="flex items-center gap-1">
                <FaStar className="text-primary-50" />
                {firm.rating} (reviews)
              </span>
              <span className="flex items-center gap-1">
                <FaMapMarkerAlt />
                {firm.location}
              </span>
              <span>45 attorney</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 mt-20 mb-20">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Left: Tab Bar + Tab Content */}
          <div className="flex-1 mb-12">
            {/* Tab Bar */}
            <div className="flex bg-gray-100 rounded-full p-1 mb-8 w-full">
              <button
                className={`flex-1 px-6 py-2 font-semibold rounded-full transition-all ${
                  tab === 'overview'
                    ? 'bg-primary-800 text-white font-bold shadow'
                    : 'bg-transparent text-gray-500'
                }`}
                onClick={() => setTab('overview')}
              >
                Overview
              </button>
              <button
                className={`flex-1 px-6 py-2 font-semibold rounded-full transition-all ${
                  tab === 'tools'
                    ? 'bg-primary-800 text-white font-bold shadow'
                    : 'bg-transparent text-gray-500'
                }`}
                onClick={() => setTab('tools')}
              >
                Tools
              </button>
              <button
                className={`flex-1 px-6 py-2 font-semibold rounded-full transition-all ${
                  tab === 'posts'
                    ? 'bg-primary-800 text-white font-bold shadow'
                    : 'bg-transparent text-gray-500'
                }`}
                onClick={() => setTab('posts')}
              >
                Recent posts
              </button>
            </div>
            {/* Tab Content */}
            {tab === 'overview' && (
              <>
                <div className="mb-8 w-full md:w-[600px]">
                  <h2 className="font-bold text-xl text-primary-900 mb-2">About {firm.name}</h2>
                  <p className="text-secondary-300 text-base">{firm.description}</p>
                </div>
                <div className="w-full md:w-[600px]">
                  <h3 className="font-semibold text-primary-900 mb-3">Practice Area</h3>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    {firm.categories.map((area) => (
                      <div
                        key={area}
                        className="bg-gray-100 rounded-lg px-4 py-2 text-primary-900 font-medium text-center"
                      >
                        {area}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'tools' && (
              <div className="space-y-8">
                {/* AI Legal Assistance */}
                <div className="w-full md:w-[600px]">
                  <h3 className="font-semibold text-primary-900 mb-3">AI Legal Assistances</h3>
                  <textarea
                    className="w-full bg-gray-100 rounded-md p-3 mb-2 text-secondary-300"
                    rows={2}
                    placeholder="Prompt our AI to explain Legal concept, drafts a clause or research a topic............"
                  />
                  <button className="w-full bg-primary-800 text-white rounded-md py-2 font-semibold">
                    Prompt AI
                  </button>
                </div>
                {/* Add explanatory Note */}
                <div className="w-full md:w-[600px]">
                  <h3 className="font-semibold text-primary-900 mb-3">Add explanatory Note</h3>
                  <input
                    className="w-full bg-gray-100 rounded-md p-3 mb-2 text-secondary-300"
                    placeholder="Law or statute Title"
                  />
                  <textarea
                    className="w-full bg-gray-100 rounded-md p-3 mb-2 text-secondary-300"
                    rows={2}
                    placeholder="Explain in simple terms......"
                  />
                  <button className="w-full bg-primary-800 text-white rounded-md py-2 font-semibold">
                    Add Note
                  </button>
                </div>
              </div>
            )}

            {tab === 'posts' && (
              <div className="space-y-8">
                <div className="w-full md:w-[600px]">
                  <h3 className="font-bold text-lg text-primary-900 mb-2">
                    Understanding Intellectual Property Rights in the Digital Age
                  </h3>
                  <p className="text-secondary-300 text-base mb-2">
                    Protecting intellectual property through trademarks, patents, and copyrights in
                    today’s digital landscape requires a comprehensive approach...
                  </p>
                  <div className="flex items-center gap-6 text-secondary-300 text-sm">
                    <span>June 16,2025</span>
                    <span>45 likes</span>
                    <span>12 comments</span>
                  </div>
                </div>
                <div className="w-full md:w-[600px]">
                  <h3 className="font-bold text-lg text-primary-900 mb-2">
                    Corporate Compliance: Best Practices for 2024
                  </h3>
                  <p className="text-secondary-300 text-base mb-2">
                    Navigating the evolving regulatory landscape requires proactive compliance
                    strategies. Our latest insights on maintaining corporate integrity...
                  </p>
                  <div className="flex items-center gap-6 text-secondary-300 text-sm">
                    <span>June 16,2025</span>
                    <span>45 likes</span>
                    <span>12 comments</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Contact & Stats */}
          <div className="w-full md:w-80 flex-shrink-0 mt-18">
            <div className="mb-8">
              <h3 className="font-semibold text-primary-900 mb-3">Contact information</h3>
              <div className="flex flex-col gap-3 text-secondary-300 text-base">
                <span className="flex items-center gap-2">
                  <FaPhoneAlt className="text-primary-800" /> +250(788) 123 -456
                </span>
                <span className="flex items-center gap-2">
                  <FaEnvelope className="text-primary-800" />{' '}
                  {firm.name.toLowerCase().replace(/\s/g, '')}@gmail.com
                </span>
                <span className="flex items-center gap-2">
                  <FaGlobe className="text-primary-800" /> www.
                  {firm.name.toLowerCase().replace(/\s/g, '')}.com
                </span>
                <span className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-primary-800" /> {firm.location}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary-900 mb-3">Firm statistics</h3>
              <div className="flex flex-col gap-2 text-secondary-300 text-base">
                <div className="flex justify-between">
                  <span>Established</span>
                  <span>1995</span>
                </div>
                <div className="flex justify-between">
                  <span>Team size</span>
                  <span>45 AT</span>
                </div>
                <div className="flex justify-between">
                  <span>Reviews</span>
                  <span>{firm.reviewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rating</span>
                  <span className="flex items-center gap-1">
                    <FaStar className="text-primary-800" /> {firm.rating}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

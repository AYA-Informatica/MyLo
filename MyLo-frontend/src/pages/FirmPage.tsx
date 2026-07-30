import { useState } from 'react';
import FirmCard from '../components/FirmCard';
import Layout from '../components/Layout';
import SearchBar from '../components/SearchBar';
import type { FirmType } from '../types/firmtypes';
import onfeed from '../assets/on-feed.png';
import state from '../assets/states-woman.png';


const FIRMS: FirmType[] = [
  {
    name: 'Lexbridge firms',
    location: 'Nyamirambo',
    isVerified: true,
    categories: ['Corporate', 'Family', 'IP'],
    description:
      'Lawyering firm providing comprehensive legal services focus on client and innovation and solution.',
    rating: 4,
    reviewCount: 24,
    profileUrl: onfeed,
  },
  {
    name: 'Justice Advocates LLP',
    location: 'Kicukiro kn2',
    isVerified: true,
    categories: ['Immigration', 'Tax', 'Criminal'],
    description:
      'Dedicated to fighting justice and providing expert legal representation a cross of complex field',
    rating: 4,
    reviewCount: 29,
    profileUrl: state,
  },
  {
    name: 'Equity Law Patners',
    location: 'New York/NY',
    isVerified: true,
    categories: ['Corporate', 'Family'],
    description:
      'We value relationships with customers our clients, combining deep legal knowledge with personal touch',
    rating: 5,
    reviewCount: 76,
    profileUrl: state,
  },
  {
    name: 'Integrity Legal Services',
    location: 'New York/NY',
    isVerified: true,
    categories: ['Immigration', 'Tax'],
    description:
      'Operating with unwavering integrity offer transparent and effective legal counsel to individual and business needs.',
    rating: 5,
    reviewCount: 65,
    profileUrl: onfeed,
  },
];

const SPECIALTIES = ['Corporate', 'Immigration', 'Tax', 'Criminal', 'Family'];

export default function FirmPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredFirms = selectedSpecialty
    ? FIRMS.filter((firm) => firm.categories.includes(selectedSpecialty))
    : FIRMS;

  const handleSpecialtyChange = (specialty: string) => {
    setSelectedSpecialty(specialty);
  };

  return (
    <Layout>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full flex flex-col mt-14">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          {/* Toggle button for mobile */}
          <button
            className="md:hidden mb-4 px-4 py-2 bg-primary-800 text-white rounded font-semibold"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Sidebar Filters */}
            <aside
              className={`
                md:col-span-1
                ${showFilters ? 'block' : 'hidden'}
                md:block
                mt-4 sm:mt-0 md:mt-46
              `}
            >
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <h3 className="text-primary-900 font-semibold mb-3">Filters</h3>
                <div>
                  <div className="text-secondary-400 text-sm font-semibold mb-2">Specialties</div>
                  <div className="flex flex-col gap-2">
                    {SPECIALTIES.map((specialty) => (
                      <label key={specialty} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="specialty"
                          value={specialty}
                          checked={selectedSpecialty === specialty}
                          onChange={() => handleSpecialtyChange(specialty)}
                          className="accent-primary-800"
                        />
                        <span className="text-secondary-300">{specialty}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
            {/* Firms List */}
            <main className="md:col-span-3">
              {/* Header Section */}
              <h2 className="text-2xl md:text-3xl font-semibold text-primary-900 mb-4 text-center md:text-left">
                Discover top-rated law firms with verified
              </h2>
              <div className="flex flex-col md:flex-row items-center gap-2 mb-6">
                <div className="flex-1 w-full">
                  <SearchBar placeholder="Search for law firm by name or specialty" />
                </div>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-secondary-300 text-sm flex items-center gap-1">
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 6h13M3 12h9m-9 6h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Sort by
                </span>
                <span className="text-secondary-300 text-sm">{filteredFirms.length} results</span>
              </div>
              {/* Firm Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredFirms.map((firm) => (
                  <FirmCard key={firm.name} firm={firm} />
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}

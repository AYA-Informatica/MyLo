import { useState, useEffect } from 'react';
import FeedCard from '../components/FeedCard';
import Layout from '../components/Layout';
import { FaCheckCircle, FaBook } from 'react-icons/fa';
import lowbook from '../assets/law-books.png';
import AICard from '../components/AICard';
import SearchBar from '../components/SearchBar';
import feed from '../assets/on-feed.png';
import states from '../assets/states-woman.png';
import { VscVerifiedFilled } from 'react-icons/vsc';
import { useNavigate } from 'react-router-dom';
import { useGetUsersQuery } from '../app/api/user';
import { useGetDomainsQuery } from '../app/api/domains';

// Default categories that are always present
const defaultCategories = [
  {
    icon: <FaBook />,
    name: 'For You',
    description: 'Personalized content for you.',
  },
  {
    icon: <FaCheckCircle />,
    name: 'Community',
    description: 'Community discussions and updates.',
  },
];

interface Domain {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function Feed() {
  const navigate = useNavigate();

  // API hooks
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery();
  const {
    data: domainsResponse,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useGetDomainsQuery();

  const domains: Domain[] = domainsResponse?.data || [];

  // Initialize categories from localStorage or use defaults + API domains
  const getStoredCategories = () => {
    const savedCategories = localStorage.getItem('selectedCategories');
    const defaultNames = defaultCategories.map((cat) => cat.name);

    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        const combined = [...defaultNames];
        parsed.forEach((cat: string) => {
          if (!combined.includes(cat)) {
            combined.push(cat);
          }
        });
        return combined;
      } catch {
        return defaultNames;
      }
    }

    return defaultNames;
  };

  // Initialize selectedCategory from localStorage or default
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const savedCategory = localStorage.getItem('selectedCategory');
    return savedCategory || 'For You';
  });

  const [categories, setCategories] = useState(getStoredCategories);

  // Update categories when domains are loaded
  useEffect(() => {
    if (domains.length > 0) {
      const savedCategories = localStorage.getItem('selectedCategories');
      const defaultNames = defaultCategories.map((cat) => cat.name);
      let updatedCategories = [...defaultNames];

      if (savedCategories) {
        try {
          const parsed = JSON.parse(savedCategories);
          parsed.forEach((cat: string) => {
            if (!updatedCategories.includes(cat)) {
              updatedCategories.push(cat);
            }
          });
        } catch {
          // If parsing fails, just use defaults
        }
      }

      setCategories(updatedCategories);
    }
  }, [domains]);

  // Function to handle domain click and store in localStorage
  const handleDomainClick = (domain: Domain) => {
    // Add domain to categories if not already present
    const updatedCategories = [...categories];
    if (!updatedCategories.includes(domain.name)) {
      updatedCategories.push(domain.name);
      setCategories(updatedCategories);

      // Store only the added domains (not default categories) in localStorage
      const defaultNames = defaultCategories.map((cat) => cat.name);
      const categoriesToStore = updatedCategories.filter((cat) => !defaultNames.includes(cat));
      localStorage.setItem('selectedCategories', JSON.stringify(categoriesToStore));
    }

    // Set as selected category and store in localStorage
    setSelectedCategory(domain.name);
    localStorage.setItem('selectedCategory', domain.name);
  };

  // Function to handle category selection from top navigation
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    localStorage.setItem('selectedCategory', categoryName);
  };

  // Function to remove a category
  const removeCategoryFromStorage = (categoryToRemove: string) => {
    // Prevent removing default categories
    const protectedCategories = defaultCategories.map((d) => d.name);
    if (protectedCategories.includes(categoryToRemove)) {
      return;
    }

    const updatedCategories = categories.filter((cat) => cat !== categoryToRemove);
    setCategories(updatedCategories);

    // Update localStorage
    const defaultNames = defaultCategories.map((cat) => cat.name);
    const categoriesToStore = updatedCategories.filter((cat) => !defaultNames.includes(cat));
    localStorage.setItem('selectedCategories', JSON.stringify(categoriesToStore));

    // If removed category was selected, switch to first available
    if (selectedCategory === categoryToRemove) {
      const newSelected = updatedCategories[0] || 'For You';
      setSelectedCategory(newSelected);
      localStorage.setItem('selectedCategory', newSelected);
    }
  };

  // Function to clear all added categories
  const clearAllAddedCategories = () => {
    const defaultNames = defaultCategories.map((d) => d.name);
    setCategories(defaultNames);
    setSelectedCategory('For You');
    localStorage.setItem('selectedCategories', JSON.stringify([]));
    localStorage.setItem('selectedCategory', 'For You');
  };

  // Helper function to generate subtitle based on firm data
  const getSubtitle = (firm: any) => {
    if (firm.address) return `Based in ${firm.address}`;
    if (firm.registrationNumber) return `Reg. ${firm.registrationNumber}`;
    return 'Legal Services';
  };

  // Filter users to get only law firms
  const lawFirms = Array.isArray(users)
    ? users
        .filter((user) => user.role.name === 'law-firm')
        .slice(0, 4) // Limit to 4 firms for the sidebar
        .map((firm) => ({
          id: firm.id,
          logo: firm.profileImage,
          name: firm.name || firm.username || 'Law Firm',
          subtitle: getSubtitle(firm),
          verified: firm.isActive,
          email: firm.email,
        }))
    : [];

  // Get domain info for a category name
  const getDomainInfo = (categoryName: string) => {
    return domains.find((domain) => domain.name === categoryName);
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-10 h-auto min-h-screen mt-14 font-sans">
        {/* Left (main content) */}
        <div className="lg:col-span-7 p-4 lg:p-10 h-auto lg:h-screen overflow-y-auto bg-white no-scrollbar">
          {/* Updated top navigation with stored categories */}
          <div className="flex items-center gap-4 lg:gap-8 overflow-x-auto pb-2">
            {categories.map((cat) => {
              const isDefault = defaultCategories.map((d) => d.name).includes(cat);
              const canRemove = !isDefault;

              return (
                <div key={cat} className="flex items-center gap-1 flex-shrink-0">
                  <span
                    className={`text-base font-normal whitespace-nowrap cursor-pointer transition-colors
                      ${
                        selectedCategory === cat
                          ? 'text-primary-800 font-semibold'
                          : 'text-secondary-300'
                      }`}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                  </span>
                  {/* Add remove button only for dynamically added domains */}
                  {canRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCategoryFromStorage(cat);
                      }}
                      className="ml-1 text-gray-400 hover:text-red-500 text-sm transition-colors"
                      title={`Remove ${cat}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            {/* Clear dynamically added categories button */}
            {categories.length > defaultCategories.length && (
              <button
                onClick={clearAllAddedCategories}
                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded border border-gray-200 hover:border-red-300 transition-colors flex-shrink-0"
              >
                Clear Added
              </button>
            )}

            <span className="text-secondary-400 text-base font-normal flex-shrink-0">
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
          </div>

          <hr className="border-primary-200 border-t-2 mb-4" />

          {/* Content based on selected category */}
          {selectedCategory === 'For You' ? (
            <>
              <AICard />
              <FeedCard
                firmLogo="https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80"
                firmName="LexBridge Patterns Firm"
                title="Navigating Startup Legal"
                description="A Guide entrepreneur on common legal and how to structure their ventures for long term success."
                image={lowbook}
                views="1.2k"
                comments={20}
                date="June 16,2025"
                isVerified={true}
                isBookmarked={false}
                onBookmark={() => alert('Bookmark clicked!')}
                onMoreOptions={() => alert('More options clicked!')}
              />
              <hr className="border-primary-200 border-t-2" />
              <FeedCard
                firmLogo={states}
                firmName="LexBridge Patterns Firm"
                title="Navigating Startup Legal"
                description="A Guide entrepreneur on common legal and how to structure their ventures for long term success."
                image={feed}
                views="1.2k"
                comments={20}
                date="June 16,2025"
                isVerified={true}
                isBookmarked={false}
                onBookmark={() => alert('Bookmark clicked!')}
                onMoreOptions={() => alert('More options clicked!')}
              />
            </>
          ) : selectedCategory === 'Community' ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Community Feed</h2>
              <p className="text-gray-500 mb-4">
                Connect with other legal professionals and citizens.
              </p>
              <button
                onClick={() => navigate('/community')}
                className="px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go to Community
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">{selectedCategory}</h2>
              {getDomainInfo(selectedCategory) && (
                <p className="text-gray-500 mb-4">{getDomainInfo(selectedCategory)?.description}</p>
              )}
              <div className="space-y-2 text-sm text-gray-400">
                <p>• Latest updates and news in {selectedCategory}</p>
                <p>• Expert articles and insights</p>
                <p>• Community discussions</p>
                <p>• Legal resources and guides</p>
              </div>
              <div className="mt-6">
                <p className="text-sm text-gray-500">
                  Content for this domain will be available soon
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right (sidebar) */}
        <div className="lg:col-span-3 p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 bg-white h-auto lg:h-screen overflow-y-auto no-scrollbar">
          <SearchBar placeholder="Search for articles, firms, and more..." />

          {/* Domain buttons with localStorage integration */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            {isLoadingDomains ? (
              // Loading skeleton
              [...Array(6)].map((_, idx) => (
                <div key={idx} className="w-full h-16 bg-gray-200 animate-pulse rounded-lg" />
              ))
            ) : domains.length > 0 ? (
              // Display domains from API
              domains.map((domain) => {
                const isAdded = categories.includes(domain.name);
                return (
                  <button
                    key={domain.id}
                    className={`w-full h-16 flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 rounded-lg font-medium text-base transition-all ${
                      isAdded
                        ? 'bg-primary-100 text-primary-800 border border-primary-300 shadow-sm'
                        : 'bg-secondary-400 text-secondary-50 hover:bg-primary-200 hover:text-primary-800'
                    }`}
                    style={{ minWidth: 0 }}
                    onClick={() => handleDomainClick(domain)}
                    title={`${domain.description} ${isAdded ? '(Already added)' : '(Click to add)'}`}
                  >
                    <span
                      className={`text-lg font-bold ${
                        isAdded ? 'text-primary-600' : 'text-primary-800'
                      }`}
                    >
                      {isAdded ? '✓' : '+'}
                    </span>
                    <span className="truncate">{domain.name}</span>
                  </button>
                );
              })
            ) : domainsError ? (
              // Error state
              <div className="col-span-2 text-center py-8">
                <p className="text-red-500 text-sm">Failed to load domains</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 text-xs mt-1 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              // Empty state
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500 text-sm">No domains available</p>
                <p className="text-gray-400 text-xs mt-1">
                  Legal domains will appear here once added
                </p>
              </div>
            )}
          </div>

          {/* Recommended Firms Section */}
          <h1 className="text-xl lg:text-2xl font-bold text-secondary-50">Recommended Firms</h1>

          {isLoadingUsers ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="flex items-start gap-3 lg:gap-4 animate-pulse">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : lawFirms.length > 0 ? (
            lawFirms.map((firm) => (
              <div
                key={firm.id}
                className="flex items-start gap-3 lg:gap-4 hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
              >
                {firm.logo ? (
                  <img
                    src={firm.logo}
                    alt={firm.name}
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const initialsDiv = e.currentTarget.nextElementSibling as HTMLElement;
                      if (initialsDiv) {
                        initialsDiv.classList.remove('hidden');
                        initialsDiv.classList.add('flex');
                      }
                    }}
                  />
                ) : null}

                <div
                  className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-primary-600 items-center justify-center text-white font-bold text-sm border ${
                    firm.logo ? 'hidden' : 'flex'
                  }`}
                >
                  {firm.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base lg:text-lg font-semibold text-gray-600 truncate">
                      {firm.name}
                    </span>
                    {firm.verified && (
                      <VscVerifiedFilled className="text-primary-800 text-base flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-gray-400 text-sm lg:text-base -mt-1 truncate">
                    {firm.subtitle}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No law firms available</p>
              <p className="text-gray-400 text-xs mt-1">
                Law firms will appear here once they register
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

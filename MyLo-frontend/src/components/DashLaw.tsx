import { useState } from 'react';
import { Search, Plus, MoreHorizontal } from 'lucide-react';

const DashLaw = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const laws = [
    {
      id: 1,
      title: 'Rwanda Commission Code',
      description: 'Comprehensive Commercial law regulation RGA',
      status: 'Active',
      lastUpdate: '10/01/2025',
    },
    {
      id: 2,
      title: 'Labor Law Amendment',
      description: 'Recent amendment to labor law regulation',
      status: 'Draft',
      lastUpdate: '10/04/2025',
    },
    {
      id: 3,
      title: 'Tax Code Revision',
      description: 'Update tax regulation and procedures',
      status: 'Archive',
      lastUpdate: '10/01/2024',
    },
    {
      id: 4,
      title: 'Environment Protection Act',
      description: 'Environment protection and compliance regulation',
      status: 'Active',
      lastUpdate: '10/01/2015',
    },
  ];

  const filteredLaws = laws.filter(
    (law) =>
      law.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      law.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: 'Active' | 'Draft' | 'Archive') => {
    const statusStyles = {
      Active: 'bg-blue-100 text-blue-800',
      Draft: 'bg-gray-100 text-gray-800',
      Archive: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 pt-24 pl-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Law Management</h1>
          <p className="text-gray-600">Manage legal documents and regulation</p>
        </div>

        {/* Search and Add Law */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search laws..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button className="ml-4 inline-flex items-center px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Law
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLaws.map((law) => (
                <tr key={law.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{law.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{law.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(law.status as 'Active' | 'Draft' | 'Archive')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{law.lastUpdate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLaws.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">No laws found matching your search.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashLaw;

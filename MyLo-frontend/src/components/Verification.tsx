import { useState } from 'react';
import { Search, Eye } from 'lucide-react';
// Sidebar not used here; remove unused import

const Verification = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // const [activeTab, setActiveTab] = useState('pending');

  const requests = [
    {
      id: 1,
      firmName: 'Kigali Legal Association',
      submissionDate: '12/10/2024',
      status: 'Pending',
    },
    {
      id: 2,
      firmName: 'Rwanda Business Law Firm',
      submissionDate: '14/09/2024',
      status: 'Pending',
    },
    {
      id: 3,
      firmName: 'LexRidge Firm',
      submissionDate: '12/10/2024',
      status: 'Pending',
    },
  ];

  const stats = {
    total: 12,
    pending: 8,
    approved: 3,
    rejected: 1,
  };

  const filteredRequests = requests.filter((request) =>
    request.firmName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleReview = (firmName: string) => {
    alert(`Opening review for ${firmName}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6 pt-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Firm Verification Request</h1>
          <p className="text-gray-600">Review and Approve law firm application</p>
        </div>

        {/* Stats Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <div className="flex-1 p-6 text-center border-r">
              <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500 mt-1">Total Request</div>
            </div>

            <div className="flex-1 p-6 text-center border-r bg-blue-50">
              <div className="flex items-center justify-center gap-2">
                <div className="text-2xl font-semibold text-gray-900">{stats.pending}</div>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div className="text-sm text-gray-500 mt-1">Pending</div>
            </div>

            <div className="flex-1 p-6 text-center border-r">
              <div className="flex items-center justify-center gap-2">
                <div className="text-2xl font-semibold text-gray-900">{stats.approved}</div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-sm text-gray-500 mt-1">Approved</div>
            </div>

            <div className="flex-1 p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="text-2xl font-semibold text-gray-900">{stats.rejected}</div>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <div className="text-sm text-gray-500 mt-1">Rejected</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by firm name or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Firm Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Submission Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.firmName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{request.submissionDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleReview(request.firmName)}
                      className="inline-flex items-center px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">No requests found matching your search.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verification;

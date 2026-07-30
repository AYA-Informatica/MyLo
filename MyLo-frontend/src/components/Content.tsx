import  { useState } from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';
// import Sidebar from '../components/DashSideBar';

const Content = () => {
  const [reports, setReports] = useState([
    {
      id: 1,
      type: 'Inappropriate Content',
      reportedBy: 'user@example.com',
      date: '14/12/2023',
      content: 'This legal advices seems questionable and potential harmful...',
      category: 'Inappropriate Content',
    },
    {
      id: 2,
      type: 'Misinformation',
      reportedBy: 'lawyer@example.com',
      date: '11/10/2023',
      content: 'This information about contract in this post is incorrect...',
      category: 'Misinformation',
    },
    {
      id: 3,
      type: 'Report 3',
      reportedBy: 'studentlaw@example.com',
      date: '20/02/2023',
      content: 'This comment contains offensive language against another user...',
      category: 'Harassment',
    },
  ]);

const handleDismiss = (id: number) => {
    setReports(reports.filter((report) => report.id !== id));
  };

const handleDelete = (id: number) => {
    setReports(reports.filter((report) => report.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-gray-50 pt-24 pl-4">
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Report Content</h1>
            <p className="text-gray-600">Review reported post and comments</p>
          </div>

          {/* Reports List */}
          <div className="space-y-6">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                {/* Report Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{report.type}</h3>
                    <p className="text-sm text-gray-500">
                      Report by: <span className="text-blue-600">{report.reportedBy}</span> on{' '}
                      {report.date}
                    </p>
                  </div>
                  {report.category === 'Harassment' && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                      {report.category}
                    </span>
                  )}
                </div>

                {/* Report Content */}
                <div className="mb-6">
                  <div className="border-l-4 border-gray-300 pl-4 py-2">
                    <p className="text-gray-700 italic">"{report.content}"</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDismiss(report.id)}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Dismiss
                  </button>

                  <button
                    onClick={() => handleDelete(report.id)}
                    className="inline-flex items-center px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No reports to review</div>
                <p className="text-gray-400 mt-2">All reports have been processed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Content;

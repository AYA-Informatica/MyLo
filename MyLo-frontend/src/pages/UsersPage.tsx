import { Users, UserCheck, Shield, Download, Filter, Search } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import UsersTable from '../components/UsersTable';
import { useGetUsersQuery } from '../app/api/user';
import { useMemo, useState } from 'react';
import DashboardLayout from '../components/DashLayout';
import { toast } from 'react-toastify';

export default function UsersPage() {
  const { data: users = [], isLoading } = useGetUsersQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate statistics from API data
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.isActive).length;
    const adminUsers = users.filter((user) =>
      user.role.name.toLowerCase().includes('admin'),
    ).length;

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      inactiveUsers: totalUsers - activeUsers,
      activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      adminPercentage: totalUsers > 0 ? Math.round((adminUsers / totalUsers) * 100) : 0,
      inactivePercentage:
        totalUsers > 0 ? Math.round(((totalUsers - activeUsers) / totalUsers) * 100) : 0,
    };
  }, [users]);

  // Export functions
  const exportToCSV = () => {
    if (users.length === 0) {
      toast.error('No users data to export');
      return;
    }

    setIsExporting(true);

    try {
      // Define CSV headers
      const headers = ['Name', 'Email', 'Role', 'Status', 'Created Date'];

      // Convert users data to CSV format
      const csvData = users.map((user) => [
        user.name || user.username || 'N/A',
        user.email || 'N/A',
        user.role?.name || 'N/A',
        user.isActive ? 'Active' : 'Inactive',
        new Date(user.createdAt).toLocaleDateString(),
      ]);

      // Combine headers and data
      const csvContent = [headers, ...csvData]
        .map((row) => row.map((field) => `"${field}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Users data exported successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export users data');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    if (users.length === 0) {
      toast.error('No users data to export');
      return;
    }

    setIsExporting(true);

    try {
      // Prepare clean user data for export
      const exportData = {
        exportDate: new Date().toISOString(),
        totalUsers: users.length,
        users: users.map((user) => ({
          id: user.id,
          name: user.name || user.username,
          email: user.email,
          role: user.role?.name,
          status: user.isActive ? 'Active' : 'Inactive',
          createdAt: user.createdAt,
        })),
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `users-export-${new Date().toISOString().split('T')[0]}.json`,
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Users data exported successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export users data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Container with proper responsive padding */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 pt-20 sm:pt-24 md:pt-6 md:mt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 truncate">
                  User Management
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Manage and monitor all system users
                </p>
              </div>

              {/* Mobile Quick Actions */}
              <div className="flex sm:hidden gap-3 w-full">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div
            className={`mb-6 sm:mb-8 transition-all duration-300 ${showFilters ? 'block' : 'hidden sm:block'}`}
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
              <div className="hidden sm:flex">
                <button className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="hidden md:inline">Filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <StatsCard
              title="Total Users"
              value={isLoading ? '...' : stats.totalUsers}
              change={stats.totalUsers}
              changeLabel="Since last month"
              icon={Users}
              trend="up"
              className="w-full"
            />
            <StatsCard
              title="Active Users"
              value={isLoading ? '...' : stats.activeUsers}
              change={stats.activePercentage}
              changeLabel={`${stats.activePercentage}% total`}
              icon={UserCheck}
              trend={stats.activePercentage > 70 ? 'up' : 'down'}
              className="w-full"
            />
            <StatsCard
              title="Admins"
              value={isLoading ? '...' : stats.adminUsers}
              change={stats.adminUsers}
              changeLabel="System Admin"
              icon={Shield}
              trend="up"
              className="w-full sm:col-span-2 lg:col-span-1"
            />
          </div>

          {/* Users Table Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    All Users
                  </h2>
                </div>

                {/* Action Buttons - Desktop */}
                <div className="hidden sm:flex gap-3">
                  {/* Export Dropdown */}
                  <div className="relative group">
                    <button
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                      disabled={isExporting || isLoading}
                    >
                      {isExporting ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="hidden md:inline">
                        {isExporting ? 'Exporting...' : 'Export'}
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <button
                        onClick={exportToCSV}
                        disabled={isExporting || isLoading}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download size={14} />
                        Export as CSV
                      </button>
                      <button
                        onClick={exportToJSON}
                        disabled={isExporting || isLoading}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download size={14} />
                        Export as JSON
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Mobile */}
                <div className="flex sm:hidden gap-3 w-full">
                  <button
                    onClick={exportToCSV}
                    disabled={isExporting || isLoading}
                    className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <UsersTable />

              {/* Mobile Scroll Hint */}
              <div className="sm:hidden text-center py-3 text-xs text-gray-500 bg-gray-50 border-t">
                ← Swipe to view all columns →
              </div>
            </div>
          </div>

          {/* Bottom Spacing */}
          <div className="h-6 sm:h-8"></div>
        </div>
      </div>
    </DashboardLayout>
  );
}

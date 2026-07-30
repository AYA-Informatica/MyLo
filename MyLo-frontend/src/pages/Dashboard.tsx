import { TrendingDown, Eye, Users } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DashboardLayout from '../components/DashLayout';
import { useGetUsersQuery } from '../app/api/user';
import { useMemo} from 'react';


export default function Dashboard() {
  const { data: users = [], isLoading } = useGetUsersQuery();

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
  
  return (
    <DashboardLayout>
      {/* Container with proper responsive padding */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 pt-20 sm:pt-24 md:pt-24 bg-style-500 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-700 mb-2">
              Welcome Back
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Here's what's happening with your platform today.
            </p>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
              title="Content Articles"
              value={8000}
              change={-5}
              changeLabel="Since last month"
              icon={TrendingDown}
              trend="down"
              valuePrefix="$"
              className="w-full"
            />
          </div>

          {/* Dashboard Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Incomplete Task Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between w-full mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">
                  Incomplete Task
                </h3>
                <Eye className="w-5 h-5 text-gray-400" />
              </div>

              <div className="flex flex-col items-center flex-1">
                {/* Circular Progress */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3 sm:mb-4">
                  <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#1e2c4a"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - 14 / 20)}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-primary-800">14</span>
                  </div>
                </div>

                <span className="text-sm sm:text-base text-gray-500 mb-4">Out of 20</span>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full text-center">
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-bold text-primary-700">100</span>
                    <span className="text-xs sm:text-sm text-gray-500">Verified</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-bold text-gray-400">10</span>
                    <span className="text-xs sm:text-sm text-gray-500">Unverified</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-bold text-yellow-500">20</span>
                    <span className="text-xs sm:text-sm text-gray-500">Pending</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Rate Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between w-full mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">
                  Engagement Rate
                </h3>
                <span className="text-xl sm:text-2xl font-bold text-primary-800">64.8%</span>
              </div>

              {/* Bar Chart */}
              <div className="flex-1 flex items-end justify-between w-full h-20 sm:h-24 mt-4">
                {[2, 3, 1, 4, 3].map((value, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div
                      className="bg-primary-800 rounded-t-sm w-4 sm:w-6 transition-all duration-300 hover:bg-primary-700"
                      style={{ height: `${value * 12}px` }}
                    />
                    <span className="text-xs text-gray-500">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May'][idx]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chart Legend/Info */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Average</span>
                  <span className="font-medium text-gray-700">2.6%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Cards Row (Optional) */}

          {/* Bottom Spacing */}
          <div className="h-6 sm:h-8"></div>
        </div>
      </div>
    </DashboardLayout>
  );
}

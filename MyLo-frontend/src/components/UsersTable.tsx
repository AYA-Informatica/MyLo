import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGetUsersQuery, useUpdateUserMutation, useDeleteUserMutation } from '../app/api/user';
// import profile from '../assets/profile.jpg';
import { formatDistanceToNow } from 'date-fns';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { Edit2, Trash2, Eye, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import type { UserstableType } from '../types/userstabletypes';

interface DropdownMenuProps {
  user: UserstableType;
  onEdit: (user: UserstableType) => void;
  onDelete: (user: UserstableType) => void;
  onView: (user: UserstableType) => void;
}

function DropdownMenu({ user, onEdit, onDelete, onView }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 192px
      const dropdownHeight = 120;

      // Calculate position relative to viewport
      let top = rect.bottom + 4;
      let left = rect.right - dropdownWidth;

      // Adjust if dropdown goes off screen
      if (left < 8) {
        left = rect.left;
      }

      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 4;
      }

      setPosition({ top, left });
    }
  }, [isOpen]);

  const dropdownContent = isOpen && (
    <>
      {/* Overlay to close dropdown */}
      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

      {/* Dropdown Menu */}
      <div
        className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <button
          onClick={() => {
            onView(user);
            setIsOpen(false);
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
        >
          <Eye size={14} />
          View Details
        </button>
        <button
          onClick={() => {
            onEdit(user);
            setIsOpen(false);
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
        >
          <Edit2 size={14} />
          Edit User
        </button>
        <button
          onClick={() => {
            onDelete(user);
            setIsOpen(false);
          }}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
        >
          <Trash2 size={14} />
          Delete User
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
        >
          <BsThreeDotsVertical size={16} />
        </button>
      </div>

      {/* Render dropdown outside table using Portal */}
      {typeof window !== 'undefined' &&
        dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </>
  );
}

interface EditUserModalProps {
  user: UserstableType | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<UserstableType>) => void;
  isLoading: boolean;
}

function EditUserModal({ user, isOpen, onClose, onSave, isLoading }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    isActive: user?.isActive || false,
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        isActive: user.isActive || false,
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-primary-100 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active User
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  user: UserstableType | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function DeleteConfirmModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DeleteConfirmModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Delete User</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6">
            Are you sure you want to delete <strong>{user.name || user.username}</strong>? This will
            permanently remove the user and all associated data.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete User
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersTable() {
  const { data: users = [], isLoading, error } = useGetUsersQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const [editingUser, setEditingUser] = useState<UserstableType | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserstableType | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const handleEdit = (user: UserstableType) => {
    setEditingUser(user);
  };

  const handleView = (user: UserstableType) => {
    toast.info(`Viewing details for ${user.name || user.username}`);
  };

  const handleDelete = (user: UserstableType) => {
    setDeletingUser(user);
  };

  const handleSaveEdit = async (userData: Partial<UserstableType>) => {
    if (!editingUser) return;

    try {
      await updateUser({
        id: editingUser.id,
        data: userData,
      }).unwrap();

      toast.success('User updated successfully!');
      setEditingUser(null);
    } catch (error) {
      toast.error('Failed to update user. Please try again.');
      console.error('Update error:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      await deleteUser(deletingUser.id).unwrap();
      toast.success('User deleted successfully!');
      setDeletingUser(null);
    } catch (error) {
      toast.error('Failed to delete user. Please try again.');
      console.error('Delete error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow border border-custom-200 w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-lg text-gray-600">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow border border-custom-200 w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600">Error loading users</div>
          <div className="text-sm text-gray-500 mt-2">
            {'status' in error ? `Error ${error.status}` : 'Network error'}
          </div>
        </div>
      </div>
    );
  }

  const usersArray = Array.isArray(users) ? users : [];

  return (
    <>
      <div className="bg-white w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-gray-600 text-sm font-semibold border-b border-custom-200 bg-gray-50">
                <th className="py-3 px-4 text-left font-medium">User</th>
                <th className="py-3 px-4 text-left font-medium">Role</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
                <th className="py-3 px-4 text-left font-medium">Created</th>
                <th className="py-3 px-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersArray.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                usersArray.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-custom-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Dynamic Avatar */}
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.name || user.username || 'User'}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  // Hide image and show initials on error
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}

                            {/* Initials fallback */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${
                                user.profileImage ? 'hidden' : ''
                              } ${
                                // Generate color based on name
                                (() => {
                                  const colors = [
                                    'bg-blue-500',
                                    'bg-green-500',
                                    'bg-purple-500',
                                    'bg-pink-500',
                                    'bg-indigo-500',
                                    'bg-yellow-500',
                                    'bg-red-500',
                                    'bg-teal-500',
                                    'bg-orange-500',
                                    'bg-cyan-500',
                                  ];
                                  const name = user.name || user.username || 'U';
                                  return colors[name.charCodeAt(0) % colors.length];
                                })()
                              }`}
                            >
                              {(user.name || user.username || '?').charAt(0).toUpperCase()}
                            </div>
                        
                          </div>
                        </td>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {user.name || user.username || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {user.role.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu
                        user={user}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onView={handleView}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveEdit}
        isLoading={isUpdating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        user={deletingUser}
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}

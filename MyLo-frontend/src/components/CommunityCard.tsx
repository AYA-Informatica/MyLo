import { useState } from 'react';
import type { CommunityPostType } from '../types/communitytypes';
import CommunityComment from './CommunityComment';
import InPuts from './InPuts';
import onfeed from '../assets/on-feed.png';
import { FaCommentDots } from 'react-icons/fa';
import { BiSolidUpvote } from 'react-icons/bi';
import { VscVerifiedFilled } from 'react-icons/vsc';
import { useDeletePostMutation, useUpdatePostMutation } from '../app/api/post/index';
import { toast } from 'react-toastify';

function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

type Props = {
  post: CommunityPostType;
  openComments?: boolean;
  onToggleComments?: () => void;
  onAddComment?: (comment: string) => void;
  onUpvote?: () => void;
  onPostUpdated?: () => void; // Callback to refresh posts after update
};

export default function CommunityCard({
  post,
  openComments,
  onToggleComments,
  onAddComment,
  onUpvote,
  onPostUpdated,
}: Props) {
  const [comment, setComment] = useState('');
  const [deletePost] = useDeletePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAdd = () => {
    if (!comment.trim()) return;
    onAddComment?.(comment);
    setComment('');
  };

  function handleDelete(event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setIsLoading(true);
    deletePost(post.id)
      .unwrap()
      .then(() => {
        setShowConfirm(false);
        toast.success('Post deleted successfully!');
        onPostUpdated?.(); // Refresh posts
      })
      .catch((error) => {
        console.error('Error deleting post:', error);
        toast.error(error?.data?.message || 'Failed to delete post');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  const handleUpdatePost = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setIsUpdating(true);
    try {
      await updatePost({
        id: post.id,
        data: {
          title: editTitle,
          content: editContent,
        },
      }).unwrap();

      toast.success('Post updated successfully!');
      setIsEditing(false);
      setShowMenu(false);
      onPostUpdated?.(); // Refresh posts
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast.error(error?.data?.message || 'Failed to update post');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditTitle(post.title || '');
    setEditContent(post.content);
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(post.title || '');
    setEditContent(post.content);
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="bg-white rounded-xl relative">
      {/* Top Row */}
      <div className="flex items-center gap-2 mb-1">
        {post.author.avatarUrl ? (
          <img
            src={post.author.avatarUrl}
            alt={post.author.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-lg">
            {post.author.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <span className="font-semibold text-[color:var(--color-primary-800)]">
          {post.author.name}
        </span>
        {post.author.isVerified && (
          <VscVerifiedFilled className="text-primary-800 text-xs size-6" />
        )}
        <span className="text-xs text-[color:var(--color-secondary-400)]">{post.author.tag}</span>

        <span className="ml-auto text-xs text-[color:var(--color-secondary-300)]">
          {timeAgo(post.createdAt)}
        </span>
      </div>
      {/* Content - Show edit form if editing, otherwise show normal content */}
      {isEditing ? (
        <div className="mb-4">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Post title"
            className="w-full mb-2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          <InPuts
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Post content"
            className="w-full mb-2"
            textarea
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdatePost}
              disabled={isUpdating}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-xs"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isUpdating}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Show title if it exists */}
          {post.title && (
            <div className="font-semibold text-[color:var(--color-primary-800)] text-base mb-1">
              {post.title}
            </div>
          )}

          {/* Content with Image Layout - UPDATED: Flex layout for side-by-side display */}
          <div className="flex gap-3 mb-2">
            {/* Text Content */}
            <div className="flex-1">
              <div className="text-[color:var(--color-primary-900)] text-sm">{post.content}</div>
            </div>

            {/* Post Image - RIGHT SIDE */}
            {post.imageUrl && !imageError && (
              <div className="flex-shrink-0 w-32 sm:w-40 md:w-48">
                <img
                  src={post.imageUrl}
                  alt="Post content"
                  className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-95 transition-opacity"
                  onError={handleImageError}
                  onClick={() => {
                    // Optional: Open image in modal/lightbox
                    window.open(post.imageUrl, '_blank');
                  }}
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Image Error Fallback - UPDATED: Also positioned on right side */}
          {post.imageUrl && imageError && (
            <div className="flex gap-3 mb-2">
              <div className="flex-1">
                <div className="text-[color:var(--color-primary-900)] text-sm">{post.content}</div>
              </div>
              <div className="flex-shrink-0 w-32 sm:w-40 md:w-48">
                <div className="h-24 sm:h-28 md:h-32 bg-gray-100 border border-gray-200 rounded-lg flex flex-col items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-400 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-xs text-gray-500 text-center px-1">Failed to load</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* Actions */}
      <div className="flex items-center gap-6 text-[color:var(--color-secondary-300)] text-xs mb-2">
        <span
          className="flex items-center gap-1 cursor-pointer hover:text-primary-600 transition-colors"
          onClick={onUpvote}
        >
          <BiSolidUpvote /> {post.upvotes}
        </span>
        <button
          className="flex items-center gap-1 focus:outline-none hover:text-primary-600 transition-colors"
          onClick={onToggleComments}
        >
          <FaCommentDots />
          {post.commentList?.length ?? 0}
        </button>
        <span className="cursor-pointer hover:text-primary-600 transition-colors">reply</span>

        {/* Menu with proper z-index */}
        <div className="ml-auto relative">
          <span
            className="cursor-pointer select-none hover:bg-gray-100 rounded-full px-2 py-1 transition-colors"
            onClick={() => setShowMenu(!showMenu)}
          >
            •••
          </span>
          {showMenu && (
            <>
              {/* Invisible backdrop to close menu when clicking outside */}
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              {/* Dropdown with high z-index and proper positioning */}
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[120px] py-1">
                <button
                  className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-xs text-gray-700 transition-colors"
                  onClick={handleStartEdit}
                >
                  <svg
                    className="w-3 h-3 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-xs text-red-600 transition-colors"
                  onClick={() => {
                    setShowConfirm(true);
                    setShowMenu(false);
                  }}
                >
                  <svg
                    className="w-3 h-3 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Post</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Comments Section */}
      {openComments && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <img src={onfeed} alt="User" className="w-7 h-7 rounded-full object-cover" />
            <div className="flex-1">
              <InPuts
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full"
                textarea
              />
            </div>
            <button
              className="ml-2 px-3 py-1 bg-[color:var(--color-primary-800)] text-white rounded-full font-semibold text-xs hover:bg-primary-700 transition-colors"
              onClick={handleAdd}
            >
              Comment
            </button>
          </div>
          {post.commentList &&
            post.commentList.map((commentObj) => (
              <CommunityComment
                key={commentObj.id}
                comment={{ ...commentObj, postId: post.id }}
                postId={post.id} // Pass postId as prop
              />
            ))}
        </div>
      )}
    </div>
  );
}

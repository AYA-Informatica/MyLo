import { useState } from 'react';
import type { CommunityCommentType } from '../types/communitytypes';
import InPuts from './InPuts';
import { BiSolidUpvote } from 'react-icons/bi';
import profile from '../assets/profile.jpg';
import { useDeleteCommentMutation, useUpdateCommentMutation } from '../app/api/comments';
import { useAddReplyMutation, useDeleteReplyMutation, useGetreplyQuery } from '../app/api/reply';
import { toast } from 'react-toastify';

export default function CommunityComment({
  comment,
  postId,
}: {
  comment: CommunityCommentType;
  postId?: string;
}) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  // Comment mutations
  const [deleteComment, { isLoading: isDeletingComment }] = useDeleteCommentMutation();
  const [updateComment, { isLoading: isUpdatingComment }] = useUpdateCommentMutation();

  // Reply mutations
  const [addReply, { isLoading: isAddingReply }] = useAddReplyMutation();
  const [deleteReply] = useDeleteReplyMutation();

  // Get postId from props or comment
  const actualPostId = postId || comment.postId;

  // Fetch replies from API
  const {
    data: repliesFromAPI,
    isLoading: isLoadingReplies,
    refetch: refetchReplies,
  } = useGetreplyQuery(
    { postId: actualPostId!, commentId: comment.id },
    { skip: !actualPostId || !showReplies },
  );

  // Transform API reply data to match CommunityCommentType format
  const transformReplyData = (apiReply: any): CommunityCommentType => {
    return {
      id: apiReply.id,
      postId: actualPostId!,
      content: apiReply.content,
      createdAt: apiReply.createdAt,
      upvotes: 0, // API doesn't seem to return upvotes for replies
      author: {
        name: apiReply.author.name || apiReply.author.username,
        avatarUrl: apiReply.author.avatarUrl || '',
        isVerified: apiReply.author.isVerified || false,
        tag: apiReply.author.tag || 'citizen',
      },
      replies: [], // Nested replies would need recursive handling if supported
    };
  };

  // Get transformed replies and count
  const transformedReplies = repliesFromAPI ? repliesFromAPI.map(transformReplyData) : [];
  const replyCount = transformedReplies.length || comment.replies?.length || 0;
  const replies = transformedReplies.length > 0 ? transformedReplies : comment.replies || [];

  // Handle adding a reply
  const handleAddReply = async () => {
    if (!reply.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    if (!actualPostId) {
      toast.error('Post ID not found');
      return;
    }

    try {
      await addReply({
        postId: actualPostId,
        commentId: comment.id,
        content: reply,
      }).unwrap();

      toast.success('Reply added successfully!');
      setReply('');
      setShowReply(false);

      // Refetch replies to show the new reply
      refetchReplies();
    } catch (error: any) {
      console.error('Error adding reply:', error);
      toast.error(error?.data?.message || 'Failed to add reply');
    }
  };

  // Handle deleting comment
  const handleDeleteComment = async () => {
    if (!actualPostId) {
      toast.error('Post ID not found');
      return;
    }

    try {
      await deleteComment({
        postId: actualPostId,
        id: comment.id,
      }).unwrap();

      toast.success('Comment deleted successfully!');
      setShowMenu(false);
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(error?.data?.message || 'Failed to delete comment');
    }
  };

  // Handle updating comment
  const handleUpdateComment = async () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (!actualPostId) {
      toast.error('Post ID not found');
      return;
    }

    try {
      await updateComment({
        postId: actualPostId,
        id: comment.id,
        content: editContent,
      }).unwrap();

      toast.success('Comment updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating comment:', error);
      toast.error(error?.data?.message || 'Failed to update comment');
    }
  };

  // Handle deleting reply
  const handleDeleteReply = async (replyId: string) => {
    console.log('=== DELETE REPLY DEBUG ===');
    console.log('Reply ID to delete:', replyId);
    console.log('Post ID:', actualPostId);
    console.log('Comment ID:', comment.id);
    console.log('Current user:', JSON.parse(localStorage.getItem('citizen') || '{}'));

    if (!actualPostId) {
      toast.error('Post ID not found');
      return;
    }

    try {
      const result = await deleteReply({
        postId: actualPostId,
        commentId: comment.id,
        id: replyId,
      }).unwrap();

      console.log('Delete reply success:', result);
      toast.success('Reply deleted successfully!');
      refetchReplies();
    } catch (error: any) {
      console.error('=== DELETE REPLY ERROR ===');
      console.error('Full error object:', error);
      console.error('Error status:', error?.status);
      console.error('Error data:', error?.data);
      console.error('Error message:', error?.data?.message);

      toast.error(error?.data?.message || 'Failed to delete reply');
    }
  };

  // Handle showing/hiding replies
  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  return (
    <div className="ml-8 mt-2 border-l border-[color:var(--color-custom-300)] pl-4">
      <div className="flex items-center gap-2">
        {comment.author.avatarUrl ? (
          <img
            src={comment.author.avatarUrl}
            alt={comment.author.name}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-base">
            {comment.author.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <span className="font-semibold text-sm">{comment.author.name}</span>
        {comment.author.tag && (
          <span className="bg-[color:var(--color-style-500)] text-xs px-2 py-0.5 rounded">
            {comment.author.tag}
          </span>
        )}
        <span className="ml-auto text-xs text-[color:var(--color-secondary-300)]">
          {comment.createdAt}
        </span>
      </div>

      {/* Comment content - show edit form if editing */}
      {isEditing ? (
        <div className="ml-9 mt-2">
          <InPuts
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edit your comment..."
            className="w-full mb-2"
            textarea
          />
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-[color:var(--color-primary-800)] text-white rounded-full font-semibold text-xs disabled:opacity-50"
              onClick={handleUpdateComment}
              disabled={isUpdatingComment}
            >
              {isUpdatingComment ? 'Saving...' : 'Save'}
            </button>
            <button
              className="px-3 py-1 bg-gray-300 rounded-full font-semibold text-xs"
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              disabled={isUpdatingComment}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="ml-9 text-sm mt-1">{comment.content}</div>
      )}

      {/* Actions */}
      <div className="ml-9 flex items-center gap-4 text-xs text-[color:var(--color-secondary-300)] mt-1">
        <span className="flex items-center gap-1">
          <BiSolidUpvote /> {comment.upvotes}
        </span>

        <button
          className="cursor-pointer hover:text-[color:var(--color-primary-800)]"
          onClick={() => setShowReply((v) => !v)}
        >
          reply
        </button>

        {/* Show reply count and toggle button */}
        {replyCount > 0 && (
          <button
            className="cursor-pointer hover:text-[color:var(--color-primary-800)]"
            onClick={toggleReplies}
          >
            {showReplies ? 'hide' : 'show'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {/* Menu */}
        <div className="relative ml-auto">
          <span
            className="cursor-pointer hover:text-[color:var(--color-primary-800)]"
            onClick={() => setShowMenu((v) => !v)}
          >
            ...
          </span>
          {showMenu && (
            <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg z-10 min-w-[120px]">
              <button
                className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-xs"
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
              >
                Edit
              </button>
              <button
                className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 text-xs disabled:opacity-50"
                onClick={handleDeleteComment}
                disabled={isDeletingComment}
              >
                {isDeletingComment ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reply input form */}
      {showReply && (
        <div className="ml-9 flex items-center gap-2 mt-2">
          <img src={profile} alt="User" className="w-6 h-6 rounded-full object-cover" />
          <InPuts
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            className="w-full"
            textarea
          />
          <button
            className="ml-2 px-3 py-1 bg-[color:var(--color-primary-800)] text-white rounded-full font-semibold text-xs disabled:opacity-50"
            onClick={handleAddReply}
            disabled={isAddingReply}
          >
            {isAddingReply ? 'Replying...' : 'Reply'}
          </button>
        </div>
      )}

      {/* Render replies */}
      {showReplies && (
        <div className="mt-2">
          {isLoadingReplies ? (
            <div className="ml-9 text-xs text-gray-500">Loading replies...</div>
          ) : replies.length > 0 ? (
            replies.map((replyComment) => (
              <div key={replyComment.id} className="relative">
                <CommunityComment comment={replyComment} postId={actualPostId} />
                {/* Add delete button for replies */}
                <button
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs opacity-50 hover:opacity-100"
                  onClick={() => handleDeleteReply(replyComment.id)}
                  title="Delete reply"
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <div className="ml-9 text-xs text-gray-500">No replies yet</div>
          )}
        </div>
      )}
    </div>
  );
}

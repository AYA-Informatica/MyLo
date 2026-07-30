import { useState } from 'react';
import Layout from '../components/Layout';
import SearchBar from '../components/SearchBar';
import CommunityCard from '../components/CommunityCard';
import InPuts from '../components/InPuts';
import type { CommunityPostType } from '../types/communitytypes';
import onfeed from '../assets/on-feed.png';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCircleNotch, FaImage, FaTimes, FaSmile } from 'react-icons/fa';
import { useGetPostsQuery, useCreatePostMutation } from '../app/api/post/index';
import { useAddCommentMutation } from '../app/api/comments';
import { useUpvotePostMutation } from '../app/api/upvote';
import { useGetRolesQuery } from '../app/api/roles';
import { jwtDecode } from 'jwt-decode';

const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(''),
      );
      const decoded = JSON.parse(jsonPayload);
      return decoded.id || decoded.userId || decoded.sub;
    }

    const citizen = localStorage.getItem('citizen');
    if (citizen) {
      const parsed = JSON.parse(citizen);
      return parsed.id || parsed.userId;
    }

    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

// Helper function to get current user role from token
const getCurrentUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token) as any;
      return decoded.role;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user role:', error);
    return null;
  }
};

export default function CommunityPage() {
  const [search, setSearch] = useState('');
  const [newPost, setNewPost] = useState('');
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const user = JSON.parse(localStorage.getItem('citizen') || '{}');
  const avatarUrl = user.avatarUrl || '';
  const userName = user.name || user.username || 'citizen';

  // API hooks
  const { data, isLoading, refetch } = useGetPostsQuery();
  const [createPost] = useCreatePostMutation();
  const [addComment] = useAddCommentMutation();
  const [upvotePost] = useUpvotePostMutation();
  const { data: rolesData } = useGetRolesQuery();

  // Debug logging
  console.log('Posts Data:', data);
  console.log('Roles Data:', rolesData);
  console.log('Current User Role:', getCurrentUserRole());

  // Map roles for easy access - FIXED: Use correct path
  const rolesMap: Record<string, string> = {};
  if (rolesData?.data?.roles && Array.isArray(rolesData.data.roles)) {
    rolesData.data.roles.forEach((role: { id: string; name: string }) => {
      rolesMap[role.id] = role.name;
    });
  }

  console.log('Roles Map:', rolesMap);

  // Helper function to determine user role
  const getUserRole = (authorData: any, authorId?: string): string => {
    console.log('Getting role for author:', authorData, 'authorId:', authorId);

    // First, check if this is the current user's post
    const currentUserId = getCurrentUserId();
    const currentUserRole = getCurrentUserRole();

    if (authorId && currentUserId === authorId && currentUserRole) {
      console.log('This is current user post, role:', currentUserRole);
      return currentUserRole;
    }

    // Try to get role directly from author data
    if (authorData?.role?.name) {
      console.log('Found role.name:', authorData.role.name);
      return authorData.role.name;
    }

    if (authorData?.role) {
      console.log('Found direct role:', authorData.role);
      return authorData.role;
    }

    // Try to get role from roles map if we have a roleId
    if (authorData?.roleId && rolesMap[authorData.roleId]) {
      console.log('Found role via roleId lookup:', rolesMap[authorData.roleId]);
      return rolesMap[authorData.roleId];
    }

    // Try userType as fallback
    if (authorData?.userType) {
      console.log('Found userType:', authorData.userType);
      return authorData.userType;
    }

    // Check for law firm indicators in name
    const authorName = (authorData?.name || '').toLowerCase();
    const username = (authorData?.username || '').toLowerCase();

    const lawFirmKeywords = [
      'law',
      'legal',
      'firm',
      'attorney',
      'lawyer',
      'advocates',
      'chambers',
      'partners',
      'associates',
      'counsel',
      'llp',
      'pc',
      'pllc',
      'esquire',
      'bar',
      'justice',
      'lexbridge',
    ];

    const hasLawFirmKeywords = lawFirmKeywords.some(
      (keyword) => authorName.includes(keyword) || username.includes(keyword),
    );

    if (hasLawFirmKeywords) {
      console.log('Detected law firm based on name keywords');
      return 'law-firm';
    }

    // Default fallback
    console.log('Using default role: citizen');
    return 'citizen';
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Ensure posts is always an array with enhanced role detection
  const posts: CommunityPostType[] = Array.isArray(data?.data)
    ? data.data.map((post: any) => {
      console.log('Processing post:', post.id, 'Author data:', post.author);

      return {
        id: post.id,
        title: post.title || '',
        content: post.content || '',
        imageUrl: post.imageUrl || post.image_url || '',
        createdAt: post.createdAt || new Date().toISOString(),
        upvotes: Array.isArray(post.upvotes) ? post.upvotes.length : 0,
        author: {
          name: post.author?.name || post.author?.username || 'Unknown',
          avatarUrl: post.image_url || post.author?.avatarUrl || '',
          isVerified: post.author?.isVerified || false,
          tag: getUserRole(post.author, post.authorId), // Enhanced role detection
        },
        commentList: Array.isArray(post.comments)
          ? post.comments.map((comment: any) => ({
            id: comment.id,
            postId: post.id,
            author: {
              name: comment.author?.name || comment.author?.username || 'Unknown',
              avatarUrl: comment.author?.avatarUrl || '',
              isVerified: comment.author?.isVerified || false,
              tag: getUserRole(comment.author, comment.authorId), // Enhanced role detection
            },
            content: comment.content || '',
            createdAt: comment.createdAt || new Date().toISOString(),
            upvotes: Array.isArray(comment.upvotes)
              ? comment.upvotes.length
              : comment.upvotes || 0,
            replies: comment.replies || [],
          }))
          : [],
      };
    })
    : [];

  // Filter posts by search
  const filteredPosts = posts.filter(
    (post) =>
      post.content.toLowerCase().includes(search.toLowerCase()) ||
      post.author.name.toLowerCase().includes(search.toLowerCase()) ||
      (post.title && post.title.toLowerCase().includes(search.toLowerCase())),
  );

  const handleupvote = async (postId: string) => {
    try {
      const userId = getCurrentUserId();

      if (!userId) {
        toast.error('Please log in to upvote posts');
        return;
      }

      await upvotePost({
        postID: postId,
        userId: userId,
      }).unwrap();

      toast.success('Post upvoted successfully!');
      refetch();
    } catch (err: any) {
      console.error('Error upvoting post:', err);

      if (err?.data?.message) {
        toast.error(err.data.message);
      } else if (err?.message) {
        toast.error(err.message);
      } else {
        toast.error('Failed to upvote post. Please try again.');
      }
    }
  };

  // Enhanced post creation with image support
  const handlePost = async () => {
    if (!title.trim()) {
      toast.error('Please add a title to your post');
      return;
    }

    if (!newPost.trim() && !selectedImage) {
      toast.error('Please add content or an image to your post');
      return;
    }

    setIsPosting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());

      if (newPost.trim()) {
        formData.append('content', newPost.trim());
      }

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      await createPost(formData).unwrap();

      toast.success('Post created successfully!');

      setNewPost('');
      setTitle('');
      setSelectedImage(null);
      setImagePreview(null);

      refetch();
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast.error(err?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleAddComment = async (postId: string, comment: string) => {
    if (!comment.trim()) return;
    try {
      await addComment({ postId, content: comment });
      toast.success('Comment added!');
      refetch();
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment.');
    }
  };

  return (
    <Layout>
      <div className="font-sans min-h-screen py-4 sm:py-6 mt-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-8 space-y-6">
              {/* Debug Panel (development only) */}
              {/* {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                  <h4 className="font-semibold text-yellow-800 mb-2">Debug Info:</h4>
                  <div className="text-yellow-700 space-y-1">
                    <p>Current User Role: {getCurrentUserRole() || 'Not found'}</p>
                    <p>Posts Count: {posts.length}</p>
                    <p>Law Firm Posts: {posts.filter((p) => p.author.tag === 'law-firm').length}</p>
                    <p>Citizen Posts: {posts.filter((p) => p.author.tag === 'citizen').length}</p>
                    <p>Available Roles: {Object.values(rolesMap).join(', ')}</p>
                  </div>
                </div>
              )} */}

              {/* Enhanced Post Creation Form */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0 self-start">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userName}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Post Form */}
                  <div className="flex-1 space-y-3">
                    {/* Title Input */}
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What's on your mind? Add a title..."
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-base sm:text-lg font-medium placeholder-gray-400"
                      disabled={isPosting}
                    />

                    {/* Content Textarea */}
                    <InPuts
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share your thoughts, ask a question, or start a discussion..."
                      className="w-full min-h-[80px] sm:min-h-[100px] resize-none text-sm sm:text-base"
                      textarea
                      rows={3}
                      disabled={isPosting}
                    />

                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="relative inline-block max-w-full">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-full h-auto max-h-48 sm:max-h-60 rounded-lg border border-gray-200 object-cover"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-md"
                          disabled={isPosting}
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      {/* Left side - Tools */}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer transition-colors">
                          <FaImage className="w-4 h-4" />
                          <span className="text-sm font-medium hidden sm:inline">Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            disabled={isPosting}
                          />
                        </label>

                        <button
                          className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                          disabled={isPosting}
                        >
                          <FaSmile className="w-4 h-4" />
                          <span className="text-sm font-medium hidden sm:inline">Mood</span>
                        </button>
                      </div>

                      {/* Right side - Post Button */}
                      <button
                        onClick={handlePost}
                        disabled={isPosting || !title.trim() || (!newPost.trim() && !selectedImage)}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-primary-800 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        {isPosting ? (
                          <>
                            <FaCircleNotch className="animate-spin w-4 h-4" />
                            Posting...
                          </>
                        ) : (
                          'Post'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                      <FaCircleNotch className="animate-spin text-primary-800 text-3xl mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">Loading posts...</p>
                    </div>
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="text-gray-400 mb-4">
                      <FaSmile className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    </div>
                    <p className="text-lg text-gray-600 mb-2">No posts yet</p>
                    <p className="text-sm text-gray-500">
                      Be the first to share something with the community!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredPosts.map((post) => (
                      <div key={post.id} className="p-4 sm:p-6">
                        {/* Show role indicator in development */}
                        {/* {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-50 rounded">
                            <strong>Author:</strong> {post.author.name} | <strong>Role:</strong>{' '}
                            {post.author.tag}
                          </div>
                        )} */}
                        <CommunityCard
                          post={post}
                          openComments={openComments === post.id}
                          onToggleComments={() =>
                            setOpenComments(openComments === post.id ? null : post.id)
                          }
                          onAddComment={(comment) => handleAddComment(post.id, comment)}
                          onUpvote={() => handleupvote(post.id)}
                          onPostUpdated={refetch}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Search */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <SearchBar placeholder="Search posts..." onSearch={setSearch} className="w-full" />
              </div>

              {/* Top Contributors */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                <h3 className="font-bold mb-4 text-primary-800 text-base sm:text-lg">
                  Top Contributors
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'Divine Ingabire', tag: 'User', avatar: onfeed },
                    { name: 'Aline Muhoza', tag: 'User', avatar: onfeed },
                    { name: 'LexBridge Partners', tag: 'Law Firm', avatar: onfeed },
                  ].map((contributor, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img
                        src={contributor.avatar}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                        alt={contributor.name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                          {contributor.name}
                        </div>
                        <span className="inline-block bg-gray-100 text-xs px-2 py-1 rounded-full text-gray-600 mt-1">
                          {contributor.tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Organizations */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                <h3 className="font-bold mb-4 text-primary-800 text-base sm:text-lg">
                  Suggested Organizations
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'Justice Law Group', tag: 'Labor Law', avatar: onfeed },
                    { name: 'CivicShield Legal', tag: 'Corporate Law', avatar: onfeed },
                  ].map((org, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img
                        src={org.avatar}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                        alt={org.name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
                          {org.name}
                        </div>
                        <span className="inline-block bg-blue-100 text-xs px-2 py-1 rounded-full text-blue-600 mt-1">
                          {org.tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Topics */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                <h3 className="font-bold mb-4 text-primary-800 text-base sm:text-lg">
                  Trending Legal Topics
                </h3>
                <div className="space-y-3">
                  {['#Property Law', '#Family Law', '#Business Law', '#Criminal Law'].map(
                    (topic, idx) => (
                      <a
                        key={idx}
                        href="#"
                        className="block text-primary-600 hover:text-primary-700 font-medium text-sm sm:text-base hover:underline transition-colors py-1"
                      >
                        {topic}
                      </a>
                    ),
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  );
}

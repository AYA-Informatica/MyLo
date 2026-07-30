/**
 * Server-side entity shapes, as the MyLo API actually returns them.
 *
 * These describe the wire format, which is not always what the UI renders — the
 * community pages map these onto the view types in `communitytypes.ts`. Keeping
 * the two separate means a change to an API payload surfaces as a type error at
 * the mapping site rather than silently deep in a component.
 */

export interface ApiRole {
  id: string;
  name: string;
  permissions?: string[];
}

/** The author block embedded in posts, comments and replies. */
export interface ApiAuthor {
  id?: string;
  name?: string | null;
  username?: string;
  email?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  /** Sometimes expanded to the full role, sometimes only the foreign key. */
  role?: ApiRole | string;
  roleId?: string;
  userType?: string;
  /** Display badge the community UI renders next to the name. */
  tag?: string;
}

export interface ApiUpvote {
  id: string;
  userId?: string;
  postId?: string;
}

export interface ApiComment {
  id: string;
  content: string;
  createdAt: string;
  postId?: string;
  authorId?: string;
  author?: ApiAuthor;
  upvotes?: ApiUpvote[];
  replies?: ApiReply[];
}

export interface ApiReply {
  id: string;
  content: string;
  createdAt: string;
  commentId?: string;
  authorId?: string;
  author?: ApiAuthor;
  upvotes?: ApiUpvote[];
}

export interface ApiPost {
  id: string;
  title?: string;
  content: string;
  /** The API has used both spellings; treat either as present. */
  imageUrl?: string;
  image_url?: string;
  createdAt: string;
  updatedAt?: string;
  authorId?: string;
  author?: ApiAuthor;
  upvotes?: ApiUpvote[];
  comments?: ApiComment[];
}

export interface ApiDomain {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** A law firm as rendered by the directory cards. */
export interface ApiFirm {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  address?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  specialties?: { id: string; name: string }[];
  domains?: ApiDomain[];
}

export interface FeedCardProps {
  firmLogo: string;
  firmName: string;
  isVerified?: boolean;
  title: string;
  description: string;
  image: string;
  views: number | string;
  comments: number;
  date: string;
  isBookmarked?: boolean;
  onBookmark?: () => void;
  onMoreOptions?: () => void;
}

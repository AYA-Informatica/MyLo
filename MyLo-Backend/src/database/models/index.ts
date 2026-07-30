import { Sequelize } from 'sequelize';
import { Role, RoleModel } from './Role';
import { User, UserModel } from './User';
import { Profile, ProfileModel } from './Profile';
import { Rating, RatingModel } from './Rating';
import { Subscriber, SubscriberModel } from './Subscriber';
import { Post, PostModel } from './Post';
import { Comment, CommentModel } from './Comment';
import { Reply, ReplyModel } from './Reply';
import { Upvote, UpvoteModel } from './Upvote';
import { Domain, DomainModel } from './Domain';
import { Origin, OriginModel } from './Origin';
import { Specialty, SpecialtyModel } from './Specialty';
import { DomainPreference, DomainPreferenceModel } from './DomainPreference';
import { Law, LawModel } from './Law';
import { Article, ArticleModel } from './Article';

interface Models {
  Role: typeof Role;
  User: typeof User;
  Profile: typeof Profile;
  Rating: typeof Rating;
  Subscriber: typeof Subscriber;
  Post: typeof Post;
  Comment: typeof Comment;
  Reply: typeof Reply;
  Upvote: typeof Upvote;
  Domain: typeof Domain;
  Origin: typeof Origin;
  Specialty: typeof Specialty;
  DomainPreference: typeof DomainPreference;
  Law: typeof Law;
  Article: typeof Article;
}

export const AllModels = (sequelize: Sequelize): Models => ({
  Role: RoleModel(sequelize),
  User: UserModel(sequelize),
  Profile: ProfileModel(sequelize),
  Rating: RatingModel(sequelize),
  Subscriber: SubscriberModel(sequelize),
  Post: PostModel(sequelize),
  Comment: CommentModel(sequelize),
  Reply: ReplyModel(sequelize),
  Upvote: UpvoteModel(sequelize),
  Domain: DomainModel(sequelize),
  Origin: OriginModel(sequelize),
  Specialty: SpecialtyModel(sequelize),
  DomainPreference: DomainPreferenceModel(sequelize),
  Law: LawModel(sequelize),
  Article: ArticleModel(sequelize),
});

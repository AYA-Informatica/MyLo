import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import { CreatePostInterface, GetAllPosts, PostInterface, UpdatePostInterface } from './posts';
import { generateSlug } from '../../../utils/helper';
import { uploadToCloudinary } from '../../../utils/upload';

export class PostService {
  data: PostInterface | CreatePostInterface | UpdatePostInterface;
  userId: string;
  dataId: string;
  file: Express.Multer.File;
  res: Response;

  constructor(
    data: PostInterface | CreatePostInterface | UpdatePostInterface,
    userId: string,
    dataId: string,
    file: Express.Multer.File,
    res: Response,
  ) {
    this.data = data;
    this.userId = userId;
    this.dataId = dataId;
    this.file = file;
    this.res = res;
  }

  private async postExist(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const post = await Database.Post.findOne({ where: { id: this.dataId }, raw: true });
      if (!post) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async create(): Promise<unknown> {
    try {
      const author = await Database.User.findOne({ where: { id: this.userId }, raw: true });
      if (!author) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Author not found',
          res: this.res,
        });
      }
      let image_url: string = '';

      if (this.file) {
        try {
          image_url = await uploadToCloudinary(this.file as Express.Multer.File);
        } catch (error) {
          const { message, stack } = error as Error;
          return ResponseService({
            data: { message, stack },
            status: 500,
            success: false,
            res: this.res,
          });
        }
      }
      const { title, content } = this.data as CreatePostInterface;
      const post = await Database.Post.create({
        title,
        slug: generateSlug(title as string) ?? ('' as string),
        content,
        authorId: author.id,
        image_url: image_url as string,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: post,
        status: 201,
        success: true,
        message: 'Post successfully created',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async findAll(): Promise<unknown> {
    try {
      const posts = await Database.Post.findAll({
        include: [
          {
            model: Database.User,
            as: 'author',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Upvote,
            as: 'upvotes',
          },
          {
            model: Database.Comment,
            as: 'comments',
            attributes: ['id', 'authorId', 'content'],
            include: [
              {
                model: Database.User,
                as: 'author',
                attributes: ['id', 'name', 'username'],
              },
              {
                model: Database.Reply,
                as: 'replies',
                attributes: ['id', 'authorId', 'content'],
              },
            ],
          },
        ],
      });
      if (!posts || posts.length === 0) {
        return ResponseService<GetAllPosts[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No posts found',
          res: this.res,
        });
      }
      return ResponseService({
        data: posts,
        status: 200,
        message: 'Posts successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async findOne(): Promise<unknown> {
    try {
      const postCheck = await this.postExist();

      if (postCheck.error) {
        const { message, stack } = postCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!postCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Post not found',
          res: this.res,
        });
      }

      const post = await Database.Post.findOne({
        where: { id: this.dataId },
        include: [
          {
            model: Database.User,
            as: 'author',
            attributes: ['id', 'name', 'username'],
          },
          {
            model: Database.Comment,
            as: 'comments',
            attributes: ['id', 'authorId', 'content'],
            include: [
              {
                model: Database.User,
                as: 'author',
                attributes: ['id', 'name', 'username'],
              },
            ],
          },
        ],
      });

      return ResponseService({
        data: post,
        status: 200,
        message: 'Post successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async update(): Promise<unknown> {
    try {
      const postCheck = await this.postExist();
      if (postCheck.error) {
        const { message, stack } = postCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!postCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Post not found',
          res: this.res,
        });
      }

      let image_url: string = '';

      if (this.file) {
        try {
          image_url = await uploadToCloudinary(this.file as Express.Multer.File);
        } catch (error) {
          const { message, stack } = error as Error;
          return ResponseService({
            data: { message, stack },
            status: 500,
            success: false,
            res: this.res,
          });
        }
      }
      const updateData: UpdatePostInterface = { ...this.data };
      if (image_url) {
        updateData.image_url = image_url;
      }

      const updatedPost = await Database.Post.update(
        {
          ...updateData,
          slug: generateSlug(updateData.title as string),
          authorId: this.userId,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedPost,
        success: true,
        status: 200,
        message: 'Post successfully updated',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async delete(): Promise<unknown> {
    try {
      const postCheck = await this.postExist();

      if (postCheck.error) {
        const { message, stack } = postCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!postCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Post not found',
          res: this.res,
        });
      }

      const deletedPost = await Database.Post.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedPost,
        success: true,
        status: 200,
        message: 'Post successfully deleted',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }
}

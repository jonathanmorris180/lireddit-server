import { Post } from "../entities/Post";
import {
    Arg,
    Ctx,
    Field,
    FieldResolver,
    InputType,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    Root,
    UseMiddleware
} from "type-graphql";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";

@InputType()
class PostInput {
    @Field()
    title: string;
    @Field()
    text: string;
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts: Post[];
    @Field()
    hasMore: boolean;
}

// this is the resolver for the Post entity, so we pass it in here
@Resolver(Post)
export class PostResolver {
    @FieldResolver(() => String)
    textSnippet(@Root() post: Post) {
        return post.text.slice(0, 50);
    }

    // this adds a creator param to each query on the Post object
    // we add the return type in the FieldResolver decorator
    // @FieldResolver functions only get returned if they are included in the query (e.g., creator in this case)
    @FieldResolver(() => User)
    creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
        /* this will batch all the IDs to a single function call
        the batched function call is handled by createUserLoader */

        // this is added to the return value of
        return userLoader.load(post.creatorId);
    }

    @FieldResolver(() => Int, { nullable: true })
    async voteStatus(
        @Root() post: Post,
        @Ctx() { updootLoader, req }: MyContext
    ) {
        if (!req.session.userId) return null;
        const updoot = await updootLoader.load({
            postId: post.id,
            userId: req.session.userId
        });

        return updoot ? updoot.value : null;
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async vote(
        @Arg("postId", () => Int) postId: number,
        @Arg("value", () => Int) value: number,
        @Ctx() { req }: MyContext
    ) {
        const isUpdoot = value !== -1;
        const realValue = isUpdoot ? 1 : -1;
        const { userId } = req.session;
        const updoot = await Updoot.findOne({ where: { postId, userId } });

        if (updoot && updoot.value !== realValue) {
            await getConnection().transaction(async tm => {
                await tm.query(
                    `
                    UPDATE updoot
                    SET value = $1
                    WHERE "postId" = $2 and "userId" = $3
                    `,
                    [realValue, postId, userId]
                );

                await tm.query(
                    `
                    UPDATE post
                    SET points = points + $1
                    WHERE id = $2
                    `,
                    [realValue * 2, postId]
                );
            });
        } else if (!updoot) {
            await getConnection().transaction(async tm => {
                await tm.query(
                    `
                    INSERT INTO updoot ("userId", "postId", value)
                    VALUES ($1, $2, $3);
                    `,
                    [userId, postId, realValue]
                );

                await tm.query(
                    `
                    UPDATE post
                    SET points = points + $1
                    WHERE id = $2;
                    `,
                    [realValue, postId]
                );
            });
        }
        return true;
    }

    @Query(() => PaginatedPosts)
    async posts(
        @Arg("limit", () => Int) limit: number,
        @Arg("cursor", () => String, { nullable: true }) cursor: string | null
    ): Promise<PaginatedPosts> {
        // get one more than asked for to check if there are more in the DB
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;
        const replacements: unknown[] = [realLimitPlusOne];

        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
        }
        // the dollar sign below is replaced by the array (second param to the query function)
        const posts = await getConnection().query(
            `
            SELECT p.*
            FROM post p
            ${cursor ? `WHERE p."createdAt" < $${replacements.length}` : ""}
            ORDER BY p."createdAt" DESC
            LIMIT $1
        `,
            replacements
        );

        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === realLimitPlusOne
        };
    }

    @Query(() => Post, { nullable: true })
    async post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
        const postResult = await Post.findOne(id);

        return postResult;
    }

    @Mutation(() => Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg("input") input: PostInput,
        @Ctx() { req }: MyContext
    ): Promise<Post> {
        return Post.create({
            ...input,
            creatorId: req.session.userId
        }).save();
    }

    @Mutation(() => Post, { nullable: true })
    @UseMiddleware(isAuth)
    async updatePost(
        @Arg("id", () => Int) id: number,
        @Arg("title") title: string,
        @Arg("text") text: string,
        @Ctx() { req }: MyContext
    ): Promise<Post | null> {
        const result = await getConnection()
            .createQueryBuilder()
            .update(Post)
            .set({ title: title, text: text })
            .where('id = :id AND "creatorId" = :creatorId', {
                id,
                creatorId: req.session.userId
            })
            .returning("*")
            .execute();

        return result.raw[0];
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async deletePost(
        @Arg("id", () => Int) id: number,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        await Post.delete({ id, creatorId: req.session.userId });
        return true;
    }
}

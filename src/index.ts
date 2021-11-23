import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import mikroConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";
import { MyContext } from "./types";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";


const main = async () => {
    const orm = await MikroORM.init(mikroConfig);
    await orm.getMigrator().up();
    const app = express();

    const corsOptions = {
        origin: "https://studio.apollographql.com",
        credentials: true
    }

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient();

    // express-session needs to be before the apollo middleware because it will be used inside the apollo middleware
    app.use(
        session({
            name: "qid",
            store: new RedisStore({ client: redisClient, disableTouch: true }),
            // secret should be set as an environment variable - the secret is needed to decrypt the cookie on the server to send to Redis
            secret: "test",
            resave: false,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true,
                sameSite: "lax", // CSRF
                secure: __prod__ // cookie only works in https
            },
            saveUninitialized: false
        })
    );
    
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [ HelloResolver, PostResolver, UserResolver ],
            validate: false,
        }),
        plugins: [
            ApolloServerPluginLandingPageGraphQLPlayground({
                settings: {
                    "request.credentials": "include"
                }
            })
        ],
        context: ({ req, res }): MyContext => ({ em: orm.em, req, res })
    });

    await apolloServer.start();

    apolloServer.applyMiddleware({ app, cors: corsOptions });

    app.listen(4000, () => {
        console.log("server started on localhost:4000");
    });
    
}

main().catch(err => {
    console.error(err);
});

import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from "@mikro-orm/core";
import path from "path";

export default {
    dbName: "lireddit",
    debug: !__prod__,
    entities: [Post],
    migrations: {
        path: path.join(__dirname, "./migrations"),
        pattern: /^[\w-]+\d+\.[tj]s$/,
    },
    type: "postgresql"
} as Parameters<typeof MikroORM.init>[0];
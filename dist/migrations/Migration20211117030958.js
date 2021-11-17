"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20211117030958 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20211117030958 extends migrations_1.Migration {
    async up() {
        this.addSql('create table "post" ("id" serial primary key, "created_at" timestamptz(0) not null, "updated_at" timestamptz(0) not null, "title" text not null);');
    }
}
exports.Migration20211117030958 = Migration20211117030958;
//# sourceMappingURL=Migration20211117030958.js.map
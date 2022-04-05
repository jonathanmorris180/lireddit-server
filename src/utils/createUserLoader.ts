import DataLoader from "dataloader";
import { User } from "../entities/User";

export const createUserLoader = () =>
    new DataLoader<number, User>(async userIds => {
        const users = await User.findByIds(userIds as number[]);
        const userIdToUser: Record<number, User> = {};
        users.forEach(u => {
            userIdToUser[u.id] = u;
        });

        console.log("userIds", userIds);
        console.log("userIdToUser", userIdToUser);
        // create an array from the userIdToUser object in the same order as the userIds came in
        const returnValue = userIds.map(userId => userIdToUser[userId]);
        console.log("returnValue: " + JSON.stringify(returnValue));
        return returnValue;
    });

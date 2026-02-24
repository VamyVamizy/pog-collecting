const bannedList = [];

module.exports = {
    getBannedList: () => {
        return bannedList;
    },
    addBannedUser: (user) => {
        bannedList.push(user);
    },
    removeBannedUser: (user) => {
        const index = bannedList.indexOf(user);
        if (index > -1) {
            bannedList.splice(index, 1);
        }
    }
};
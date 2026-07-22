const { handleDeletionEvent } = require('../utils/antiNuke');

module.exports = {
    execute(role, client) {
        if (!role.guild) return;
        handleDeletionEvent(role, client, 'cargo');
    }
};

const { handleDeletionEvent } = require('../utils/antiNuke');

module.exports = {
    execute(channel, client) {
        if (!channel.guild) return;
        handleDeletionEvent(channel, client, 'channel');
    }
};

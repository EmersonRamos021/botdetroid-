const { MediaGalleryBuilder, ThumbnailBuilder, FileBuilder, ComponentType } = require('discord.js');
console.log('MediaGallery methods:', MediaGalleryBuilder ? Object.getOwnPropertyNames(MediaGalleryBuilder.prototype) : 'Not found');
console.log('Thumbnail methods:', ThumbnailBuilder ? Object.getOwnPropertyNames(ThumbnailBuilder.prototype) : 'Not found');
console.log('File methods:', FileBuilder ? Object.getOwnPropertyNames(FileBuilder.prototype) : 'Not found');

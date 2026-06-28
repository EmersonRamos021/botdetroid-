const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ComponentType } = require('discord.js');
console.log('Container methods:', Object.getOwnPropertyNames(ContainerBuilder.prototype));
console.log('Section methods:', Object.getOwnPropertyNames(SectionBuilder.prototype));
console.log('TextDisplay methods:', Object.getOwnPropertyNames(TextDisplayBuilder.prototype));
console.log('ComponentTypes:', Object.keys(ComponentType));

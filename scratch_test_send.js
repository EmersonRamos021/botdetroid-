require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  AttachmentBuilder,
  MessageFlags
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.first();
  const channel = guild.channels.cache.find(c => c.isTextBased());
  
  if (!channel) process.exit(1);

  const attachment = new AttachmentBuilder('./assets/banner_status.png', { name: 'banner_status.png' });

  const container = new ContainerBuilder()
    .setAccentColor(0x2B2D31)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://banner_status.png')
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 🚀 CONECTE-SE')
    );

  try {
    await channel.send({
      components: [container],
      files: [attachment],
      flags: [MessageFlags.IsComponentsV2]
    });
    console.log('Mensagem V2 com MediaGallery enviada com sucesso');
  } catch (error) {
    console.error('Erro:', error);
  }
  
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);

const { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  MessageFlags
} = require('discord.js');

const container = new ContainerBuilder()
  .setAccentColor(0x2B2D31)
  .addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🚀 CONECTE-SE\n| Acompanhe o status do servidor em tempo real')
  )
  .addTextDisplayComponents(
    new TextDisplayBuilder().setContent('---\n**STATUS**\n🟢 Online\n\n**IP MTA:**\n\`\`\`connect mtasa://jogar.complexorp.com.br\`\`\`')
  )
  .addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Loja').setStyle(ButtonStyle.Link).setURL('https://loja'),
      new ButtonBuilder().setLabel('Instagram').setStyle(ButtonStyle.Link).setURL('https://insta')
    )
  )
  .addTextDisplayComponents(
    new TextDisplayBuilder().setContent('---\n⏳ Atualizado a cada 2 minutos - 22:12:56')
  );

console.log(JSON.stringify(container.toJSON(), null, 2));

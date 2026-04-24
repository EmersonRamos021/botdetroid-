const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('falar')
        .setDescription('Envia uma mensagem (e/ou anexo) no canal atual como o bot (privacidade Staff).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option => 
            option.setName('mensagem')
                .setDescription('A mensagem de texto a ser enviada')
                .setRequired(false)
        )
        .addAttachmentOption(option => 
            option.setName('anexo')
                .setDescription('Envie uma imagem, vídeo ou outro arquivo')
                .setRequired(false)
        ),

    async execute(interaction) {
        const mensagem = interaction.options.getString('mensagem');
        const anexo = interaction.options.getAttachment('anexo');

        // Impede o envio se não houver mensagem nem anexo
        if (!mensagem && !anexo) {
            return interaction.reply({ 
                content: '❌ **Erro:** Você precisa fornecer pelo menos uma \`mensagem\` ou um \`anexo\`.', 
                ephemeral: true 
            });
        }

        const payload = {};
        if (mensagem) payload.content = mensagem;
        if (anexo) payload.files = [anexo.url];

        // Responde de forma ephmeral para a staff e manda a mensagem global pro ticket/canal
        try {
            await interaction.channel.send(payload);
            await interaction.reply({ 
                content: '✅ Sua mensagem foi enviada anonimamente através do bot!', 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Erro ao usar o comando /falar:', error);
            await interaction.reply({ 
                content: '❌ Ocorreu um erro ao tentar enviar sua mensagem pelo bot. Verifique as permissões do canal.', 
                ephemeral: true 
            });
        }
    },
};

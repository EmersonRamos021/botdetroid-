const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

const anexoCache = new Map();

module.exports = {
    anexoCache,
    data: new SlashCommandBuilder()
        .setName('falar')
        .setDescription('Envia uma mensagem (e/ou anexo) no canal atual como o bot (privacidade Staff).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option => 
            option.setName('mensagem')
                .setDescription('Mensagem rápida. Para texto longo com quebras de linha, DEIXE EM BRANCO!')
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

        // Se o usuário NÃO preencheu a mensagem, abrimos o Modal para texto longo
        if (!mensagem) {
            const modalId = `modal_falar_${interaction.id}`;
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle('Mensagem Formatada');

            const textInput = new TextInputBuilder()
                .setCustomId('texto_longo')
                .setLabel('Cole seu texto (suporta quebras de linha):')
                .setPlaceholder('Escreva a mensagem...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(!anexo) // Opcional se tiver anexo
                .setMaxLength(4000);

            modal.addComponents(new ActionRowBuilder().addComponents(textInput));

            if (anexo) {
                anexoCache.set(interaction.id, anexo.url);
                // Limpa o cache após 10 minutos por segurança
                setTimeout(() => anexoCache.delete(interaction.id), 10 * 60 * 1000);
            }

            await interaction.showModal(modal);
            return;
        }

        const payload = { content: mensagem.replace(/\\n/g, '\n') };
        if (anexo) payload.files = [anexo.url];

        try {
            await interaction.channel.send(payload);
            await interaction.reply({ 
                content: '✅ Sua mensagem foi enviada anonimamente através do bot!', 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Erro ao usar o comando /falar:', error);
            await interaction.reply({ 
                content: '❌ Ocorreu um erro ao tentar enviar sua mensagem pelo bot.', 
                ephemeral: true 
            });
        }
    },
};

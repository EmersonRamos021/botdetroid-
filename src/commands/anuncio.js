const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Envia uma mensagem personalizada em formato de Embed.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option => 
            option.setName('canal')
                .setDescription('O canal onde o anúncio será enviado.')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('titulo')
                .setDescription('O título principal do anúncio.')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('descricao')
                .setDescription('O texto principal (use \\n para quebrar linha).')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('cor')
                .setDescription('A cor do painel em HEX (Ex: #ff0000 para vermelho).')
                .setRequired(false))
        .addAttachmentOption(option => 
            option.setName('imagem')
                .setDescription('Uma imagem grande para ficar no final do anúncio.')
                .setRequired(false))
        .addAttachmentOption(option => 
            option.setName('miniatura')
                .setDescription('Uma imagem pequena para ficar no canto superior direito.')
                .setRequired(false)),
                
    async execute(interaction) {
        // Obter os valores inseridos pelo staff
        const canal = interaction.options.getChannel('canal');
        const titulo = interaction.options.getString('titulo');
        const descricao = interaction.options.getString('descricao').replace(/\\n/g, '\n');
        const cor = interaction.options.getString('cor') || '#ffcc00'; // Amarelo padrão Detroit
        const imagem = interaction.options.getAttachment('imagem');
        const miniatura = interaction.options.getAttachment('miniatura');

        // Construir o Embed
        const embed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descricao)
            .setColor(cor)
            .setTimestamp()
            .setFooter({ text: `Anúncio publicado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // Adicionar imagens se foram anexadas
        if (imagem) {
            // Verificar se o arquivo anexado é realmente uma imagem
            if (imagem.contentType && imagem.contentType.startsWith('image/')) {
                embed.setImage(imagem.url);
            } else {
                return interaction.reply({ content: '❌ O arquivo enviado em `imagem` não é uma imagem válida.', ephemeral: true });
            }
        }

        if (miniatura) {
            if (miniatura.contentType && miniatura.contentType.startsWith('image/')) {
                embed.setThumbnail(miniatura.url);
            } else {
                return interaction.reply({ content: '❌ O arquivo enviado em `miniatura` não é uma imagem válida.', ephemeral: true });
            }
        }

        try {
            // Enviar o embed no canal selecionado
            await canal.send({ embeds: [embed] });

            // Responder ao staff confirmando o envio
            await interaction.reply({ content: `✅ Anúncio enviado com sucesso no canal ${canal}!`, ephemeral: true });
        } catch (error) {
            console.error('Erro ao enviar anúncio:', error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao tentar enviar o anúncio. Verifique se o bot tem permissão de enviar mensagens naquele canal.', ephemeral: true });
        }
    }
};

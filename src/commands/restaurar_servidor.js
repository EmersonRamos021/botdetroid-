const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restaurar_servidor')
        .setDescription('PERIGO: Restaura canais, categorias e cargos a partir de um backup .json')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addAttachmentOption(option => 
            option.setName('arquivo_backup')
                .setDescription('O arquivo server_structure.json gerado pelo backup automágico')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Apenas o OWNER do bot ou o Owner do server devem poder rodar isso para segurança extrema
        if (interaction.user.id !== interaction.guild.ownerId && interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '❌ Apenas o dono do servidor pode usar este comando de nível Nuke.', ephemeral: true });
        }

        const attachment = interaction.options.getAttachment('arquivo_backup');
        if (!attachment.name.endsWith('.json')) {
            return interaction.reply({ content: '❌ O arquivo precisa ser um .json válido de backup.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Fazer fetch do arquivo
            const response = await fetch(attachment.url);
            const serverData = await response.json();

            if (!serverData.channels || !serverData.categories || !serverData.roles) {
                return interaction.editReply({ content: '❌ O arquivo JSON fornecido não é um backup de servidor válido.' });
            }

            await interaction.editReply({ content: '⏳ Iniciando a Restauração Total. Isso pode demorar vários minutos devido aos limites de taxa do Discord (Rate Limits)...' });

            const guild = interaction.guild;
            
            // 1. Restaurar Cargos
            for (const roleData of serverData.roles.reverse()) { // reverse para manter ordem original de hierarquia de baixo pra cima
                // Verifica se já existe um cargo com mesmo nome para não duplicar se já existir
                const exists = guild.roles.cache.find(r => r.name === roleData.name);
                if (!exists) {
                    try {
                        await guild.roles.create({
                            name: roleData.name,
                            color: roleData.color,
                            hoist: roleData.hoist,
                            mentionable: roleData.mentionable,
                            permissions: BigInt(roleData.permissions)
                        });
                        await new Promise(resolve => setTimeout(resolve, 500)); // Sleep anti rate-limit
                    } catch (e) {
                        console.error('Erro ao recriar cargo', roleData.name, e.message);
                    }
                }
            }

            // 2. Restaurar Categorias e Canais
            for (const catData of serverData.categories) {
                try {
                    const category = await guild.channels.create({
                        name: catData.name,
                        type: 4, // GuildCategory
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));

                    for (const childData of catData.children) {
                        await guild.channels.create({
                            name: childData.name,
                            type: childData.type,
                            parent: category.id,
                            topic: childData.topic,
                            nsfw: childData.nsfw,
                            rateLimitPerUser: childData.rateLimitPerUser
                        });
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (e) {
                    console.error('Erro ao recriar categoria', catData.name, e.message);
                }
            }

            // 3. Restaurar canais sem categoria
            for (const childData of serverData.channels) {
                try {
                    await guild.channels.create({
                        name: childData.name,
                        type: childData.type,
                        topic: childData.topic,
                        nsfw: childData.nsfw,
                        rateLimitPerUser: childData.rateLimitPerUser
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (e) {
                    console.error('Erro ao recriar canal sem categoria', childData.name, e.message);
                }
            }

            await interaction.followUp({ content: '✅ **Restauração Concluída!** Cargos e Canais foram recriados na medida do possível.', ephemeral: true });

        } catch (e) {
            console.error(e);
            await interaction.editReply({ content: '❌ Falha catastrófica ao tentar restaurar: ' + e.message });
        }
    }
};

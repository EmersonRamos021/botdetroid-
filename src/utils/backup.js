const mysqldump = require('mysqldump');
const { AttachmentBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

/**
 * Função para parsear a URL do banco de dados para o mysqldump
 */
function parseDbUrl(urlStr) {
    const url = new URL(urlStr);
    return {
        host: url.hostname,
        port: url.port ? parseInt(url.port) : 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.replace('/', '')
    };
}

/**
 * Realiza o backup completo do Servidor Discord (Canais, Categorias, Cargos)
 * e o backup do Banco de Dados MySQL. Envia ambos no logChannel.
 */
async function performFullBackup(client) {
    try {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return console.log('❌ Guilda não encontrada para backup.');

        const logChannel = guild.channels.cache.get(config.logChannelId);
        if (!logChannel) return console.log('❌ Canal de logs não encontrado para enviar o backup.');

        const tempDir = path.join(__dirname, '../../temp');
        await fs.mkdir(tempDir, { recursive: true }).catch(() => {});

        const dbFile = path.join(tempDir, `db_backup_${Date.now()}.sql`);
        const serverFile = path.join(tempDir, `server_backup_${Date.now()}.json`);

        // ==========================================
        // 1. BACKUP DO BANCO DE DADOS
        // ==========================================
        const dbConfig = parseDbUrl(process.env.DATABASE_URL);
        dbConfig.ssl = { rejectUnauthorized: false }; // Necessário para bancos como PlanetScale
        
        await mysqldump({
            connection: dbConfig,
            dumpToFile: dbFile,
        });

        // ==========================================
        // 2. BACKUP DO SERVIDOR DISCORD
        // ==========================================
        const serverData = {
            name: guild.name,
            icon: guild.iconURL(),
            roles: [],
            categories: [],
            channels: []
        };

        // Salvar Cargos
        guild.roles.cache.sort((a, b) => b.position - a.position).forEach(role => {
            if (!role.managed && role.id !== guild.id) { // Ignora roles de bot e @everyone
                serverData.roles.push({
                    name: role.name,
                    color: role.color,
                    hoist: role.hoist,
                    permissions: role.permissions.bitfield.toString(),
                    mentionable: role.mentionable
                });
            }
        });

        // Salvar Canais e Categorias
        const channels = guild.channels.cache;
        channels.filter(c => c.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position).forEach(cat => {
            const categoryData = {
                name: cat.name,
                permissions: cat.permissionOverwrites.cache.map(p => ({
                    id: p.id,
                    type: p.type,
                    allow: p.allow.bitfield.toString(),
                    deny: p.deny.bitfield.toString()
                })),
                children: []
            };

            // Pegar canais dentro desta categoria
            channels.filter(c => c.parentId === cat.id).sort((a, b) => a.position - b.position).forEach(child => {
                categoryData.children.push({
                    name: child.name,
                    type: child.type,
                    topic: child.topic,
                    nsfw: child.nsfw,
                    rateLimitPerUser: child.rateLimitPerUser,
                    permissions: child.permissionOverwrites.cache.map(p => ({
                        id: p.id,
                        type: p.type,
                        allow: p.allow.bitfield.toString(),
                        deny: p.deny.bitfield.toString()
                    }))
                });
            });

            serverData.categories.push(categoryData);
        });

        // Canais sem categoria
        channels.filter(c => !c.parentId && c.type !== ChannelType.GuildCategory).sort((a, b) => a.position - b.position).forEach(child => {
            serverData.channels.push({
                name: child.name,
                type: child.type,
                topic: child.topic,
                nsfw: child.nsfw,
                rateLimitPerUser: child.rateLimitPerUser,
                permissions: child.permissionOverwrites.cache.map(p => ({
                    id: p.id,
                    type: p.type,
                    allow: p.allow.bitfield.toString(),
                    deny: p.deny.bitfield.toString()
                }))
            });
        });

        await fs.writeFile(serverFile, JSON.stringify(serverData, null, 2), 'utf-8');

        // ==========================================
        // 3. ENVIAR PARA O DISCORD
        // ==========================================
        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('📦 Backup Automático Concluído')
            .setDescription(`Foi gerado um backup completo do **Banco de Dados** e da **Estrutura do Servidor Discord**.\n\nGuarde estes arquivos em segurança! Em caso de emergência (Ataque/Nuke), utilize o comando \`/restaurar_servidor\` anexando o arquivo \`.json\`.`)
            .setTimestamp();

        const sqlAttachment = new AttachmentBuilder(dbFile, { name: 'database_backup.sql' });
        const jsonAttachment = new AttachmentBuilder(serverFile, { name: 'server_structure.json' });

        await logChannel.send({
            embeds: [embed],
            files: [sqlAttachment, jsonAttachment]
        });

        // Limpar arquivos temporários
        await fs.unlink(dbFile).catch(() => {});
        await fs.unlink(serverFile).catch(() => {});

        console.log('✅ Backup diário finalizado e enviado para o Discord.');
        return true;
    } catch (e) {
        console.error('❌ Erro ao realizar o backup:', e);
        return false;
    }
}

module.exports = {
    performFullBackup
};

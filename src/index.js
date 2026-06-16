const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const { initDatabase, getPool } = require('./utils/database');
const { loadSettingsCache } = require('./utils/settings');
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');
const messageCreateEvent = require('./events/messageCreate');
const guildMemberAddEvent = require('./events/guildMemberAdd');

// ═══════════════════════════════════════
// VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
// ═══════════════════════════════════════
const requiredEnvs = ['DISCORD_TOKEN', 'CLIENT_ID', 'DATABASE_URL'];
const missingEnvs = requiredEnvs.filter((key) => !process.env[key]);

if (missingEnvs.length > 0) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Variáveis de ambiente obrigatórias ausentes:');
    missingEnvs.forEach((key) => console.error(`   • ${key}`));
    console.error('\nCopie o .env.example para .env e preencha os valores.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
}

// Criar cliente do Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Coleção de comandos
client.commands = new Collection();

// Carregar comandos
const setupAtendimento = require('./commands/setup-atendimento');
const setupDenuncias = require('./commands/setup-denuncias');
const configCommand = require('./commands/config');
const limparCommand = require('./commands/limpar');
const trancarCommand = require('./commands/trancar');
const destrancarCommand = require('./commands/destrancar');
const falarCommand = require('./commands/falar');
const enqueteCommand = require('./commands/enquete');
const atualizacaoCommand = require('./commands/atualizacao');
const setupStatusCommand = require('./commands/setup-status');

client.commands.set(setupAtendimento.data.name, setupAtendimento);
client.commands.set(setupDenuncias.data.name, setupDenuncias);
client.commands.set(configCommand.data.name, configCommand);
client.commands.set(limparCommand.data.name, limparCommand);
client.commands.set(trancarCommand.data.name, trancarCommand);
client.commands.set(destrancarCommand.data.name, destrancarCommand);
client.commands.set(falarCommand.data.name, falarCommand);
client.commands.set(enqueteCommand.data.name, enqueteCommand);
client.commands.set(atualizacaoCommand.data.name, atualizacaoCommand);
client.commands.set(setupStatusCommand.data.name, setupStatusCommand);

// Registrar eventos
client.once('ready', () => readyEvent(client));
client.on('interactionCreate', (interaction) => interactionCreateEvent(client, interaction));
client.on('messageCreate', (message) => messageCreateEvent(client, message));
client.on('guildMemberAdd', (member) => guildMemberAddEvent(client, member));

// ═══════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════
async function gracefulShutdown(signal) {
    console.log(`\n🔄 Sinal ${signal} recebido. Desligando graciosamente...`);
    try {
        client.destroy();
        console.log('✅ Cliente Discord desconectado.');
    } catch (e) {
        console.error('⚠️ Erro ao desconectar Discord:', e.message);
    }
    try {
        await getPool().end();
        console.log('✅ Pool MySQL encerrado.');
    } catch (e) {
        console.error('⚠️ Erro ao encerrar pool MySQL:', e.message);
    }
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ═══════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════
(async () => {
    try {
        console.log('🔄 Inicializando banco de dados MySQL...');
        await initDatabase();

        console.log('🔄 Carregando configurações...');
        await loadSettingsCache();

        // Auto-reload settings every 60 seconds so it reflects Admin Panel changes
        setInterval(async () => {
            try {
                const settings = await loadSettingsCache();
                
                // Checa se o painel admin solicitou alteração de avatar
                if (settings.botAvatarUrl) {
                    try {
                        console.log('🔄 Atualizando avatar do bot via Painel Admin...');
                        await client.user.setAvatar(settings.botAvatarUrl);
                        console.log('✅ Avatar do bot atualizado com sucesso!');
                    } catch (err) {
                        console.error('❌ Erro ao atualizar avatar do bot (rate limit?):', err.message);
                    } finally {
                        const { removeSetting } = require('./utils/settings');
                        await removeSetting('botAvatarUrl');
                    }
                }
            } catch (e) {
                console.error('Erro no auto-reload das configurações:', e.message);
            }
        }, 60000);

        console.log('🔄 Conectando ao Discord...');
        await client.login(config.token);

        console.log('💡 Para registrar/atualizar slash commands, execute: npm run deploy');
    } catch (error) {
        console.error('❌ Erro fatal na inicialização:', error.message);
        process.exit(1);
    }
})();

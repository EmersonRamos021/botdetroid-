const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const config = require('./config');
const { initDatabase } = require('./utils/database');
const { loadSettingsCache } = require('./utils/settings');
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');

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

client.commands.set(setupAtendimento.data.name, setupAtendimento);
client.commands.set(setupDenuncias.data.name, setupDenuncias);
client.commands.set(configCommand.data.name, configCommand);

// Registrar eventos
client.once('ready', async () => {
    readyEvent(client);

    // Auto-registrar slash commands em todos os servidores
    try {
        const rest = new REST({ version: '10' }).setToken(config.token);
        const commands = [
            setupAtendimento.data.toJSON(),
            setupDenuncias.data.toJSON(),
            configCommand.data.toJSON(),
        ];

        for (const guild of client.guilds.cache.values()) {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, guild.id),
                { body: commands },
            );
            console.log(`📌 Comandos registrados em: ${guild.name} (${guild.id})`);
        }
    } catch (error) {
        console.error('❌ Erro ao registrar comandos automaticamente:', error.message);
        console.error('Execute manualmente: npm run deploy');
    }
});

client.on('interactionCreate', (interaction) => interactionCreateEvent(client, interaction));

// Inicialização: Banco de dados → Settings → Login
(async () => {
    try {
        console.log('🔄 Inicializando banco de dados MySQL...');
        await initDatabase();

        console.log('🔄 Carregando configurações...');
        await loadSettingsCache();

        console.log('🔄 Conectando ao Discord...');
        await client.login(config.token);
    } catch (error) {
        console.error('❌ Erro fatal na inicialização:', error.message);
        process.exit(1);
    }
})();

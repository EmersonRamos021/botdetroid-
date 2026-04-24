const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enquete')
        .setDescription('Cria uma enquete oficial do Discord através do bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option => 
            option.setName('pergunta')
                .setDescription('Qual é a pergunta da enquete?')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('op1')
                .setDescription('Primeira opção')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('op2')
                .setDescription('Segunda opção')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('op3')
                .setDescription('Terceira opção (opcional)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('op4')
                .setDescription('Quarta opção (opcional)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('op5')
                .setDescription('Quinta opção (opcional)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duracao')
                .setDescription('Duração da enquete (padrão: 24 horas)')
                .addChoices(
                    { name: '1 Hora', value: 1 },
                    { name: '4 Horas', value: 4 },
                    { name: '8 Horas', value: 8 },
                    { name: '24 Horas', value: 24 },
                    { name: '3 Dias', value: 72 },
                    { name: '1 Semana', value: 168 }
                )
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('multiplas')
                .setDescription('Permitir várias respostas? (Padrão: Falso)')
                .setRequired(false)),

    async execute(interaction) {
        const pergunta = interaction.options.getString('pergunta');
        const op1 = interaction.options.getString('op1');
        const op2 = interaction.options.getString('op2');
        const op3 = interaction.options.getString('op3');
        const op4 = interaction.options.getString('op4');
        const op5 = interaction.options.getString('op5');
        const duracao = interaction.options.getInteger('duracao') || 24;
        const multiplas = interaction.options.getBoolean('multiplas') ?? false;

        // Limpa opções nulas e formata pro padrão do Discord ({ text: '...' })
        const respostasRaw = [op1, op2, op3, op4, op5].filter(Boolean);
        const formatAnswers = respostasRaw.map(r => ({ text: r }));

        try {
            await interaction.channel.send({
                poll: {
                    question: { text: pergunta },
                    answers: formatAnswers,
                    duration: duracao,
                    allowMultiselect: multiplas
                }
            });

            await interaction.reply({
                content: '📊 Enquete oficial criada com sucesso!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Erro ao criar enquete:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao criar a enquete. \n(Nota: Certifique-se que o pacote discord.js suporta enquetes se falhar).',
                ephemeral: true
            });
        }
    },
};

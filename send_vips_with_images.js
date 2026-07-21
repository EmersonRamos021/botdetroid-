const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const CHANNEL_ID = "1479578703687057560";
const IMAGES_DIR = path.resolve("C:/Users/emers/Documents/dev/projetos/detroid/imagens");

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) {
            console.error("Canal não encontrado!");
            process.exit(1);
        }

        // Limpar mensagens anteriores enviadas pelo próprio bot neste canal
        try {
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(m => m.author.id === client.user.id);
            for (const msg of botMessages.values()) {
                await msg.delete();
            }
            console.log(`Mensagens antigas do bot limpas (${botMessages.size}).`);
        } catch (e) {
            console.warn("Não foi possível limpar mensagens antigas (permissão ou canal limpo):", e.message);
        }

        // Criar os anexos
        const fileBasic = new AttachmentBuilder(path.join(IMAGES_DIR, 'vip_basic_123456.png.png'), { name: 'vip_basic.png' });
        const fileEclipse = new AttachmentBuilder(path.join(IMAGES_DIR, 'vip_eclipse.png'), { name: 'vip_eclipse.png' });
        const fileDiamond = new AttachmentBuilder(path.join(IMAGES_DIR, 'vip_diamond.png'), { name: 'vip_diamond.png' });
        const fileRoyal = new AttachmentBuilder(path.join(IMAGES_DIR, 'vip_royal.png'), { name: 'vip_royal.png' });
        const fileAura = new AttachmentBuilder(path.join(IMAGES_DIR, 'vip_aura.png'), { name: 'vip_aura.png' });

        // Embed Principal / Header
        const headerEmbed = new EmbedBuilder()
            .setTitle("💎 DETROIT ROLEPLAY • PACOTES E ASSINATURAS VIP")
            .setDescription(
                "Garanta seu passe VIP em nossa Loja Oficial e domine as ruas de **Detroit Roleplay**! Elevando o seu nível com salários semanais, carros exclusivos, bônus milionários em dinheiro virtual e prioridade total na fila de conexão.\n\n" +
                "⚡ **Entrega 100% Automática:** Todos os pacotes são ativados instantaneamente no servidor assim que o pagamento for aprovado em nosso site."
            )
            .setColor("#e11d48");

        // Embed VIP Basic
        const basicEmbed = new EmbedBuilder()
            .setTitle("🤍 VIP BASIC • R$ 15,00")
            .setDescription(
                "```• Bônus inicial: R$ 100.000 em dinheiro virtual\n• Salário VIP semanal\n• Benefícios iniciais essenciais e vantagens in-game```"
            )
            .setColor("#e5e7eb")
            .setThumbnail("attachment://vip_basic.png");

        // Embed VIP Eclipse
        const eclipseEmbed = new EmbedBuilder()
            .setTitle("💜 VIP ECLIPSE • R$ 30,00")
            .setDescription(
                "```• Bônus inicial: R$ 250.000 em dinheiro virtual\n• Salário VIP aprimorado\n• Acesso a veículos exclusivos de garagem```"
            )
            .setColor("#a855f7")
            .setThumbnail("attachment://vip_eclipse.png");

        // Embed VIP Diamond
        const diamondEmbed = new EmbedBuilder()
            .setTitle("💙 VIP DIAMOND • R$ 50,00")
            .setDescription(
                "```• Bônus inicial: R$ 750.000 em dinheiro virtual\n• Benefícios Diamond completos\n• Prioridade na fila de conexão e vantagens de elite```"
            )
            .setColor("#3b82f6")
            .setThumbnail("attachment://vip_diamond.png");

        // Embed VIP Royal
        const royalEmbed = new EmbedBuilder()
            .setTitle("💚 VIP ROYAL • R$ 80,00")
            .setDescription(
                "```• Bônus inicial: R$ 1.250.000 em dinheiro virtual\n• Salário Royal de alto padrão\n• Acesso a veículos raríssimos e regalias de luxo```"
            )
            .setColor("#10b981")
            .setThumbnail("attachment://vip_royal.png");

        // Embed VIP Aura
        const auraEmbed = new EmbedBuilder()
            .setTitle("❤️ VIP AURA • R$ 120,00")
            .setDescription(
                "```• Bônus inicial: R$ 2.500.000 em dinheiro virtual\n• O passe mais exclusivo de toda a cidade\n• Acesso irrestrito, status máximo e benefícios supremos```"
            )
            .setColor("#f43f5e")
            .setThumbnail("attachment://vip_aura.png")
            .setFooter({ text: "Detroit Roleplay • Loja Oficial 100% Automática" })
            .setTimestamp();

        // Botão de compra
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("🛒 ACESSAR LOJA OFICIAL E COMPRAR VIP")
                .setURL("https://detroitroleplay.com/")
                .setStyle(ButtonStyle.Link)
        );

        // Enviar tudo na mesma mensagem com os anexos
        await channel.send({
            embeds: [headerEmbed, basicEmbed, eclipseEmbed, diamondEmbed, royalEmbed, auraEmbed],
            files: [fileBasic, fileEclipse, fileDiamond, fileRoyal, fileAura],
            components: [row]
        });

        console.log("Anúncio VIP com imagens enviado com sucesso!");
        process.exit(0);
    } catch (error) {
        console.error("Erro ao enviar anúncio com imagens:", error);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);

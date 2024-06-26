const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Intents para voz
    ] 
});

const token = process.env.TOKEN;  // Substitua pelo seu token do Discord
const mongoURI = process.env.MONGODB_URI;  // Substitua pela sua string de conexão do MongoDB

// Conexão com o MongoDB
mongoose.connect(mongoURI)
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error(err));

// Importe o modelo Autorole
const Autorole = require('./Models/Autorole');

// Configurar coleção de comandos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'Comandos');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('Bot está online!');
});

// Evento para adicionar cargos automaticamente a novos membros
client.on('guildMemberAdd', async member => {
    const autorole = await Autorole.findOne({ guildId: member.guild.id });
    if (autorole && autorole.roleId) {
        const role = member.guild.roles.cache.get(autorole.roleId);
        if (role) {
            await member.roles.add(role);
            console.log(`O cargo ${role.name} foi atribuído a ${member.user.tag}`);
        } else {
            console.log(`O cargo configurado não foi encontrado no servidor.`);
        }
    } else {
        console.log(`Não há cargo de autorole configurado para este servidor.`);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const prefix = '!';  // Prefixo para os comandos
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('Houve um erro ao tentar executar esse comando.');
    }
});

client.login(token);
// Libraries
import { create } from 'venom-bot'
import * as dotenv from 'dotenv'
import { Configuration, OpenAIApi } from "openai"

// My Modules
import * as cmdList from './data/cmdList.js';
import * as GPTraining from './functions/gpt/trainingGPT.js';



//        /\\\\\\\\\\\\   /\\\\\\\\\\\\\    /\\\\\\\\\\\\\\\                              /\\\\\\       
//        /\\\//////////  \/\\\/////////\\\ \///////\\\/////                              \////\\\      
//        /\\\             \/\\\       \/\\\       \/\\\                                      \/\\\      
//        \/\\\    /\\\\\\\ \/\\\\\\\\\\\\\/        \/\\\           /\\\\\        /\\\\\       \/\\\    
//         \/\\\   \/////\\\ \/\\\/////////          \/\\\         /\\\///\\\    /\\\///\\\     \/\\\   
//          \/\\\       \/\\\ \/\\\                   \/\\\        /\\\  \//\\\  /\\\  \//\\\    \/\\\  
//           \/\\\       \/\\\ \/\\\                   \/\\\       \//\\\  /\\\  \//\\\  /\\\     \/\\\
//            \//\\\\\\\\\\\\/  \/\\\                   \/\\\        \///\\\\\/    \///\\\\\/    /\\\\\\\\\
//              \////////////    \///                    \///           \/////        \/////     \/////////


// CFG

let runGPTool = true; // Liga e Desliga o GPTool
let runGPT = true; // Liga e Desliga a funcionalidade do GPT
let runDALLE = true; // Liga e Desliga a funcionalidade do DALL-E
let GPT_OnAnyMessage = true; // Roda o Gpt mesmo sem o uso do prefixo .bot | Por padrão: false
let ignoreBotMessages = false; // Ignora as mensagens enviadas pelo número do bot | Diminui o esforço computacional 
let showMessagesInfo = true;  // Mostra as informações das mensagens (Hora, fromNumber e toNumber)
let showMessagesText = false; // Mostra conteúdo das mensagens enviadas


//                                                           Initiate Bot

// variables declaration
let userNumber, group;
let helpedFunction;

// picking date time
let date = new Date();
const currentDate = (datetime = date) => {
    return datetime.toLocaleTimeString()
}

// take information from .env
dotenv.config()

// Initiate Whatsapp Bot
create({
    session: 'KikoBot',
    multidevice: true,
    headless: false
})
    .then((client) => start(client))
    .catch((erro) => {
        console.log(erro);
    });

// Initiate OpenAI   
const configuration = new Configuration({
    organization: process.env.ORGANIZATION_ID,
    apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);
let workingOpenAI = true;

// Send Text Function
const send = (client, message, text) => {
    client.sendText(message.from === process.env.BOT_NUMBER ? message.to : message.from, text);
}

//                                                            Functions
const fc = {

    MISC: {

        eStatus: (variable, type = "check") => {

            let t;
            let f;

            if (type === "check") {
                t = "✅";
                f = "❌";
            } else if (type === "circle") {
                t = "🟢";
                f = "🔴";
            }

            if (variable) {
                return t
            } else if (!variable) {
                return f
            } else {
                return "Error"
            }

        }

    },

    CFG: {

        run: (client, message) => {

            //---------- helpText
            if (message.body === "cfg") {
                let helpText = `🤖 *GPTool Configs* \n\n${fc.MISC.eStatus(runGPTool, "circle")} cfg gptool run \n⎹\n⎿${fc.MISC.eStatus(runGPT)} cfg gpt run \n⎿${fc.MISC.eStatus(runDALLE)} cfg dalle run \n⎿${fc.MISC.eStatus(GPT_OnAnyMessage)} cfg gpt onanymessage \n⎿${fc.MISC.eStatus(ignoreBotMessages)} cfg ignorebotmessages \n⎿${fc.MISC.eStatus(showMessagesInfo)} cfg showmessagesinfo \n⎿${fc.MISC.eStatus(showMessagesText)} cfg showmessagestext`;
                send(client, message, helpText)
            }

            const command = message.text.substring(0, message.text.indexOf(" ")); // primeira palavra do texto como comando
            const bodytext = message.text.substring(message.text.indexOf(" ")); // resto da sentença

            if (command === "cfg") {

                let cfg_select

                // GPT On Any Message
                if (bodytext === " gpt onanymessage") { 
                    GPT_OnAnyMessage = !GPT_OnAnyMessage;
                    cfg_select = "GPT_OnAnyMessage: " + GPT_OnAnyMessage;
                }
                // Ignore Bot Messages
                else if (bodytext === " ignorebotmessages") {
                    ignoreBotMessages = !ignoreBotMessages;
                    cfg_select = "ignoreBotMessages: " + ignoreBotMessages;
                }
                // Show Messages Info
                else if (bodytext === " showmessagesinfo") {
                    showMessagesInfo = !showMessagesInfo;
                    cfg_select = "showMessagesInfo: " + showMessagesInfo;
                }
                // Show Messages Text
                else if (bodytext === " showmessagestext") {
                    showMessagesText = !showMessagesText;
                    cfg_select = "showMessagesText: " + showMessagesText;
                }
                // Run GPT
                else if (bodytext === " gpt run") {
                    runGPT = !runGPT;
                    cfg_select = `runGPT: ${runGPT}`;
                }
                // Run DALL-E
                else if (bodytext === " dalle run") {
                    runDALLE = !runDALLE;
                    cfg_select = `runDALLE: ${runDALLE}`;
                }
                // Run GPTool
                else if (bodytext === " gptool run") {
                    runGPTool = !runGPTool
                    cfg_select = `runGPTool: ${runGPTool}`;
                }

                // Result
                let cfg_text = " 🤖 CFG: " + cfg_select;
                send(client, message, cfg_text);
                console.log(currentDate() + " 🟡" + " " + cfg_text + "-> " + message.from);

            }

        }

    },

    GPT: {

        GPTurbo: async (clientText, profile=1) => {
            workingOpenAI = true;
            // const trainedSystem = fc.GPT.Training();
            const trainedSystem = GPTraining.profile(profile);
            try {
                //console.log("🟡" + " Abrindo openAI");
                const response = await Promise.race([
                    openai.createChatCompletion({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: trainedSystem },
                            { role: "user", content: clientText },
                        ], max_tokens: 1000
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI opening Timeout ' + currentDate())), 60000)),
                ])
                    .catch((error) => {
                        workingOpenAI = false;
                        console.error(error);
                    });
                if (workingOpenAI) {
                    const result = response.data.choices[0].message.content;
                    return `${result}`
                }
            } catch (e) {
                return `${currentDate()} ❌ OpenAI Response Error: ${e.response.data.error.message}`
            }
        },

        run: (client, message, bodytext, profile) => {
            if (runGPT) {
                send(client, message, "_Digitando..._");
                const question = bodytext;
                fc.GPT.GPTurbo(question, profile).then((response) => {
                    if (workingOpenAI) {
                        send(client, message, response)
                    } else {
                        const gptTimeoutText = `😓 O tempo máximo foi excedido...\n\nA OpenAI pode estar com problemas de estabilidade..
                        \nVocê pode checar em: https://downdetector.com/status/openai`;
                        send(client, message, gptTimeoutText);
                    }
                    console.log(currentDate() + " 🟡" + " GPT: " + message.to);
                });
            } else {
                console.log(currentDate() + " 🟡" + " GPT Off: " + message.to);
                send(client, message, "😥 Desculpe,\n o GPT está desativado no momento.")
            }
        }

    },

    DALLE: {

        getDalleResponse: async (clientText) => {
            const options = {
                prompt: clientText, // Descrição da imagem
                n: 1, // Número de imagens a serem geradas
                size: "512x512", // Tamanho da imagem
            }

            try {
                const response = await openai.createImage(options);
                return response.data.data[0].url;
            } catch (error) {
                console.error(`${currentDate()} ❌ OpenAI Response Error: ${error.response.data.error.message}`);
                return "";
            }
        },

        run: (client, message, bodytext) => {
            if (runDALLE) {
                send(client, message, "Gerando imagem...")
                const imgDescription = bodytext;
                fc.DALLE.getDalleResponse(imgDescription, message)
                    .then((imgUrl) => {
                        if (imgUrl) {
                            client.sendImage(
                                message.from === process.env.BOT_NUMBER ? message.to : message.from,
                                imgUrl,
                                imgDescription,
                                'Imagem gerada por Inteligência Artificial.'
                            )
                            console.log(currentDate() + " 🟡" + " DALL-E: " + message.to);
                        }
                        else {
                            const error_text = "❌ Sua solicitação foi rejeitada como resultado do nosso sistema de segurança. ❌";
                            send(client, message, error_text)
                            console.log(currentDate() + " 🟡" + " ❌ DALL-E: " + message.to);
                        }
                    })
                    .catch(error => console.error(error + " " + currentDate()))
            } else {
                console.log(currentDate() + " 🟡" + " DALLE Off: " + message.to);
                send(client, message, "😥 Desculpe,\n o DALL-E está desativado no momento.")
            }
        }

    },

    DATA: {

        isGroup: (numberID) => {
            if (numberID.includes('g')) {
                return true;
            } else {
                return false;
            }
        },

        UserNumber: (message) => {
            const isGroup = fc.DATA.isGroup(message.from)
            if (!isGroup) {
                userNumber = message.from.split("@")[0];
                group = false;
            } else {
                userNumber = "Grupo";
                group = true;
            }
        }

    },

    TOOLS: {

        random: (client, message, bodytext, resultIco = "🔀 ") => {

            //---------- HelpText
            const helpText = "💡 _Exemplos de como usar a função escolha:_\n\n🔢 *intervalo de números*\n.escolha 1 - 100\n\n\🔤 *intervalo de letras*\n.escolha a - z\n\n🔀 *Sortear palavra*\n.escolha cenoura, laranja, abacate";

            //Declaração de variáveis
            let result = ""
            let resultIcon = resultIco

            // Manipulação da String
            const input = bodytext.trim().replace(/\s/g, ''); // remove espaços em branco
            const pieces = input.split("-"); // separa os inputs quando contém "-"

            // Cálculo da função
            if (pieces.length === 2) { // Input no formato de intervalo 

                const num1 = parseInt(pieces[0]);
                const num2 = parseInt(pieces[1]);
                result = String(Math.floor(Math.random() * (num2 - num1 + 1)) + num1);
                resultIcon = "🔢 ";

                if (result === "NaN") { // se não conseguiu, o formato é "letra - letra"
                    const letter1 = pieces[0].toLowerCase().charCodeAt(0);
                    const letter2 = pieces[1].toLowerCase().charCodeAt(0);
                    result = String.fromCharCode(Math.floor(Math.random() * (letter2 - letter1 + 1)) + letter1);
                    result = result.toUpperCase()
                    resultIcon = "🔤 ";
                }

            } else if (pieces.length === 1) { // input no formato de escolher uma opção ("palavra, palavra, palavra")
                const words = pieces[0].split(",");
                if (words.length !== 1) {
                    result = words[Math.floor(Math.random() * words.length)];
                }
            }

            //---------- Resultado

            if (result === "") { // Nenhum formato foi encontrado ✖️. Retorna help
                send(client, message, helpText);
                console.log(currentDate() + " 🟡" + " Random helpText: " + message.from);

            } else { // O formato foi encontrado ✔️. Retorna result
                const resultStr = resultIcon + "*" + result + "*"
                send(client, message, resultStr)
                console.log(currentDate() + " 🟡" + " Random: " + message.from);
            }
        }

    },

    GAMES: {

        rpsGame: (client, message, message_body) => {
            // variables
            const options = ['pedra', 'papel', 'tesoura'];
            const botChoice = options[Math.floor(Math.random() * options.length)];
            const playerChoice = message_body;
            let result = "";

            // game
            if (playerChoice === botChoice) {
                result = `Empate! 😑 \nNós dois escolhemos ${playerChoice}.`;
            }
            else if (
                (playerChoice === 'pedra' && botChoice === 'tesoura') ||
                (playerChoice === 'papel' && botChoice === 'pedra') ||
                (playerChoice === 'tesoura' && botChoice === 'papel')
            ) {
                result = `Você ganhou! 🏆 \n${playerChoice} ganha de ${botChoice}.`;
            }
            else {
                result = `Você perdeu! 😅😅 \n${botChoice} ganha de ${playerChoice}.`;
            }

            // return
            send(client, message, botChoice + "!"),
                setTimeout(() => {
                    send(client, message, result)
                }, 1000)
            console.log(currentDate() + " 🟡" + " rpsGame: " + message.to);
        }

    },

    MESSAGE: {

        withCommand: (client, message) => {

            let usage = false; // Declara a variável para controle de uso da função

            //--------------- Encontra o Prefixo
            let prefix;
            let bodytext;
            if (message.text.startsWith(".")) { // Se começar com ".", define o prefixo
                if (message.text.split(" ").length === 1) { // if user send only the prefix
                prefix = message.text; 
                } else {
                prefix = message.text.substring(0, message.text.indexOf(" ")); // first word of the text as Command
                }
                bodytext = message.text.substring(message.text.indexOf(" ")); // rest of sentence
                prefix = prefix.toLowerCase();
            } else { // Não define o prefixo
                return usage; // Não passa pela verificação
            }


            //--------------- Verifica se o prefixo corresponde a algum comando conhecido
            const cmd = cmdList;

            // GPT
            if (cmd.bot.includes(prefix)) {
                fc.GPT.run(client, message, bodytext);
                usage = true;
            }

            // DALL-E
            else if (cmd.dalle.includes(prefix)) {
                fc.DALLE.run(client, message, bodytext);
                usage = true;
            }

            // Random
            else if (cmd.random.includes(prefix)) {
                fc.TOOLS.random(client, message, bodytext);
                usage = true;
            }

            // CoinFlip
            else if (cmd.coinflip.includes(prefix)) {
                fc.TOOLS.random(client, message, "cara, coroa", "🪙 ");
                usage = true;
            }

            return usage;

        },

        withoutPrefixes: (client, message, message_body) => {

            let usage = false; // Declara a variável para controle de uso da função

            // Trata a variável message_body, retirando o "." quando existir.
            let msg = message_body
            if (msg.startsWith(".")) {
                msg = msg.slice(1);
            }

            // Hello World
            if (msg === "hello") {
                send(client, message, "🤖 Hello world! 🌎")
                console.log(currentDate() + " 🟡" + " HelloWorld: " + message.to);
                usage = true;
            }

            // Games:
            // 1 - RPS Game
            const rpsOptions = ["pedra", "papel", "tesoura"];
            if (rpsOptions.includes(msg)) {
                fc.GAMES.rpsGame(client, message, msg)
                usage = true;
            }

            return usage;

        }

    },

}

//                                                           Running Bot

const runBot = (client, message) => {

    message.text = message.body; // Conserta um erro gerado após o patch de março da biblioteca venom

    //-------------------------- ADM cfg

    if (message.from === process.env.ADM_NUMBER && message.body.startsWith("cfg")) {
        fc.CFG.run(client, message);
        return; // ignora o resto
    }

    if (!runGPTool) {
        return; // ignora o resto
    }

    //------------------------- Data Collection

    // update date time
    date = new Date();

    // User Contact number
    fc.DATA.UserNumber(message)

    // User message content
    const message_body = message.body.toLowerCase()

    //------------------------- Ignore Bot Messages

    if (ignoreBotMessages) {
        if (message.from === process.env.BOT_NUMBER) {
            return; // ignora o resto
        }
    }

    //------------------------- Ignore Group Messages (except with prefix)

    if (group && !message_body.startsWith(".")) {
        return; // ignora o resto
    }

    //------------------------- Show Options

    // Show messages information
    if (showMessagesInfo) {
        let from = message.from
        let to = message.to
        if (message.from === process.env.BOT_NUMBER) {
            from = "GPTool"
        }
        if (message.to === process.env.BOT_NUMBER) {
            to = "GPTool"
        }
        console.log(currentDate() + " Message from: " + from + " to: " + to);
    }

    // Show messages texts
    if (showMessagesText) {
        console.log("Message: " + message_body)
    }

    //-------------------------- RUN MESSAGE

    if (!fc.MESSAGE.withCommand(client, message)) { // Se detectar comando com prefixo, envia e para aqui.
        if (!fc.MESSAGE.withoutPrefixes(client, message, message_body)) { // Se detectar comando sem prefixo, envia e para aqui.
            if (message.from !== process.env.BOT_NUMBER && !group) { // Se não detectar comando e não for mensagem do próprio bot e nem de um grupo:
                if (GPT_OnAnyMessage) { // Caso autorizado a responder pelo GPT sem prefixo
                    fc.GPT.run(client, message, message_body) // responde pelo GPT
                }
            }
        }
    }

    //-------------------------- TEST AREA

    // Encerra a interação
    return;

}

async function start(client) {
    // Roda o programa
    client.onAnyMessage((message) => { 
        runBot(client, message);
    });

    // Trata exceções
    client.onIncomingCall(async (call) => { // Responde quando ligam para o contacto
        console.log(call);
        client.sendText(call.peerJid, "Oi 👋😊, aqui é o *GPTool*, mas não sou muito bom em falar ao telefone. Então, se quiser bater um papo, me manda uma mensagem que eu respondo rapidinho! 🚀");
    });

}


const RmqRpc = require('./index');

const user = process.env.RMQUSER || 'guest';
const password = process.env.RMQPASS || 'guest';

class Server {
    async run() {
        const mq = new RmqRpc(`amqp://${user}:${password}@localhost`);
        // Create connection and channel
        await mq.init();
        // Initialize an exchange and queue 'square'
        await mq.setupQueue('square');
        // Wait for requests
        mq.listenForMessages(async (request) => {
            // Handle request
            return Math.pow(Number(request), 2);
        }).then(() => {
            console.log('Server ready.')
        });
    }
}

class Client {
    async run() {
        const mq = new RmqRpc(`amqp://${user}:${password}@localhost`);
        // Create connection and channel
        await mq.init();

        const num = Math.random();

        // Send request and await result
        const result = await mq.sendRpc('square', num);

        console.log(`Num: ${num}, Square: ${result}`);
    }
}

const server = new Server();
server.run();

const client = new Client();
client.run().then(() => process.exit());

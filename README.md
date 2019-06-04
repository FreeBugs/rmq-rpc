# RMQ-RPC
Simple, lightweight RPC calls with RabbitMQ and Node.js based on amqplib.

The RmqRpc class features an easy API for the producer and consumer of the RPC call.

## Installation and quickstart
```sh
npm install rmq-rpc
```
Require the module:
```js
const RmqRpc = require('rmq-rpc');
```
Implement the consumer (server):
```js

    const mq = new RmqRpc(`amqp://user:password@host`);

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
```
Implement the producer (client):
```js
    const num = Math.random();

    const mq = new RmqRpc(`amqp://${user}:${password}@localhost`);

    // Create connection and channel
    await mq.init();

    // Send request and await result
    const result = await mq.sendRpc('square', num);

    console.log(`Num: ${num}, Square: ${result}`);
```
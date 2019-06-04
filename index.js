const amqp = require('amqplib');
const request = 'request';
const uuidv1 = require('uuid/v1');

class RmqRpc {
    constructor(connStr) {
        this.connStr = connStr;
    }

    /*
        ********* SETUP
     */
    async init() {
        this.connection = await amqp.connect(this.connStr);
        this.channel = await this.connection.createChannel();
    }

    async setupQueue(qName) {
        this.qName = qName;
        //console.debug(`Setting up RabbitMQ queue ${qName}...`);

        // create exchange
        await this.channel.assertExchange(qName, 'direct', {durable: true});

        // create queue
        await this.channel.assertQueue(qName, {durable: true});

        // bind queue
        await this.channel.bindQueue(qName, qName, request);

        //console.debug('RabbitMQ setup done.');
    };


    /*
        ********* LISTEN / RECEIVE
     */
    async listenForMessages(callback) {
        await this.channel.prefetch(1);

        await this.consume(this.connection, this.channel, callback);
    };

    consume(connection, channel, callback) {
        return new Promise((resolve, reject) => {
            channel.consume(this.qName, async function (msg) {
                // parse message
                let msgBody = msg.content.toString();
                let data = JSON.parse(msgBody);
                let replyTo = msg.properties.replyTo;

                // process data
                let processingResults;
                let success = true;
                try {
                    processingResults = await this.processMessage(data, callback);
                } catch (e) {
                    console.warn(e);
                    success = false;
                    processingResults = e;
                }

                if (replyTo) { // RPC
                    channel.sendToQueue(msg.properties.replyTo,
                        Buffer.from(JSON.stringify({success: success, data: processingResults}), 'utf-8'),
                        {
                            correlationId: msg.properties.correlationId
                        });
                }

                await channel.ack(msg);
            }.bind(this));

            // handle connection closed
            connection.on('close', (err) => {
                return reject(err);
            });

            // handle errors
            connection.on('error', (err) => {
                return reject(err);
            });
        });
    }

    processMessage(requestData, callback) {
        return new Promise((resolve, reject) => {
            callback(requestData).then((result) => {
                resolve(result);
            }, (result) => {
                reject(result);
            });
        });
    }

    /*
        ********* SENDING / REPLY
     */
    sendRpc(exchangeName, data) {
        return new Promise(async (resolve, reject) => {
            let q = await this.channel.assertQueue('', {
                exclusive: true
            });

            const correlationId = uuidv1();

            this.channel.consume(q.queue, function (msg) {
                if (msg.properties.correlationId === correlationId) {
                    console.debug(`Received reply for RPC request ${correlationId}...`);
                    let msgBody = msg.content.toString();
                    let data = JSON.parse(msgBody);
                    if (data.success) {
                        resolve(data.data);
                    } else {
                        reject(data.data);
                    }
                }
            }, {
                noAck: true
            });

            console.debug(`Sending RPC request ${correlationId} to ${exchangeName}...`);

            this.channel.sendToQueue(exchangeName,
                Buffer.from(JSON.stringify(data), 'utf-8'),
                {
                    replyTo: q.queue,
                    correlationId: correlationId
                });
        });
    };
}

module.exports = RmqRpc;
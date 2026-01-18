import amqp from 'amqplib';

let connection = null;
let channel = null;

const logger = {
  info: (msg, ...args) => console.info(`[EventBus] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[EventBus] ${msg}`, ...args),
};

export const connect = async (rabbitmqHost = 'rabbitmq', rabbitmqPort = 5672) => {
  if (connection) return connection;

  const url = `amqp://${process.env.RABBITMQ_USER || 'guest'}:${process.env.RABBITMQ_PASS || 'guest'}@${rabbitmqHost}:${rabbitmqPort}`;
  
  try {
    logger.info(`Connecting to RabbitMQ at ${rabbitmqHost}:${rabbitmqPort}...`);
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    // Assert exchanges
    await channel.assertExchange('fiduciary_events', 'topic', { durable: true });
    
    logger.info('Connected to RabbitMQ');
    
    connection.on('error', (err) => {
      logger.error('Connection error', err);
      connection = null;
      channel = null;
      // Simple retry logic could go here
    });

    connection.on('close', () => {
      logger.info('Connection closed');
      connection = null;
      channel = null;
    });

    return connection;
  } catch (err) {
    logger.error('Failed to connect:', err.message);
    throw err;
  }
};

export const publish = async (routingKey, message) => {
  if (!channel) {
    logger.error('Cannot publish: No channel');
    return false;
  }

  try {
    const buffer = Buffer.from(JSON.stringify(message));
    channel.publish('fiduciary_events', routingKey, buffer);
    logger.info(`Published to ${routingKey}:`, message);
    return true;
  } catch (err) {
    logger.error('Publish error:', err);
    return false;
  }
};

export const subscribe = async (routingKey, handler, queueName = '') => {
  if (!channel) {
    throw new Error('No channel available');
  }

  try {
    // Assert queue (exclusive if name is empty, durable otherwise)
    const q = await channel.assertQueue(queueName, { 
      exclusive: !queueName,
      durable: !!queueName 
    });
    
    await channel.bindQueue(q.queue, 'fiduciary_events', routingKey);
    
    channel.consume(q.queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Received ${routingKey}:`, content);
          await handler(content, msg.fields.routingKey);
          channel.ack(msg);
        } catch (err) {
          logger.error(`Error processing message from ${routingKey}:`, err);
          // channel.nack(msg); // Optional: nack on error
        }
      }
    });
    
    logger.info(`Subscribed to ${routingKey} (Queue: ${q.queue})`);
  } catch (err) {
    logger.error(`Subscribe error for ${routingKey}:`, err);
  }
};

import express, { Request, Response } from 'express';
import { CloudEvent } from 'cloudevents';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post('/', (req: Request, res: Response) => {
  if (!req.body) {
    const msg = 'no Pub/Sub message received';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }
  if (!req.body.message) {
    const msg = 'invalid Pub/Sub message format';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }

  const pubSubMessage = req.body.message;
  const name = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : 'World';

  console.log(`Hello ${name}!`);
  
  // Here we would implement the dispatch logic:
  // 1. Parse the payment order ID from the event
  // 2. Fetch the payment order details
  // 3. Generate the settlement packet
  // 4. Send to the sponsor bank adapter
  
  console.log('Dispatch event processed successfully');

  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Dispatch service listening on port ${PORT}`);
});

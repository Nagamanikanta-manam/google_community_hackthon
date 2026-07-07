import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { submissionsRouter } from './routes/submissions.js';
import { adminRouter } from './routes/admin.js';
import { whatsappRouter } from './routes/whatsapp.js';

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/submissions', submissionsRouter);
app.use('/admin', adminRouter);
app.use('/webhooks/whatsapp', whatsappRouter);

app.listen(config.port, () => {
  console.log(
    `constituency-ai backend listening on :${config.port} ` +
      `(mocks: global=${config.useMocks} stt=${config.mockStt} translate=${config.mockTranslate} ` +
      `geocode=${config.mockGeocode} gemini=${config.mockGemini})`
  );
});

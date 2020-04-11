require('dotenv').config();

const express = require('express');
const jsonxml = require('jsontoxml');
const responseTime = require('response-time');
const fs = require('fs');
const port = process.env.PORT || 5000;
const estimator = require('./estimator');
const version = 1;
const baseURL = `/api/v${version}/on-covid-19`;
const auditLogPath = './audit-log.txt';
const errorLogPath = './error-log.txt';

/**
 * Log audit messages.
 *
 * @param {string} path Log path.
 */
const auditLogger = (fs, path) => (req, res, time) => {
  res.on('finish', async () => {
    try {
      const { originalUrl } = req;
      const timestamp = new Date().getTime();
      const t = time.toFixed(2);
      const message = `${timestamp}\t\t${originalUrl}\t\tdone in ${t} ms\n`;

      await fs.createWriteStream(path, { flags: 'a' }).write(message);
    } catch (e) {
      throw e;
    }
  });
};

/**
 * Log error messages.
 *
 * @param {object} fs File system object.
 *
 * @param {string} path Log path.
 */
const errorLogger = (fs, path) => async (err, req, res, next) => {
  try {
    await fs.createWriteStream(path, { flags: 'a' }).write(err.stack);

    next(err);
  } catch (e) {
    next(e);
  }
};

// Respond with a JSON object.
const jsonResponse = (req, res) => {
  const { body } = req;

  const data = estimator(body);

  res.status(200).set('Content-Type', 'application/json').json(data);
};

// Respond with XML object.
const xmlResponse = (req, res) => {
  const { body } = req;

  const estimation = estimator(body);

  const data = `<?xml version="1.0" encoding="UTF-8"?><estimate>${jsonxml(estimation)}</estimate>`;

  res.status(200).set('Content-Type', 'text/xml').send(data);
};

// Respond with logs.
const logsResponse = (fs) => async (req, res, next) => {
  try {
    await fs.createReadStream(auditLogPath).pipe(res);
  } catch (e) {
    next(e);
  }
};

// Handle route errors.
const errorHandler = async (err, req, res, next) => {
  res.status(500).set('Content-Type', 'text/plain').send('Internal server error.');
};

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(responseTime(auditLogger(fs, auditLogPath)));

app.all('/', (req, res) => res.status(200).set('Content-Type', 'text/plain').send('API is ready.'));

app.post(baseURL, jsonResponse);

app.post(`${baseURL}/json`, jsonResponse);

app.post(`${baseURL}/xml`, xmlResponse);

app.all(`${baseURL}/logs`, logsResponse(fs));

app.use(errorLogger(fs, errorLogPath));

app.use(errorHandler);

app.listen(port, () => console.log(`Server is listening on port [${port}]`));

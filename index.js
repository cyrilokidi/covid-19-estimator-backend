require('dotenv').config();

const express = require('express');
const jsonxml = require('jsontoxml');
const responseTime = require('response-time');
const fs = require('fs-extra');
const port = process.env.PORT || 5000;
const estimator = require('./estimator');
const version = 1;
const baseURL = `/api/v${version}/on-covid-19`;
const auditLogPath = './audits.log.json';

/**
 * Log audit messages.
 *
 * @param {object} fs File system object.
 *
 * @param {string} path Log path.
 */
const auditLogger = (fs, path) => (req, res, time) => {
  res.on('finish', async () => {
    try {
      const { originalUrl } = req;
      const timestamp = new Date().getTime();
      const duration = time.toFixed(2);

      const logs = await fs.readJson(path);

      logs[timestamp] = { originalUrl, duration };

      await fs.writeJson(path, logs);
    } catch (e) {
      throw e;
    }
  });
};

// Log errors to console
const errorLogger = (err, req, res, next) => {
  console.log(err.stack);
  next(err);
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

  const data = `<estimate>${jsonxml(estimation)}</estimate>`;

  res.status(200).set('Content-Type', 'application/xml').send(data);
};

/**
 * Respond with logs.
 *
 * @param {object} fs File system object.
 *
 * @param {string} path Log path.
 */
const logsResponse = (fs, path) => async (req, res, next) => {
  try {
    let data = '';

    const audits = await fs.readJson(path);

    Object.keys(audits).forEach((v) => {
      data += `${v}\t\t${audits[v].originalUrl}\t\tdone in ${audits[v].duration} seconds\n`;
    });

    res.status(200).set('Content-Type', 'text/html').send(data);
  } catch (e) {
    next(e);
  }
};

// Handle route errors.
const errorHandler = async (err, req, res, next) => {
  res.status(500).set('Content-Type', 'text/html').send('Internal server error.');
};

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(responseTime(auditLogger(fs, auditLogPath)));

app.all('/', (req, res) => res.status(200).set('Content-Type', 'text/html').send('API is ready.'));

app.post(baseURL, jsonResponse);

app.post(`${baseURL}/json`, jsonResponse);

app.post(`${baseURL}/xml`, xmlResponse);

app.get(`${baseURL}/logs`, logsResponse(fs, auditLogPath));

app.use(errorLogger);

app.use(errorHandler);

app.listen(port, () => console.log(`Server is listening on port [${port}]`));

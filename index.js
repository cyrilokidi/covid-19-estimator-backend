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
      const { method, originalUrl } = req;
      const { statusCode } = res;
      const timestamp = new Date().getTime();
      const duration = `${time.toFixed(2)}ms`;

      const logs = await fs.readJson(path);

      logs[timestamp] = { method, originalUrl, statusCode, duration };

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

  res.status(200).setHeader('Content-Type', 'application/json');
  res.json(data);
};

// Respond with XML object.
const xmlResponse = (req, res) => {
  const { body } = req;

  const estimation = estimator(body);

  const data = `<estimate>${jsonxml(estimation)}</estimate>`;

  res.status(200).setHeader('Content-Type', 'application/xml');
  res.send(data);
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
    const logs = await fs.readJson(path);

    res.setHeader('Content-type', 'text/plain');

    Object.keys(logs).forEach((v) => {
      const log = logs[v];

      res.write(`${log.method}\t\t${log.originalUrl}\t\t${log.statusCode}\t\t${log.duration}\n`);
    });

    res.status(200);
    res.end();
  } catch (e) {
    next(e);
  }
};

// Handle route errors.
const errorHandler = async (err, req, res, next) => {
  res.status(500).setHeader('Content-Type', 'text/plain');
  res.send('Internal server error.');
};

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(responseTime(auditLogger(fs, auditLogPath)));

app.all('/', (req, res) => {
  res.status(200).setHeader('Content-Type', 'text/html');
  res.send('API is ready.');
});

app.post(baseURL, jsonResponse);

app.post(`${baseURL}/json`, jsonResponse);

app.post(`${baseURL}/xml`, xmlResponse);

app.all(`${baseURL}/logs`, logsResponse(fs, auditLogPath));

app.use(errorLogger);

app.use(errorHandler);

app.listen(port, () => console.log(`Server is listening on port [${port}]`));

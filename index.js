require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const jsonxml = require('jsontoxml');
const responseTime = require('response-time');
const fs = require('fs');
const port = process.env.PORT || 3000;
const estimator = require('./estimator');
const version = 1;
const baseURL = `/api/v${version}/on-covid-19`;
const sysLogPath = './sys-log.txt';
const auditLogPath = './audit-log.txt';
const errorLogPath = './error-log.txt';

/**
 * Log system messages.
 *
 * @param {string} path Log path.
 *
 * @param {string} message Log message.
 *
 * @param {object} cb Callback function.
 */

const sysLogger = async (fs, path, message, cb) => {
  try {
    await fs.createWriteStream(path, { flags: 'a' }).write(`${message}\n`);

    cb(null);
  } catch (e) {
    cb(e);
  }
};

/**
 * Log audit messages.
 *
 * @param {string} path Log path.
 */
const auditLogger = (fs, path) => (req, res, time) => {
  res.on('finish', async () => {
    try {
      const { method, originalUrl } = req;
      const { statusCode } = res;
      const t = `${Math.trunc(time)} ms`;
      const message = `${method}\t\t${originalUrl}\t\t${statusCode}\t\t${t}\n`;

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

  const data = jsonxml(estimation);

  res.status(200).set('Content-Type', 'text/xml').send(data);
};

// Respond with logs.
const logsResponse = (req, res, next) => {
  fs.readFile(auditLogPath, (err, data) => {
    if (err) {
      next(err);
    } else {
      res.status(200).set('Content-Type', 'text/plain').send(data);
    }
  });
};

// Handle route errors.
const errorHandler = async (err, req, res, next) => {
  res.status(500).set('Content-Type', 'text/plain').send('Internal server error.');
};

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(responseTime(auditLogger(fs, auditLogPath)));

app.post(baseURL, jsonResponse);

app.post(`${baseURL}/json`, jsonResponse);

app.post(`${baseURL}/xml`, xmlResponse);

app.all(`${baseURL}/logs`, logsResponse);

app.use(errorLogger(fs, errorLogPath));

app.use(errorHandler);

app.listen(port, () => {
  const message = `Server is listening on port [${port}]`;

  sysLogger(fs, sysLogPath, message, (err) => {
    if (err) throw err;
  });
});

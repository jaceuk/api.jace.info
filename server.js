const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const path = require('path');

const app = express();

const root = path.join(__dirname, 'client', 'build');
app.use(express.static(root));

const EMAIL_FROM = 'noreply@jace.info';

// middleware
app.use(express.json());
app.use(cors());

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// verify connection configuration
transporter.verify((err, success) => {
  err
    ? console.log(err)
    : console.log(`=== Server is ready to take messages: ${success} ===`);
});

// RECAPTCHA
app.post('/api/verify', async (req, res) => {
  const captchaURL = 'https://www.google.com/recaptcha/api/siteverify';
  // Get the token from the form
  const key = req.body['gRecaptchaResponse'];

  if (!key) res.json({ status: 'fail' });

  const response = await axios({
    url: captchaURL,
    method: 'POST',
    // reCaptcha demands x-www-form-urlencoded requests
    headers: {
      ContentType: 'application/x-www-form-urlencoded; charset=utf-8',
    },
    params: {
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: key,
    },
  }).catch((error) => {
    console.log(error);
  });

  const data = response.data;
  // check if successfully requested, and that a score over .5 is met
  if (data.success === true && data.score > 0.5) {
    res.json({
      status: 200,
    });
  } else {
    res.json({
      status: 500,
    });
  }
});

// SEND EMAIL
app.post('/api/send', function (req, res) {
  const mailOptions = {
    from: 'noreply@jace.info',
    to: 'info@jace.info',
    subject: `JACE.INFO contact form submission from ${req.body.name}`,
    html: `<p>You have a contact form submission</p>
      <p><strong>Email: </strong> ${req.body.email}</p>
      <p><strong>Message: </strong> ${req.body.message}</p>
    `,
  };

  transporter.sendMail(mailOptions, function (err, data) {
    if (err) {
      res.json({
        status: 500,
      });
    } else {
      console.log('== Message Sent ==');
      res.json({
        status: 200,
      });
    }
  });
});

// HEALTH CHECK
app.get('/_health', (req, res) => {
  res.status(200).send('ok');
});

// Handles any requests that don't match the ones above
// Check if maintenance mode is enabled
app.get('*', (req, res) => {
  res.sendFile('index.html', { root });
});

const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on: http://localhost:${port}`);
});

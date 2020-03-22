const { google } = require('googleapis');
const express = require('express');
const atob = require('atob');
const OAuth2Data = require('./google_key.json');
const fs = require('fs');

const app = express()

const CLIENT_ID = OAuth2Data.client.id;
const CLIENT_SECRET = OAuth2Data.client.secret;
const REDIRECT_URL = OAuth2Data.client.redirect

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

app.get('/', getMailList, function (req, res) { });

function getMailList(req, res, next) {
  if (!authed) {
    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/gmail.readonly'
    });
    console.log(url)
    res.redirect(url);
  } else {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    gmail.users.messages.list({
      userId: 'me',
      maxResults: 10
    }, (err, resp) => {
      if (err) return console.log('The API returned an error: ' + err);
      fs.writeFile('mails.json', JSON.stringify(resp.data.messages), (err) => {
        if (err) throw err;
        console.log('Messages Store successfully');
      });
      gmail.users.messages.get({
        userId: 'me',
        id: resp.data.messages[1].id
      }, (err, resp) => {
        if (err) return console.log('The API returned an error: ' + err);
        const index = resp.data.payload.headers.findIndex(x => x.name === 'Subject');
        if (index !== -1 && resp.data.payload.parts.length) {
          resp.data.payload.parts.forEach((part, i) => {
            fileName = resp.data.payload.headers[index].value.split(' ')[0] + i + '.html';
            fs.writeFile(fileName, atob(part.body.data), (err) => {
              if (err) throw err;
              console.log('Mail saved successfully');
            });
          });
        } else {
          console.log('Mail Body Not Found');
        }
      });
    });
    res.send('Login Successfully');
  }
}

app.get('/auth/google/callback', function (req, res) {
  const code = req.query.code
  if (code) {
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log('Error authenticating')
        console.log(err);
      } else {
        console.log('Successfully authenticated');
        oAuth2Client.setCredentials(tokens);
        authed = true;
        res.redirect('/')
      }
    });
  }
});

const port = process.env.port || 5000
app.listen(port, () => console.log(`Server running at ${port}`));
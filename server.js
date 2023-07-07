const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const IPFS = require('ipfs-api');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');
let cid = '';

const app = express();
const ipfs = new IPFS({ host: '127.0.0.1', port: '5001', protocol: 'http' });

const uri = "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
let collection = null;

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('certitrackproject');
    collection = database.collection('certitrackproject');

    app.get('/sendStudentId', async (req, res) => {
      const studentId = req.query.studentId;
      console.log('Received student ID:', studentId);

      try {
        const result = await collection.findOne({ student_id: parseInt(studentId) });
        console.log('MongoDB query result:', result);

        if (result) {
          var awardDate = new Date(result.awardDate); // Convert the string to a Date object
          var formattedDate = awardDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

          var data = {
            student: {
              first_name: result.first_name,
              last_name: result.last_name
            },
            course: result.course,
            grade: {
              getPoints: function () {
                return result.grade_points;
              },
              getAwardDate: function () {
                return formattedDate;
              }
            },
            dt: formattedDate
          };

          fs.readFile('certificate.html', 'utf8', async function (err, template) {
            if (err) throw err;

            var renderedCertificate = ejs.render(template, data);

            fs.writeFile('template.html', renderedCertificate, async function (err) {
              if (err) throw err;
              console.log('Template HTML saved as template.html');

              // Convert the HTML to PNG using Puppeteer
              const browser = await puppeteer.launch({ headless: "new" });
              const page = await browser.newPage();
              await page.setContent(renderedCertificate);
              const pngFile = 'certificate.png';
              await page.screenshot({ path: pngFile, fullPage: true });

              console.log('Certificate saved as certificate.png');

              // Add the PNG file to IPFS
              const fileData = fs.readFileSync(pngFile);
              ipfs.add(fileData, function (err, result) {
                if (err) throw err;

                if (result && result[0] && result[0].hash) {
                  cid = result[0].hash;
                  console.log('Certificate saved to IPFS with CID:', cid);

                  res.json({
                    success: true,
                    cid: cid,
                    generatedCID: cid
                  });
                } else {
                  console.log('Error adding file to IPFS');
                  res.json({
                    success: false,
                    error: 'Error adding file to IPFS'
                  });
                }
              });

              await browser.close();
            });
          });

        } else {
          console.log('No result found');
          res.json({ success: false, message: 'No result found' });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        res.status(500).json({ success: false, message: 'Error fetching student data' });
      }
    });

    app.get('/get-cid', (req, res) => {
      res.send(cid);
    });

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/student', (req, res) => {
      res.sendFile(path.join(__dirname, 'student.html'));
    });

    app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'admin.html'));
    });

    app.get('/createToken', (req, res) => {
      res.sendFile(path.join(__dirname, 'createToken.html'));
    });

    const server = app.listen(5000, () => {
      const portNumber = server.address().port;
      console.log(`Server running on port: ${portNumber}`);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connect();

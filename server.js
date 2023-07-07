const express = require('express');
const mongoose = require('mongoose');
const IPFS = require('ipfs-api');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const ipfs = new IPFS({ host: '127.0.0.1', port: '5001', protocol: 'http' });

const uri = "mongodb+srv://certiTrackAdmin:8Ss1smXjpFe5txSH@cluster0.klunocq.mongodb.net/?retryWrites=true&w=majority";

// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Define the Results model
const Results = mongoose.model('Results', {
  student_id: String,
  first_name: String,
  last_name: String,
  awardDate: Date,
  course: String,
  grade_points: Number
});

app.get("/sendStudentId", async (req, res) => {
  const studentId = req.query.studentId;
  const result = await Results.findOne({ student_id: studentId });

  if (result) {
    var awardDate = result.awardDate;
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
        ipfs.add(fileData, function (err, ipfsResult) {
          if (err) throw err;

          if (ipfsResult && ipfsResult[0] && ipfsResult[0].hash) {
            const cid = ipfsResult[0].hash;
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
});

app.get('/get-cid', (req, res) => {
  res.send(cid);
});

const server = app.listen(5000, () => {
  const portNumber = server.address().port;
  console.log(`Server running on port: ${portNumber}`);
});

const express = require('express');
const app = express();
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const IPFS = require('ipfs-api');
const path = require('path');
const puppeteer = require('puppeteer');
let cid = '';

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/student", (req, res) => {
    res.sendFile(path.join(__dirname + "/student.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname + "/admin.html"));
});

app.get("/createToken", (req, res) => {
    res.sendFile(path.join(__dirname + "/createToken.html"));
})


const ipfs = new IPFS({ host: '127.0.0.1', port: '5001', protocol: 'http' });

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'result'
});

connection.connect(function (err) {
    if (err) {
        console.error('Error connecting: ' + err.stack);
        return;
    }
    console.log('Connected as id ' + connection.threadId);

    app.get("/sendStudentId", async (req, res) => {
        const studentId = req.query.studentId;
        connection.query('SELECT * FROM results WHERE student_id = ?', [studentId], async function (error, results, fields) {
            if (error) throw error;
    
            if (results.length > 0) {
                var result = results[0];
    
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
            }
        });
    });

    app.get('/get-cid', (req, res) => {
        res.send(cid);
    });

    const server = app.listen(5000, () => {
        const portNumber = server.address().port;
        console.log(`Server running on port: ${portNumber}`);
    });
});

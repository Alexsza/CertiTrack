const express = require('express');
const app = express();
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const pdf = require('html-pdf');
const IPFS = require('ipfs-api');
const path = require('path');
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

    app.get("/sendStudentId", (req, res) => {
        const studentId = req.query.studentId;
        connection.query('SELECT * FROM results WHERE student_id = ?', [studentId], function (error, results, fields) {
            if (error) throw error;

            if (results.length > 0) {
                var result = results[0];

                var data = {
                    student: {
                        first_name: result.first_name,
                        last_name: result.last_name
                    },
                    course: {
                        getName: function () {
                            return result.course_name;
                        }
                    },
                    grade: {
                        getPoints: function () {
                            return result.grade_points;
                        },
                        getAwardDate: function () {
                            return result.award_date;
                        }
                    },
                    dt: new Date().toDateString() // Use the current date or adjust as needed
                };

                fs.readFile('certificate.html', 'utf8', function (err, template) {
                    if (err) throw err;

                    var renderedCertificate = ejs.render(template, data);

                    fs.writeFile('template.html', renderedCertificate, function (err) {
                        if (err) throw err;
                        console.log('Template HTML saved as template.html');

                        // Convert the HTML to PDF
                        var pdfOptions = { format: 'Letter' };
                        var pdfFile = 'certificate.pdf';

                        pdf.create(renderedCertificate, pdfOptions).toFile(pdfFile, function (err, result) {
                            if (err) throw err;
                            console.log('Certificate saved as certificate.pdf');

                            // Read the PDF file
                            fs.readFile(pdfFile, function (err, fileData) {
                                if (err) throw err;

                                // Add the PDF file to IPFS
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
                            });
                        });
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

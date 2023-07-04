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

    app.post('/upload', async (req, res) => {
        upload(req, res, function (err) {
          if (err) {
            res.status(400).send('File upload error');
            return;
          }
    
          const file = req.file;
    
          // Check if a file was uploaded
          if (!file) {
            res.status(400).send('No file uploaded');
            return;
          }
    
          // Access the uploaded file details
          const filePath = file.path;
          const originalFileName = file.originalname;
    
          // Check if the file is an Excel file
          if (!originalFileName.endsWith('.xlsx') && !originalFileName.endsWith('.xls')) {
            res.status(400).send('Invalid file format');
            return;
          }
    
          // Read the Excel file and process the data
          const workbook = xlsx.readFile(filePath);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = xlsx.utils.sheet_to_json(worksheet);
    
          // Iterate through each entry and update the database accordingly
          for (const entry of data) {
            const studentId = entry.studentId;
            // Extract other fields from the entry object
    
            // Update the database with the entry data
            connection.query('UPDATE results SET ... WHERE student_id = ?', [studentId], function (error, results, fields) {
              if (error) throw error;
              // Handle any further processing or error handling
            });
          }
    
          // Perform any necessary cleanup or response handling
          res.send('File uploaded and data processed successfully');
        });
      });


    const server = app.listen(5000, () => {
        const portNumber = server.address().port;
        console.log(`Server running on port: ${portNumber}`);
    });
});

const express = require('express');
const path = require('path');
const axios = require('axios');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');
const FormData = require('form-data');
const IPFS = require('ipfs-http-client');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const ipfs = IPFS.create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: 'Basic ' + Buffer.from('2TDhtwr81M60VrR1qVnehNc59rY:f0b2e296fae782a0f17e7e137473d44f').toString('base64')
  }
});

// const PORT = 8080;
const port = process.env.PORT || 3000;
const MONGO_URI =
  "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(MONGO_URI);
let collection = null;

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('certitrackproject');
    collection = database.collection('certitrackproject');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connect();

// Configure multer for admin file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configure Multer for certificate file uploads
const storageCID = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const uploadCID = multer({ storageCID });

// Function to handle individual file upload and database insertion
async function handleDataUpload(req, res) {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: 'No data provided.' });
    }

    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('certitrackproject');
    const collection = database.collection('certitrackproject');

    // Insert the data into the collection
    const insertResult = await collection.insertOne(data);

    console.log('Data inserted into MongoDB');
    console.log('Insert result:', insertResult);

    return res.json({
      success: true,
      message: 'Data inserted into MongoDB',
    });
  } catch (error) {
    console.error('Error adding data to MongoDB:', error);
    return res.status(500).json({ success: false, error: 'Error adding data to MongoDB' });
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Function to handle Excel file upload and database insertion
async function handleFileUpload(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    // Read the file data
    const fileData = file.buffer;

    // Parse the Excel data to JSON
    const workbook = XLSX.read(fileData, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('certitrackproject');
    const collection = database.collection('certitrackproject');

    // Insert each document into the collection
    for (const document of jsonData) {
      const insertResult = await collection.insertOne(document);
      console.log('Document inserted into MongoDB');
      console.log('Insert result:', insertResult);
    }

    return res.json({
      success: true,
      message: 'Data uploaded and inserted into MongoDB!',
    });
  } catch (error) {
    console.error('Error uploading data:', error);
    return res.status(500).json({ success: false, error: 'Error uploading data' });
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Endpoint for generating certificate and uploading to IPFS
app.get('/generate-certificate', async (req, res) => {
  try {
    const studentId = '17150644'; // Sample student ID for testing

    // Replace the sample studentId with req.query.studentId for user input from the front end

    console.log('Received student ID:', studentId);

    const result = await collection.findOne({ student_id: parseInt(studentId) });
    console.log('MongoDB query result:', result);

    if (!result) {
      console.log('No result found');
      res.json({ success: false, message: 'No result found' });
      return;
    }

    var awardDate = new Date(result.awardDate); // Convert the string to a Date object
    var formattedDate = awardDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    var data = {
      student: {
        first_name: result.first_name,
        last_name: result.last_name,
      },
      course: result.course,
      grade: {
        getPoints: function () {
          return result.grade_points;
        },
        getAwardDate: function () {
          return formattedDate;
        },
      },
      dt: formattedDate,
    };

    // Read the certificate template from file
    const templatePath = path.join(__dirname, 'uploads', 'certificate.html');
    const template = fs.readFileSync(templatePath, 'utf8'); // Read the template from the file

    // Render the certificate HTML using EJS
    const renderedCertificate = ejs.render(template, data);

    // Save the rendered HTML as a temporary file (template.html)
    const tempFilePath = path.join(__dirname, 'uploads', 'template.html');
    fs.writeFileSync(tempFilePath, renderedCertificate);

    // Convert the HTML to PNG using Puppeteer
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(renderedCertificate);
    const pngFile = path.join(__dirname, 'uploads', 'certificate.png');
    await page.screenshot({ path: pngFile, fullPage: true });

    console.log('Certificate saved as certificate.png');

    // Add the PNG file to IPFS
    const fileData = fs.readFileSync(pngFile);
    const resultIPFS = await ipfs.add(fileData);
    const cid = resultIPFS.cid.toString();

    // Remove temporary files
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(pngFile);

    console.log('Certificate saved to IPFS with CID:', cid);

    res.json({
      success: true,
      cid: cid,
      generatedCID: cid,
    });

    await browser.close();
  } catch (error) {
    console.error('Error generating the certificate:', error);
    res.status(500).json({ success: false, message: 'Error generating the certificate' });
  }
});


app.post('/upload', handleDataUpload);
app.post('/upload-file', upload.single('dataFile'), handleFileUpload);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



    app.get('/sendStudentId', async (req, res) => {
      // ... existing code for handling student ID ...
    });

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/student', (req, res) => {
      res.sendFile(path.join(__dirname, 'student.html'));
    });


    app.get('/validate', (req, res) => {
      res.sendFile(path.join(__dirname, 'validate.html'));
    });

    app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'admin.html'));
    });

    app.get('/createToken', (req, res) => {
      res.sendFile(path.join(__dirname, 'createToken.html'));
    });




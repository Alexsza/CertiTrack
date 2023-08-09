const express = require('express');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');
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

const port = process.env.PORT || 3000;
const MONGO_URI =
  "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(MONGO_URI);
let studentCollection = null;
let cidCollection = null;

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('certitrackproject');
    studentCollection = database.collection('certitrackproject'); // Collection for student data
    cidCollection = database.collection('CIDlist'); // Collection for storing CIDs
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connect();

let studentId = 0;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Multer for admin file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Multer for certificate and Excel file uploads
const storageCID = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const uploadCID = multer({ storage: storageCID });

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

app.get('/sendStudentId', async (req, res) => {
  studentId = req.query.studentId;
  console.log('Received student ID:', studentId);

  try {
    const result = await studentCollection.findOne({ student_id: parseInt(studentId) });
    console.log('MongoDB query result:', result);

    if (!result) {
      console.log('No result found');
      res.json({ success: false, message: 'No result found' });
      return;
    } else {
      var awardDate = new Date(result.awardDate);
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

       const insertResult = await cidCollection.insertOne({ student_id: parseInt(studentId), cid: cid });
      console.log('CID inserted into MongoDB:', insertResult);

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
    }
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.status(500).json({ success: false, message: 'Error fetching student data' });
  }
});

app.post('/upload', handleDataUpload);
app.post('/upload-file', upload.single('dataFile'), handleFileUpload);

app.get('/generate-certificate', async (req, res) => {
  // ... existing code for generating and uploading certificate ...
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

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/validate', (req, res) => {
  res.sendFile(path.join(__dirname, 'validate.html'));
});

app.get('/createToken', (req, res) => {
  res.sendFile(path.join(__dirname, 'createToken.html'));
});

app.get('/mongodb-dashboard', (req, res) => {
  const dashboardURL = 'https://cloud.mongodb.com/v2/64a82ada32ff6b587382a697#/clusters';
  res.redirect(dashboardURL);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
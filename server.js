const express = require('express');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const { chromium } = require('playwright')
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
const MONGO_URI = "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(MONGO_URI);

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('certitrackproject');

    studentCollection = database.collection('certitrackproject'); // Collection for student data
    cidCollection = database.collection('CIDlist'); // Collection for storing CIDs
    adminCollection = database.collection('adminSafe'); 

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}


// Middleware to handle MongoDB connection
async function connectMiddleware(req, res, next) {
  try {
    if (!client || (client && !client.topology.isConnected())) {
      console.log('Attempting to reconnect to MongoDB...');
      await connect(); // Reconnect to MongoDB if not already connected
      if (client && client.topology.isConnected()) {
        console.log('Reconnected to MongoDB');
      } else {
        console.log('Failed to reconnect to MongoDB');
      }
    } else {
      console.log('Already connected to MongoDB');
    }
  } catch (error) {
    console.error('Error reconnecting to MongoDB:', error);
  }
  next();
}

connect();

let studentId = 0;


app.use(express.static(path.join(__dirname, 'public')));
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

app.post('/admin-signin', async (req, res) => {
  const { username, password } = req.body;

  try {
    const database = client.db('certitrackproject');
    const adminCollection = database.collection('adminSafe'); // Collection for admin data

    const admin = await adminCollection.findOne({ user: username, password: password });

    if (admin) {
      res.json({ success: true, message: 'Admin sign-in successful' });
    } else {
      res.json({ success: false, message: 'Admin sign-in failed' });
    }
  } catch (error) {
    console.error('Error during admin sign-in:', error);
    res.status(500).json({ success: false, message: 'Error during admin sign-in' });
  }
});

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

      // Convert the HTML to PNG using Playwright
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
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

app.get('/validateCID', connectMiddleware, async (req, res) => {
  const cid = req.query.cid;

  try {
    // Check if the given CID exists in the cidCollection
    const result = await cidCollection.findOne({ cid: cid });

    if (result) {
      console.log('CID is valid:', cid);
      res.json({ success: true, message: 'CID is valid', studentId: result.student_id });
    } else {
      console.log('Invalid CID:', cid);
      res.json({ success: false, message: 'Invalid CID' });
    }
  } catch (error) {
    console.error('Error validating CID:', error);
    res.status(500).json({ success: false, message: 'Error validating CID' });
  }
});

//MongoDB 
app.get('/validateCIDMongoDB', connectMiddleware, async (req, res) => {
  const cid = req.query.cid;

  try {
    // Check if the given CID exists in the CIDlist collection of MongoDB
    const result = await cidCollection.findOne({ cid: cid });

    if (result) {
      console.log('CID is valid:', cid);
      res.json({ success: true, message: 'CID is valid', studentId: result.student_id });
    } else {
      console.log('Invalid CID:', cid);
      res.json({ success: false, message: 'Invalid CID' });
    }
  } catch (error) {
    console.error('Error validating CID:', error);
    res.status(500).json({ success: false, message: 'Error validating CID' });
  }
});


app.post('/upload', handleDataUpload);
app.post('/upload-file', upload.single('dataFile'), handleFileUpload);

app.delete('/deleteDocument/:studentId', async (req, res) => {
  const studentId = req.params.studentId;

  try {
    // Connect to MongoDB
    await client.connect();

    const database = client.db('certitrackproject');
    const collection = database.collection('certitrackproject');

    // Delete the document with the given studentId
    const deleteResult = await collection.deleteOne({ student_id: parseInt(studentId) });

    if (deleteResult.deletedCount === 1) {
      console.log(`Document with student ID ${studentId} deleted`);
      return res.json({ success: true, message: 'Document deleted successfully' });
    } else {
      console.log(`Document with student ID ${studentId} not found`);
      return res.json({ success: false, message: 'Document not found' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ success: false, error: 'Error deleting document' });
  } finally {
    // Close the MongoDB connection
    await client.close();
  }
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/validate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'validate.html'));
});

app.get('/createToken', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'createToken.html'));
});


app.get('/mongodb-dashboard', (req, res) => {
  const dashboardURL = 'https://cloud.mongodb.com/v2/64a82ada32ff6b587382a697#/clusters';
  res.redirect(dashboardURL);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
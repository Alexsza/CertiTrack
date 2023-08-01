const express = require('express');
const path = require('path');
const axios = require('axios');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');
const FormData = require('form-data');
const { create } = require('ipfs-http-client');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
let ipfs;
let cid = '';

const PORT = 8080;
const MONGO_URI =
  "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(MONGO_URI);

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

app.post('/upload', handleDataUpload);
app.post('/upload-file', upload.single('dataFile'), handleFileUpload);

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // List available databases
    const adminDb = client.db('admin');
    const databases = await client.db().admin().listDatabases();
    console.log('Available Databases:');
    console.log(databases);

    // Fetch and display a sample document from the collection
    const database = client.db('certitrackproject');
    const collection = database.collection('certitrackproject');
    const sampleDocument = await collection.findOne();
    console.log('Sample Document:');
    console.log(sampleDocument);

    // Do any other database operations you need here...
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}


    app.get('/sendStudentId', async (req, res) => {
      // ... existing code for handling student ID ...
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


// Call the connect function to establish the MongoDB connection
connect();

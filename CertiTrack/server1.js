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

const uri =
  "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

// Require the uploadController module
const uploadController = require('./fileHandler'); // Make sure the path is correct based on your project directory structure

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

    // Set up IPFS client
    const projectId = '2TDhtwr81M60VrR1qVnehNc59rY';
    const projectSecret = 'f0b2e296fae782a0f17e7e137473d44f';
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      apiPath: '/api/v0',
      headers: {
        authorization: auth,
      },
    });

    app.post('/upload', upload.single('dataFile'), async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }

        const added = await ipfs.add(file.buffer);
        cid = added.cid.toString();
        console.log('Certificate saved to IPFS with CID:', cid);

        return res.json({
          success: true,
          cid: cid,
        });
      } catch (error) {
        console.error('Error adding file to IPFS:', error);
        return res.status(500).json({ success: false, error: 'Error adding file to IPFS' });
      }
    });

    app.post('/upload-data', async (req, res) => {
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
    });

    app.get('/get-cid', (req, res) => {
      console.log('Sending CID to frontend:', cid);
      if (cid) {
        res.cookie('AWSALB', 'your-cookie-value', { 
          expires: new Date(Date.now() + 3600000), // Set the expiration time appropriately
          httpOnly: true,
          secure: true, // Make sure it's secure since SameSite=None requires secure context
          sameSite: 'None' // Set the SameSite attribute to None
        });
        res.send(cid);
      } else {
        res.status(404).send('CID not available');
      }
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

    app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'admin.html'));
    });

    app.get('/createToken', (req, res) => {
      res.sendFile(path.join(__dirname, 'createToken.html'));
    });

    const server = app.listen(8080, () => {
      const portNumber = server.address().port;
      console.log(`Server running on port: ${portNumber}`);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connect();

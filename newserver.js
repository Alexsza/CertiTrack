const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const IPFS = require('ipfs-api');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const ipfs = new IPFS({ host: '127.0.0.1', port: '5001', protocol: 'http' });

const uri = "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

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

    app.get('/sendStudentId', async (req, res) => {
        const studentId = req.query.studentId;
        console.log('Received student ID:', studentId);
      
        try {
            const result = await collection.findOne({ student_id: parseInt(studentId) });
          console.log('MongoDB query result:', result);
      
          if (result) {
            console.log('Result:', result);
            res.json({ success: true, result });
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

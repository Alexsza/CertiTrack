const fs = require('fs');
const { MongoClient } = require('mongodb');
const path = require('path');

const uri = "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

// Function to handle file upload and database insertion
async function handleFileUpload(req, res) {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).send('No file uploaded.');
        }

        // Read the file data
        const fileData = fs.readFileSync(file.path);

        // Parse the JSON data
        const jsonData = JSON.parse(fileData);

        // Perform any necessary database insertion logic here
        // For example, you can connect to MongoDB and insert the JSON data into a collection
        await client.connect();
        console.log('Connected to MongoDB');

        const database = client.db('certitrackproject');
        const collection = database.collection('certitrackproject');

        // Insert the data into the collection
        await collection.insertMany(jsonData);

        console.log('Data inserted into MongoDB');

        // Clean up: delete the temporary file after processing
        fs.unlinkSync(file.path);

        return res.json({
            success: true,
            message: 'Data inserted into MongoDB',
        });
    } catch (error) {
        console.error('Error adding file to MongoDB:', error);
        return res.json({
            success: false,
            error: 'Error adding file to MongoDB',
        });
    } finally {
        // Close the MongoDB connection after uploading data
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

module.exports = { handleFileUpload };
var mysql = require('mysql');
var ejs = require('ejs');
var fs = require('fs');
const IPFS = require('ipfs-api');
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

    var studentId = 19178855; // Specify the desired student ID

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

                // Convert the rendered HTML to a PDF file
                const pdfBuffer = Buffer.from(renderedCertificate, 'utf-8');

                // Add the PDF file to IPFS
                ipfs.add(pdfBuffer, (err, result) => {
                    if (err) {
                      console.error('Error adding file to IPFS:', err);
                      return;
                    }
                    if (result && result.cid) {
                        const cid = result.cid.toString();
                        console.log('Certificate saved to IPFS with CID:', cid);
                    } else {
                        console.log('Error adding file to IPFS');
                    }
                });

            }); // <-- fs.readFile closing

        }
    });
});

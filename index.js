const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const bodyParser = require('body-parser');
const { log } = require('console');


// database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'login-db'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// middlewares
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'static')));


// routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname + '/login.html'));
});

app.post('/auth', function (request, response) {
    let email = request.body.email;
    let password = request.body.password;

    if (email && password) {
        connection.query('SELECT * FROM users_table WHERE email = ? AND pwd = ?', [email, password], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                request.session.email = email;
                if (results[0].role == "admin") {
                    request.session.adminloggedin = true;
                    response.redirect('/admin');
                } else {
                    request.session.userloggedin = true;
                    response.redirect('/home');
                }
            } else {
                response.send('Incorrect email and/or Password!');
            }
            response.end();
        });
    } else {
        response.send('Please enter email and Password!');
        response.end();
    }
});

app.get('/home', function (request, response) {
    if (request.session.userloggedin) {
        response.sendFile(path.join(__dirname + '/index.html'));
    } else {
        response.send('Please login as user to view this page!');
    }
});

// get all the user for admin
app.get('/users', (req, res) => {
    connection.query('SELECT * FROM users_table', (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

// get user_id for logged in user
app.get('/get_user_id', (request, response) => {
    connection.query(`SELECT * FROM users_table WHERE email='${request.session.email}'`, (error, results) => {
        if (error) throw error;
        response.json(results);
    });
})

app.get('/inbox', function (request, response) {
    if (request.session.userloggedin) {
        response.sendFile(path.join(__dirname + '/inbox.html'));
    } else {
        response.send('Please login as user to view this page!');
    }
})

app.get('/admin', function (request, response) {
    if (request.session.adminloggedin) {
        response.sendFile(path.join(__dirname + '/adminDashboard.html'));
    } else {
        response.send('Please login as admin to view this page!');
    }
});

app.get('/admin/inbox', function (request, response) {
    if (request.session.adminloggedin) {
        response.sendFile(path.join(__dirname + '/admininbox.html'));
    } else {
        response.send('Please login as admin to view this page!');
    }
})

// socket
io.on('connection', (socket) => {
    socket.on('admin-message', ({ user_id_from_admin, message }) => {
        io.emit('admin-message', { user_id_from_admin, message })
    });
    socket.on('client-message', function ({ user_id_from_client, message }) {
        io.emit('client-message', { user_id_from_client, message })
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
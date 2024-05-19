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
const ejs = require("ejs");


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
app.set('view engine', 'ejs');
// app.use(express.static(path.join(__dirname, 'static')));


// routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname + '/login.html'));
});


// authentication
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


// load user's dashboard
app.get('/home', function (request, response) {
    if (request.session.userloggedin) {
        response.sendFile(path.join(__dirname + '/index.html'));
    } else {
        response.send('Please login as user to view this page!');
    }
});



// get user_id for logged in user
app.get('/get_user_id', (request, response) => {
    connection.query(`SELECT * FROM users_table WHERE email='${request.session.email}'`, (error, results) => {
        if (error) throw error;
        response.json(results);
    });
})

// load user's inbox page
app.get('/inbox', function (request, response) {
    if (request.session.userloggedin) {
        response.sendFile(path.join(__dirname + '/inbox.html'));
    } else {
        response.send('Please login as user to view this page!');
    }
})


// load admin dashboard
app.get('/admin', function (request, response) {
    if (request.session.adminloggedin) {
        response.sendFile(path.join(__dirname + '/adminDashboard.html'));
    } else {
        response.send('Please login as admin to view this page!');
    }
});


// load admin inbox page
app.get('/admin/inbox', function (request, response) {
    if (request.session.adminloggedin) {
        // response.sendFile(path.join(__dirname + '/admininbox.html'));
        connection.query('SELECT * FROM users_table', (error, results) => {
            if (error) throw error;
            response.render("admininbox", { users: results });
        });
    } else {
        response.send('Please login as admin to view this page!');
    }
})

// store admins message
app.post("/store-message", (req, res) => {
    const user_id = req.body.client_user_id;
    const message = req.body.message;
    const role = req.body.role;
    connection.query(`INSERT INTO messages (message, user_id, role, created_at) VALUES ('${message}', '${user_id}', '${role}', UNIX_TIMESTAMP(${Date.now()}))`, function (error, result) {
        res.json({ error, result })
    })
});

// load old message
app.get("/get-old-chat", (req, res) => {
    const user_id = req.query.client_user_id;
    connection.query(`SELECT * FROM messages WHERE user_id=${user_id}`, function (error, result) {
        res.json({ error, result })
    })
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


const ip = "192.168.5.240";
const port = 3000
server.listen(port, ip, () => {
    console.log('listening on *:3000');
});
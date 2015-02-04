var express  = require('express');
var port = process.env.PORT || 8080;
var app = express();

app.get('/', function(req, res) {
    res.send('Hello world');
});

app.get('/health', function(req, res) {
    res.send(200);
});

app.listen(port, function() {
    console.log('Listening on ' + port);
});

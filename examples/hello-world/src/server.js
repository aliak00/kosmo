var http = require('http');

var server = http.createServer((request, response) => {
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    response.end('Nova be bitchen yo!\n');
});

var port = process.env.PORT || 8080;
server.listen(port);

console.log('Server running at http://127.0.0.1:' + port);

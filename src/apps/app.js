var express = require('express');
var app = express();

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index')
});
app.use('/static', express.static('public'))

app.listen(8080);
console.log('Server is listening on port 8080');


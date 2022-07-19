const express = require('express');
const app = express();
app.use(express.json());
const { models: { User, Note }} = require('./db');
const path = require('path');

//this is used as a callback
const requireToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization; //this checks if there is a header;
        const user = await User.byToken(token); //token is your user, with hashing;
        req.user = user; //if the user exist, add that user to the request;
        next(); //prevents an infinite loop and allows req to move onto the next function;
    } catch (e) {
        next(e);
    }
}

app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async(req, res, next)=> {
  try {
    res.send({ token: await User.authenticate(req.body)});
  }
  catch(ex){
    next(ex);
  }
});

// you can add additional functions before the request reaches responds to the client
// app.get('/api/auth', isAdmin, isLoggedIn, requireToken, async (req, res, next) => { ...
app.get('/api/auth', requireToken, async(req, res, next)=> {
  try {
    res.send(req.user);
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users/:id/notes', requireToken, async (req, res, next) => {
    try {
        const userNotes = await Note.findAll({
            where: {
                userId: req.params.id
            }
        });
        res.send(userNotes);
    } catch (e) {
        next(e);
    }
});

app.delete('/api/auth', async(req, res, next)=> {
  try {
     res.send();
  }
  catch(ex) {
     next(ex);
  }
});

app.use((err, req, res, next)=> {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
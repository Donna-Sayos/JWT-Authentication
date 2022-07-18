const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { STRING, INTEGER } = Sequelize;
const config = {
  logging: false
};

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

const Note = conn.define("note", {
    text: STRING,
});

//Associations
User.hasMany(Note);
Note.belongsTo(User);

User.beforeCreate(async (user) => {
    const saltRounds = 10;

    const hashed = await bcrypt.hash(user.password, saltRounds);
    console.log(hashed);
    user.password = hashed;
});

User.authenticate = async({ username, password })=> {
    const user = await User.findOne({
      where: {
        username
      }
    });
    if(user){
        const match = await bcrypt.compare(password, user.password);

        if(match) {
            const token = jwt.sign({ userId: user.id }, process.env.JWT);
            console.log(token);
            return token; 
        }
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
};

User.byToken = async(token)=> {
  try {
    const id = jwt.verify(token, process.env.JWT);
    console.log(id);
    const user = await User.findByPk(id.userId);
    if(user){
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );

  const notes = [
    { text: 'Yo momma thiccccc.' },
    { text: 'You stink.' },
    { text: "Hello world. I'm gay." }
  ];

  const [note1, note2, note3] = await Promise.all(notes.map((note) => Note.create(note)));

  await lucy.setNotes(note2);
  await moe.setNotes(note3);
  await larry.setNotes(note1);

  return {
    users: {
      lucy,
      moe,
      larry
    },
    notes: {
        note1,
        note2,
        note3
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};
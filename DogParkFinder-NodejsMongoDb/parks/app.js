require('dotenv').config();

const express = require('express');
// Note: without method Override PUT & Delete methods will be undefined
const methodOverride = require('method-override');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Park = require('./models/park');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const User = require('../parks/models/User');


const fetch = require('node-fetch');

const MongoStore = require('connect-mongo');
const dbString = "mongodb+srv://testuser:Amf123456@cluster0.ddrynki.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
const connection = mongoose.createConnection(dbString);


const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//CHeck login
const authMiddleware =(req,res, next)=> {
  const token = req.cookies.token;
  if (!token){
    return res.status(401).json ({message: 'Unauthorized'});
  }
  try{
    const decoded = jwt.verify(token ,'secret');
    req.userId = decoded.userId;
    next();
  }catch(err){
    res.status(401).json({message: 'Unauthorized'});
  }
}


// express app
const app = express();


// Connect to mongo
const dbURI ='mongodb+srv://testuser:Amf123456@cluster0.ddrynki.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(dbURI)
    .then((result) => app.listen(3000))
    .catch((err) => console.log(err));



// register view engine
app.set('view engine', 'ejs');
// middleware & static files

app.use(cookieParser());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use(session({
  secret:'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({

    client: connection.getClient(),
    collection: 'session'
  }),
}));

app.use(morgan('dev'));

app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

  
app.get('/', (req, res) => {
    res.redirect('/parks');
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About' });
});


// park routes
// app.get('/parks', (req, res) => {
//     Park.find().sort( { createdAt: -1 })
//     .then(result => {
//         res.render('index', {title: 'All Parks', parks: result})
//       })
//       .catch(err => {
//         console.log(err);
//       });
// })
app.get('/parks', async (req, res) => {
  try{
   
  const response = await fetch('https://random.dog/woof.json');
  const data = await response.json();
  const dogPictureUrl = data.url;

  let perPage = 10;
  let page = req.query.page || 1;

  const parks = await Park.aggregate([ { $sort: { createdAt: -1 } } ])
  .skip(perPage * page - perPage)
  .limit(perPage)
  .exec();
  const count = await Park.countDocuments({});
  const nextPage = parseInt(page) + 1;
  const hasNextPage = nextPage <= Math.ceil(count / perPage);
  console.log(nextPage);

      res.render('index', {title: 'All Parks', parks, dogPictureUrl, 
      current: page,
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: '/'
    });
     
  }catch(err) {
      console.log(err);
    }
});



app.get('/parks/create', (req, res) => {
  res.render('create', { title: 'Add a new park' });
});

app.post('/parks', (req, res) => {
    // console.log(req.body);
    const park = new Park(req.body);
  
    park.save()
      .then(result => {
        //changed redirection from index to dashboard
        res.redirect('/dashboard');
      })
      .catch(err => {
        console.log(err);
      });
  });
  
  app.get('/parks/:id', (req, res) => {
    const id = req.params.id;
    Park.findById(id)
      .then(result => {
        res.render('details', { park: result, title: 'Park Details' });
      })
      .catch(err => {
        console.log(err);
        res.redirect('/parks');
      });
  });
  
  app.delete('/parks/:id', (req, res) => {
    const id = req.params.id;
    
    Park.findByIdAndDelete(id)
      .then(result => {
        res.json({ redirect: '/parks' });
      })
      .catch(err => {
        console.log(err);
      });
  });

  //*search
  app.post('/search', async (req, res) => {
    try {
      const locals = {
        title: "Seach",
        description: "Simple Blog created with NodeJs, Express & MongoDb."
      }
  
      let searchTerm = req.body.searchTerm;
      const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9 ]/g, "")
      const snippetSearch = searchTerm.replace(/[^a-zA-Z- ]+$/g);
      const parks = await Park.find({
        $or: [
          { title: { $regex: new RegExp(searchNoSpecialChar, 'i') }},
          { snippet: { $regex: new RegExp(snippetSearch, 'i') }},
          { body: { $regex: new RegExp(searchNoSpecialChar, 'i') }}
        ]
      });
  
      res.render("search", { title:'searchresult',parks, locals,currentRoute: '/'
      });
  
    } catch (error) {
      console.log(error);
    }
  
  });
//Admin Login page
  app.get('/admin' , async(req,res)=>{
   try{
    res.render('admin',{title: 'Admin Page'});
   }catch(err){
    console.log(err);
   }
  });


  // Post-Check Login for Admin
  app.post('/admin', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await User.findOne( { username } );
  
      if(!user) {
        return res.status(401).json( { message: 'Invalid credentials no such user' } );
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
  
      if(!isPasswordValid) {
        return res.status(401).json( { message: 'Invalid credentials wrong pass' } );
      }
  
      const token = jwt.sign({ userId: user._id}, 'secret' );
      res.cookie('token', token, { httpOnly: true });
      res.redirect('/dashboard');
  
    } catch (error) {
      console.log(error);
    }
  });

   app.get('/dashboard', authMiddleware, async(req,res)=>{
   Park.find().sort( { createdAt: -1 })
   .then(result => {
       res.render('dashboard', {title: 'dashboard Page', notif: 'User successfully signed in', parks: result})
     })
     .catch(err => {
       console.log(err);
     });

   });

//simple snippet of -Post for admin page 
  //  app.post('/admin' , async(req,res)=>{
  //   try{
  //     const { username, password} = req.body;
  //     console.log(req.body);
  //     res.redirect('/admin');


  //   }catch(err){
  //    console.log(err);
  //   }
  //  });

app.post('/register',async(req,res)=>{
  try {
    const { username, password} =req.body;
    const hashedPassword = await bcrypt.hash(password,10);
    try{
      const user = await User.create({username , password:hashedPassword});
      res.status(201).json({message: 'User Created', user});

    }catch(err){
      if(err.code === 11000){
        res.status(409).json({message: 'user already in use'});
      }
      res.status(500).json({message:'Internal server error'})
    }
  }catch (error){
    console.log(error);
  }
});
//*Admin Edit parks GET /PUT

app.get('/edit-parks/:id',authMiddleware,async(req,res)=>{
  try{
   const park = await Park.findOne({ _id: req.params.id });
    res.render('edit-parks',{title: 'Edit Park', park});
  }catch(error){
    console.log(error);
  }
});


app.put('/edit-parks/:id',authMiddleware,async(req,res)=>{
  try{
    await Park.findByIdAndUpdate(req.params.id,{
      title: req.body.title,
      snippet: req.body.snippet,
      body: req.body.body
    });
    res.redirect('/dashboard');
  }catch(error){
    console.log(error);
  }
});
  


// Admin delete post
app.delete('/delete-parks/:id',authMiddleware,async (req, res) => {

  try{
    const park = await Park.findByIdAndDelete({ _id: req.params.id });

    res.redirect('/dashboard');
  }catch(err){
    console.log(err);
  }



});
// Admin LogOut
app.get('/logout',(req,res)=>{
res.clearCookie('token');
res.redirect('/');
})

// 404 page
app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});



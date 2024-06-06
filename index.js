const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 8000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ev00748.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
  
    const guideCollection = client.db('touristssection').collection('guides');
    const commentCollection = client.db('touristssection').collection('comments');
    const tourtypeCollection = client.db('touristssection').collection('tourtype');
    const wishListCollection = client.db('touristssection').collection('wishList');
  
  
    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })
// read tourist guide data to server for menu
app.get('/guide', async(req, res) => {
  const cursor = guideCollection.find();
  const result = await cursor.toArray();
  res.send(result);
  });
  
// read Tour type  data to server for menu
app.get('/tourtype', async(req, res) => {
  const cursor = tourtypeCollection.find();
  const result = await cursor.toArray();
  res.send(result);
  });
// read package details data to server for 
app.get('/tour/:id', async (req, res) => {
  // console.log(req.params.id);
    const cursor = tourtypeCollection.findOne({_id : new ObjectId(req.params.id)});
    const result = await cursor;
    res.send(result);
  
    
  });
  
  // for tour guide details data read 
  app.get('/guide/:id', async (req, res) => {
    // console.log(req.params.id);
      const cursor = guideCollection.findOne({_id : new ObjectId(req.params.id)});
      const result = await cursor;
      res.send(result);
      })
      
      // user feedback about tourist guide data send to server

    app.post("/comment", async (req, res) => {
      const comment = req.body;
      console.log(comment);
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });
      // user feedback about tourist guide data send to server

    app.post("/wishList", async (req, res) => {
      const wishList = req.body;
      console.log(wishList);
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Tourist Guide  Server..')
})

app.listen(port, () => {
  console.log(`Tourist Guide is running on port ${port}`)
})

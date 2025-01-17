const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
// const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 8000;

// middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://tourist-guide-6180c.web.app",
    "https://tourist-guide-6180c.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ev00748.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const guideCollection = client.db("touristssection").collection("guides");
    const commentCollection = client.db("touristssection").collection("comments");
    const tourtypeCollection = client.db("touristssection").collection("tourtype");
    const wishListCollection = client.db("touristssection").collection("wishList");
    const bookingCollection = client.db("touristssection").collection("booking");
    const storyCollection = client.db("touristssection").collection("story");
    const usersCollection = client.db("touristssection").collection("users");
    const paymentCollection = client.db("touristssection").collection("payment");

// jwt related api local stroge
// app.post('/jwt', async (req, res) => {
//   const user = req.body;
//   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
//   res.send({ token });
// })





    // auth related api
    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "365d",
    //   });
    //   res
    //     .cookie("token", token, {
    //       httpOnly: true,
    //       secure: process.env.NODE_ENV === "production",
    //       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    //     })
    //     .send({ success: true });
    // });
    // // Logout
    // app.get("/logout", async (req, res) => {
    //   try {
    //     res
    //       .clearCookie("token", {
    //         maxAge: 0,
    //         secure: process.env.NODE_ENV === "production",
    //         sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    //       })
    //       .send({ success: true });
    //     console.log("Logout successful");
    //   } catch (err) {
    //     res.status(500).send(err);
    //   }
    // });

    // users related api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send("User already exists");
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // save a user data in db
    app.put("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      // check if user already exists in db
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        if (user.status === "Requested") {
          // if existing user try to change his role
          const result = await usersCollection.updateOne(query, {
            $set: { status: user?.status },
          });
          return res.send(result);
        } else {
          // if existing user login again
          return res.send(isExist);
        }
      }

      // save user for the first time
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });
    // make admin user
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    
// make guide user
app.patch('/users/guide/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: 'guide',
    }
  }
  const result = await usersCollection.updateOne(filter, updatedDoc);
  res.send(result);
})
// make request for guide user
app.patch('/user/guide/:id', async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      status: 'Want to guide',
    }
  }
  const result = await usersCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

// Update tour booking  status by tour guide
app.patch('/book/:id', async (req, res) => {
  const id = req.params.id
  console.log(id);
  const status = req.body
  const query = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: status,
  }
  const result = await bookingCollection.updateOne(query, updateDoc)
  res.send(result)
})
// tourist request for admin or guide
app.patch('/book/:id', async (req, res) => {
  const id = req.params.id
  console.log(id);
  const status = req.body
  const query = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: status,
  }
  const result = await usersCollection.updateOne(query, updateDoc)
  res.send(result)
})
    // Verify admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    // user data deleted from database by admin
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // users  data read to server for menu
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get a user info by email from db to front end useRole
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    // for my booking tour data read
    app.get("/booking/:email", async (req, res) => {
      console.log(req.params.email);
      const cursor = bookingCollection.find({ email: req.params.email });
      const result = await cursor.toArray();
      res.send(result);
    });

    // for my wish list tour data read
    app.get("/wishList/:email", async (req, res) => {
      console.log(req.params.email);
      const cursor = wishListCollection.find({ email: req.params.email });
      const result = await cursor.toArray();
      res.send(result);
    });
    
    // tour guide select by tourist  read to server
    app.get("/booking/:email", async (req, res) => {
      console.log(req.params.email);
      const cursor = bookingCollection.find({ email: req.params.email });
      const result = await cursor.toArray();
      res.send(result);
    });
    // tour guide select by tourist  read to server
    app.get("/booking/:GuideName", async (req, res) => {
      console.log(req.params.GuideName);
      const cursor = bookingCollection.find({ GuideName: req.params.GuideName });
      const result = await cursor.toArray();
      res.send(result);
    });
    // tour guide select by tourist  read to server
    app.get("/booking/guide/:guideemail", async (req, res) => {
      console.log(req.params.guideemail);
      const cursor = bookingCollection.find({ guideemail: req.params.guideemail });
      const result = await cursor.toArray();
      res.send(result);
    });
    
    app.get("/allguides", async (req, res) => {
     
      const cursor = usersCollection.find({ role:'guide'});
      const result = await cursor.toArray();
      res.send(result);
    });

    // read tourist guide data to server for menu
    app.get("/guide", async (req, res) => {
      const cursor = guideCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // read Tour type  data to server for menu
    app.get("/tourtype", async (req, res) => {
      const cursor = tourtypeCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // read package details data to server for
    app.get("/tourtype/:id", async (req, res) => {
      // console.log(req.params.id);
      const cursor = tourtypeCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      const result = await cursor;
      res.send(result);
    });

    // for tour guide details data read
    app.get("/guide/:id", async (req, res) => {
      // console.log(req.params.id);
      const cursor = guideCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      const result = await cursor;
      res.send(result);
    });
    
    // app.get("/guide/:id", async (req, res) => {
    //   // console.log(req.params.id);
    //   const cursor = guideCollection.findOne({
    //     _id: new ObjectId(req.params.id),
    //   });
    //   const result = await cursor;
    //   res.send(result);
    // });
    // read Tour story  data to server for menu
    app.get("/tourstory", async (req, res) => {
      const cursor = storyCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // for tour story details data read
    app.get("/tourstory/:id", async (req, res) => {
      console.log(req.params.id);
      const cursor = storyCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      const result = await cursor;
      res.send(result);
    });

    // booking  data to server for menu
    app.get("/booking", async (req, res) => {
      const cursor = bookingCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // wish list   data to server for menu
    app.get("/wishList", async (req, res) => {
      const cursor = wishListCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    

    // user feedback about tourist guide data send to server

    app.post("/wishList", async (req, res) => {
      const wishList = req.body;
      console.log(wishList);
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });
    
    // add tour by admin
    app.post("/tourtype", async (req, res) => {
      const tourtype = req.body;
      
      const result = await tourtypeCollection.insertOne(tourtype);
      res.send(result);
    });
    
    
// user feedback about tourist guide data send to server

app.post("/comment", async (req, res) => {
  const comment = req.body;
  console.log(comment);
  const result = await commentCollection.insertOne(comment);
  res.send(result);
});
    // user booking tour data send to server

    app.post("/booking", async (req, res) => {
      const tourBooking = req.body;
      console.log(tourBooking);
      const result = await bookingCollection.insertOne(tourBooking);
      res.send(result);
    });

    // user post a  tour  story data send to server

    app.post("/story", async (req, res) => {
      const tourstory = req.body;
      console.log(tourstory);
      const result = await storyCollection.insertOne(tourstory);
      res.send(result);
    });

    //delete booking  collection data

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    //delete wishlist  collection data

    app.delete("/wishList/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });
    
     // payment intent
     app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });
    
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Tourist Guide  Server..");
});

app.listen(port, () => {
  console.log(`Tourist Guide is running on port ${port}`);
});

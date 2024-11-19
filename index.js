const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000
const cors = require('cors')

const stripe = require("stripe")(process.env.sk);

//middleware
app.use(cors({
  origin: ["https://user-email-password-auth-13c4c.web.app","http://localhost:5173","https://user-email-password-auth-13c4c.firebaseapp.com"],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hblj92w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const productCollection = client.db("lifestyle").collection("product");
    const userCollection = client.db("lifestyle").collection("users");
    const addChartCollection = client.db("lifestyle").collection("addChart");
    const PaymentSuccessCollection = client.db("lifestyle").collection("paymentSuccess");
    const AdminCheckCollection = client.db("lifestyle").collection("additem");

    //jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })
    const verifyToken = (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1]; // Extract token

      if (!token) {
        return res.status(403).send('No token provided');
      }

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send('Invalid token');
        }
        req.decoded = decoded; // Attach decoded token to req object
        next();
      });
    };


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: 'fobidden access' })

      }
      next()
    }

    app.get('/products', async (req, res) => {
      const products = await productCollection.find().toArray()
      res.send(products)

    })
    //product delete
     app.delete('/product/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const  result = await productCollection.deleteOne(query)
      res.send(result)
     })

    //add product
    app.post('/addProduct', async (req, res) => {
      const product = req.body
      const result = await productCollection.insertOne(product)
      res.send(result)
    })
    app.delete('/deleteProduct/:id', async (req, res) => {
      const id = req.params.id
      const result = await AdminCheckCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const exist = await userCollection.findOne(query)
      if (exist) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      // console.log('Decoded email from token:', req.decoded.email);

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const quary = { email: email }
      const user = await userCollection.findOne(quary);
      // console.log('User fetched from DB:', user); // Log the user data

      const admin = user?.role === 'admin'; // Check if the role is 'admin'
      // console.log('Is Admin:', admin); // Log whether the user is an admin or not

      res.send({ admin });
    });


    app.get('/users', async (req, res) => {
      const users = await userCollection.find().toArray()
      res.send(users)
    })
    //delete user
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })
    //make admin
    app.put('/users/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          role: 'admin',
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })

    //get  PaymentSuccessCollection in  frontend
    app.get('/paymentSuccess', async (req, res) => {
      const paymentSuccess = await PaymentSuccessCollection.find().toArray()
      res.send(paymentSuccess)
    })

    app.post('/add/chart', async (req, res) => {
      const chart = req.body
      const result = await addChartCollection.insertOne(chart)
      res.send(result)
    })
    //get adddata
    app.get('/add/chart', async (req, res) => {
      const products = await addChartCollection.find().toArray()
      res.send(products)
    })
    //delet adddata
    app.delete('/add/chart/:id', async (req, res) => {
      const id = req.params.id
      const result = await addChartCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })
    //delete that match user email
    app.delete('/add/chart', async (req, res) => {
      const quary = req.query.email
      const result = await addChartCollection.deleteMany(quary)
      res.send(result)
    })
    //update status
    app.put('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const { order_status } = req.body
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          order_status: order_status,
        },
      };
      const result = await PaymentSuccessCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    //product data save after payment success
    app.post('/add/chart/payment', async (req, res) => {
      const chart = req.body
      if (Array.isArray(chart)) {
        const result = await PaymentSuccessCollection.insertMany(chart); // Ensure chart is an array
        res.send(result);
      } else {
        const result = await PaymentSuccessCollection.insertOne(chart)
        res.send(result)
      }


    })
    app.get('/add/chart/payment', async (req, res) => {
      const result = await PaymentSuccessCollection.find().toArray()
      res.send(result)

    })

    //payment
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });

    });
    //add item
    app.post('/add/item', async (req, res) => {
      const item = req.body
      const result = await AdminCheckCollection.insertOne(item)
      res.send(result)
    })
    app.get('/add/item', async (req, res) => {
      const products = await AdminCheckCollection.find().toArray()
      res.send(products)
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('working')
})

app.listen(port, () => {
  console.log(`server is running on port ${port}`)
})
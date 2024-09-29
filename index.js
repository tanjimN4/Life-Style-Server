const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const cors = require('cors')


//middleware
app.use(cors())
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

    app.get('/products', async (req, res) => {
      const products = await productCollection.find().toArray()
      res.send(products)

    })
    app.post('/users', async (req, res) => {
      const user = req.body
      const result = await userCollection.insertOne(user)
      res.send(result)
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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
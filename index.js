const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config();
const app = express()

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.itpj9d6.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();
    
    const usersCollection = client.db('college-booker').collection('users')
    const collegesCollection = client.db('college-booker').collection('colleges')


    
    // users related apis
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(req.body);
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get('/colleges', async (req, res) => {
      const result = await collegesCollection.find().toArray();
      res.send(result);
    });

    app.get("/profile/update/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const userProfile = await usersCollection.findOne({ email });
        if (!userProfile) {
          return res.status(404).json({ message: "User profile not found" });
        }
        res.json(userProfile);
      } catch (error) {
        console.error("Error retrieving user profile:", error);
        res.status(500).json({ message: "An error occurred while retrieving user profile" });
      }
    });
    
app.post("/profile/update/:email",async (req, res) => {
  const { email } = req.params;
   console.log(email);
  const { name, photoURL, phoneNumber, address, gender } = req.body;
  try {
    const result=await usersCollection.updateOne(
      { email },
      { $set: { name, photoURL, phoneNumber, address, gender } }
    );
    res.send(result)
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "An error occurred while updating user profile" });
  }
});

// .post(`http://localhost:5000/candidates/${college._id}`, {
  
app.post('/candidates/:id', async (req, res) => {
  const productId = req.params.id;
  const newCandidate = req.body.data;
  console.log(productId, newCandidate);
// Find the product by ID and push the new comment and rating
const result = await collegesCollection.findOneAndUpdate(
      { _id: new ObjectId(productId) },
      { $push: { candidate: newCandidate } },
      { returnOriginal: false },
    );
    res.send(result);
});

// GET my colleges by candidateEmail
app.get('/my-colleges/:candidateEmail', async (req, res) => {
  const candidateEmail = req.params.candidateEmail;
  try {
    // Find colleges that have the provided candidateEmail in their 'candidate' array
    const result = await collegesCollection.find({ "candidate.candidateEmail": candidateEmail }).toArray();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
// comment  APIs
app.post('/college/review/:id', async (req, res) => {
  const collegeId = req.params.id;
  const newReview = req.body.newReview;
// Find the product by ID and push the new comment and rating
const result = await collegesCollection.findOneAndUpdate(
      { _id: new ObjectId(collegeId) },
      { $push: { reviews: newReview } },
      { returnOriginal: false },
    );
    res.send(result);
});

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      console.log(token)
      res.send({ token })
    })

    


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Your server is running')
})

app.listen(port, () => {
  console.log(`server is running on port ${port}`)
})


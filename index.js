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
    
app.post("/profile/update/:Id",async (req, res) => {
  const {Id} = req.params;
  console.log(Id);
  const { name, photoURL, phoneNumber, address, gender, university  } = req.body;
  console.log(req.body);
  try {
    const result=await usersCollection.updateOne(
      { _id: new ObjectId(Id) },
      { $set: { name, photoURL, phoneNumber, address, gender, university } }
    );
    console.log(result);
    res.send(result)
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "An error occurred while updating user profile" });
  }
});


app.post('/candidates/:id', async (req, res) => {
  
    const collegeId = req.params.id;
    const newCandidate = req.body.data;
    const query = await collegesCollection.findOne({ _id: new ObjectId(collegeId) });
    const result = await collegesCollection.findOneAndUpdate(
      { _id: new ObjectId(collegeId) },
      { $push: { candidate: newCandidate } },
      { returnOriginal: false },
    );
    res.send(result);
});
 
// Route to get all "my colleges" for a specific candidateEmail
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
app.post('/college/review/:id', async (req, res) => {
  const collegeId = req.params.id;
  const newReview = req.body.newReview;

  try {
    const college = await collegesCollection.findOne({ _id: new ObjectId(collegeId) });

    if (!college) {
      return res.status(404).send('College not found');
    }
    if (!college.reviews) {
      college.reviews = [];
    }
    const existingReviewIndex = college.reviews.findIndex(review => review.candidateEmail === newReview.candidateEmail);

    if (existingReviewIndex !== -1) {
      college.reviews.splice(existingReviewIndex, 1, newReview);
    } else {
      college.reviews.push(newReview);
    }
    // Update the college document with the updated reviews
    const result = await collegesCollection.findOneAndUpdate(
      { _id: new ObjectId(collegeId) },
      { $set: { reviews: college.reviews } },
      { returnOriginal: false },
    );

    res.send(result);
  } catch (error) {
    console.error('Error updating reviews:', error);
    res.status(500).send('Error updating reviews');
  }
});


    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      console.log(token)
      res.send({ token })
    })

    app.get("/search-colleges/:searchQuery", async (req, res) => {
      const searchQuery = req.params.searchQuery.toLowerCase();
      try {
      
    
        // Filter the colleges based on the search query using MongoDB's find method
        const searchResults = await collegesCollection
          .find({ name: { $regex: new RegExp(searchQuery, "i") } })
          .toArray();
    
        res.json(searchResults);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });


    
// Products route with pagination
app.get('/all-colleges', async (req, res) => {
  const pageNumber = parseInt(req.query.pageNumber) || 1;    
  const limit = parseInt(req.query.limit) || 3;      
  const skip = (pageNumber - 1) * limit;
  const totalCount = await collegesCollection.countDocuments();
  const totalPages = Math.ceil(totalCount / limit);
  
    const colleges = await collegesCollection.find().skip(skip).limit(limit).toArray();
   res.json({
     colleges,
     totalCount,
     totalPages,
     currentPage: pageNumber
   });
 });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Your server is running')
})

app.listen(port, () => {
  console.log(`server is running on port ${port}`)
})


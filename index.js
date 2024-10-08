const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://gadget-and-grove.web.app",
    "https://gadget-and-grove.firebaseapp.com",
    "https://gadget-and-grove.netlify.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());

// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@smdeveloper.7rzkdcv.mongodb.net/?retryWrites=true&w=majority&appName=SMDeveloper`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("gadgetgrove").collection("users");
    const menuCollection = client.db("gadgetgrove").collection("menu");

    // save user data in db
    app.put("/user", async (req, res) => {
      const user = req.body;
      const filter = { email: user?.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: user?.name,
          email: user?.email,
          photo: user?.photo,
          lastLogin: user?.lastLogin,
        },
        $setOnInsert: {
          role: user?.role,
          status: user?.status,
          createdAt: user?.createdAt,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // get all users base on email
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // get all products
    app.get("/products", async (req, res) => {
      const size = parseInt(req.query.size) || 6;
      const page = parseInt(req.query.page) - 1;
      const search = req.query.search || "";
      const category = req.query.category || "";
      const brand = req.query.brand || "";
      const minPrice = parseInt(req.query.minPrice) || 0;
      const maxPrice = parseInt(req.query.maxPrice) || 200000;
      const sort = req.query.sort || "";

      const query = {
        product_name: { $regex: search, $options: "i" },
        product_category: { $regex: category, $options: "i" },
        product_brand: { $regex: brand, $options: "i" },
        price: { $gte: minPrice, $lte: maxPrice },
      };

      let products = menuCollection.find(query);

      if (sort === "lth") {
        products = products.sort({ price: 1 }); // low to high
      } else if (sort === "htl") {
        products = products.sort({ price: -1 }); // high to low
      } else if (sort === "new") {
        products = products.sort({ published_date: -1 }); // new to old
      }

      const count = await menuCollection.countDocuments(query);

      const productsData = await products
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ productsData, count });
    });

    // Post new product
    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await menuCollection.insertOne(product);
      res.send(result);
    });

    // get all products categorylist
    app.get("/products/category", async (req, res) => {
      const search = req.query.search || "";
      const category = req.query.category || "";
      const brand = req.query.brand || "";

      const query = {
        product_name: { $regex: search, $options: "i" },
        product_category: { $regex: category, $options: "i" },
        product_brand: { $regex: brand, $options: "i" },
      };

      let products = menuCollection.find(query);

      // Convert cursor to array to get the products
      const productsList = await products.toArray();

      // Extract unique categories from the filtered products
      const categories = [
        ...new Set(productsList.map((product) => product.product_category)),
      ];

      // Extract unique brands from the filtered products
      const brands = [
        ...new Set(productsList.map((product) => product.product_brand)),
      ];

      res.send({ categories, brands });
    });

    // get all products maxprice

    app.get("/products/max-price", async (req, res) => {
      const maxPriceNumber = await menuCollection
        .aggregate([
          { $group: { _id: null, maxPrice: { $max: "$price" } } },
          { $project: { _id: 0, maxPrice: 1 } },
        ])
        .toArray();
      res.send(maxPriceNumber);
    });

    // console.log("You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.log);

app.get("/", (req, res) => {
  res.send("Hello from gadget grove Server..");
});

app.listen(port, () => {
  console.log(`Server is running on Local: http://localhost:${port}`);
});

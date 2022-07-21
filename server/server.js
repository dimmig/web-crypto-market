const axios = require("axios");

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.post("/", async (req, res) => {
  try {
    const name = req.body.name;

    const reqToTheServer = await axios.get(
      `https://testnet-api.kitwallet.app/account/${name}/likelyTokens`,
      {
        headers: {
          Referer: "https://wallet.testnet.near.org",
        },
      }
    );
    res.send(reqToTheServer.data);
  } catch (e) {
    console.log(e);
  }
});

app.get("/", (req, res) => {
  res.send("Server started at port 2400");
});

app.listen(2400, () => {
  console.log("Server started at port 2400");
});

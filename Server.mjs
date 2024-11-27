import fetch from "node-fetch";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const SPOTIFY_CLIENT_ID = "5fbeb9e0bb1d4afa9c16bd6cb0b2f70f";
const SPOTIFY_CLIENT_SECRET = "c43262f7d57e43ea8b09fdfe7fc86cb7";
const REDIRECT_URI = "http://localhost:3000/callback"; // Match this in Spotify Dashboard

let currentAccessToken = null; //Stores the access token temporarily
let savedTrackData = []; //Stores the saved tracks temporarily

// Step 1: Redirect user to Spotify for authorization
app.get("/login", (req, res) => {
  const scopes = "user-read-private user-read-email user-library-read"; // Add required scopes
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${SPOTIFY_CLIENT_ID}&scope=${encodeURIComponent(
    scopes
  )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(authUrl);
});

// Step 2: Handle Spotify callback and exchange code for token
app.get("/callback", async (req, res) => {
  const code = req.query.code; // Authorization code from Spotify
  if (!code) {
    return res.status(400).send("Authorization code missing");
  }

  const tokenUrl = "https://accounts.spotify.com/api/token";
  const authHeader = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description);
    }

    // Access token
    currentAccessToken = tokenData.access_token;

    res.send(`Access Token: ${currentAccessToken}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error exchanging code for token");
  }
});

// Example: Route to get saved tracks
app.get("/saved-tracks", async (req, res) => {
  if (!currentAccessToken) {
    return res.status(401).send("Authorization required");
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/tracks", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      savedTrackData = data.items;
      res.json(data);
    } else {
      res.status(response.status).send(data.error.message);
    }
  } catch (error) {
    console.error("Error fetching saved tracks:", error);
    res.status(500).send("Error fetching saved tracks");
  }
});

// Step 3: Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

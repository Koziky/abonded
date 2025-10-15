import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.static(__dirname));
app.use(express.json());

const dataFile = path.join(__dirname, "songs.json");

app.get("/songs", (req, res) => {
  fs.readFile(dataFile, "utf8", (err, data) => {
    if (err) return res.json([]);
    res.json(JSON.parse(data));
  });
});

app.post("/addSong", (req, res) => {
  const song = req.body;
  fs.readFile(dataFile, "utf8", (err, data) => {
    let songs = [];
    if (!err && data) songs = JSON.parse(data);
    songs.push(song);
    fs.writeFile(dataFile, JSON.stringify(songs, null, 2), () => {
      res.json({ status: "ok" });
    });
  });
});

app.listen(3000, () => console.log("KozyMusic running at http://localhost:3000"));

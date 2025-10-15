const ytInput = document.getElementById('ytInput');
const addBtn = document.getElementById('addBtn');
const songList = document.getElementById('songList');
const playPauseBtn = document.getElementById('playPauseBtn');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const playerThumb = document.getElementById('playerThumb');
const playerTitle = document.getElementById('playerTitle');
const progressBar = document.getElementById('progressBar');

let songs = [];
let currentIndex = -1;
let audio = new Audio();

async function loadSongs() {
  const res = await fetch('/songs');
  songs = await res.json();
  renderSongs();
}

function renderSongs() {
  songList.innerHTML = '';
  songs.forEach((song, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.innerHTML = `
      <img src="${song.thumbnail}" alt="">
      <h3>${song.title}</h3>
      <button onclick="playSong(${index})">▶️</button>
    `;
    songList.appendChild(li);
  });
}

async function playSong(index) {
  currentIndex = index;
  const song = songs[index];
  playerThumb.src = song.thumbnail;
  playerTitle.textContent = song.title;
  audio.src = song.url;
  audio.play();
  playPauseBtn.textContent = '⏸️';
}

playPauseBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = '⏸️';
  } else {
    audio.pause();
    playPauseBtn.textContent = '▶️';
  }
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < songs.length - 1) playSong(currentIndex + 1);
});
prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) playSong(currentIndex - 1);
});

addBtn.addEventListener('click', async () => {
  const link = ytInput.value.trim();
  if (!link.includes('youtube.com/watch?v=')) return alert('Invalid YouTube URL!');
  const res = await fetch(`https://noembed.com/embed?url=${link}`);
  const data = await res.json();
  const videoId = new URL(link).searchParams.get('v');
  const newSong = {
    title: data.title,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${videoId}`
  };
  await fetch('/addSong', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(newSong)
  });
  ytInput.value = '';
  loadSongs();
});

loadSongs();

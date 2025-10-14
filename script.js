const ytInput = document.getElementById('yt-link');
const addBtn = document.getElementById('add-btn');
const playlist = document.getElementById('playlist');
const playerFrame = document.getElementById('yt-player');
const nowPlaying = document.getElementById('now-playing');
const videoWrapper = document.querySelector('.video-wrapper');

let songs = [];
let currentIndex = 0;

addBtn.addEventListener('click', async () => {
  const url = ytInput.value.trim();
  if (!url) return alert("Please enter a YouTube link!");

  const videoId = extractVideoId(url);
  if (!videoId) return alert("Invalid YouTube URL!");

  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();

    const song = {
      title: data.title,
      thumbnail: data.thumbnail_url,
      id: videoId
    };
    songs.push(song);
    ytInput.value = '';
    renderPlaylist();
  } catch (err) {
    console.error(err);
    alert("Failed to fetch video info.");
  }
});

function extractVideoId(url) {
  const regex = /(?:v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function renderPlaylist() {
  playlist.innerHTML = "";
  if (songs.length === 0) {
    playlist.innerHTML = `<p class="empty">No songs added yet. Paste a YouTube link above!</p>`;
    return;
  }

  songs.forEach((song, i) => {
    const card = document.createElement('div');
    card.classList.add('song-card');
    card.innerHTML = `
      <img src="${song.thumbnail}" alt="${song.title}">
      <h3>${song.title}</h3>
    `;
    card.addEventListener('click', () => playSong(i));
    playlist.appendChild(card);
  });
}

function playSong(index) {
  currentIndex = index;
  const song = songs[index];
  if (!song) return;

  videoWrapper.style.display = 'block';
  playerFrame.src = `https://www.youtube.com/embed/${song.id}?autoplay=1`;
  nowPlaying.textContent = `Now Playing: ${song.title}`;
}

document.getElementById('next-btn').addEventListener('click', () => {
  if (songs.length === 0) return;
  currentIndex = (currentIndex + 1) % songs.length;
  playSong(currentIndex);
});

document.getElementById('prev-btn').addEventListener('click', () => {
  if (songs.length === 0) return;
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong(currentIndex);
});

document.getElementById('play-btn').addEventListener('click', () => {
  const song = songs[currentIndex];
  if (song) playSong(currentIndex);
});

document.getElementById('pause-btn').addEventListener('click', () => {
  playerFrame.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
});

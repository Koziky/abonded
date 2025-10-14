const ytInput = document.getElementById('yt-link');
const addBtn = document.getElementById('add-btn');
const playlist = document.getElementById('playlist');
const playerFrame = document.getElementById('yt-player');
const nowPlaying = document.getElementById('now-playing');

let songs = [];
let currentIndex = -1;

addBtn.addEventListener('click', async () => {
  const url = ytInput.value.trim();
  if (!url) return alert("Please enter a YouTube link!");

  const videoId = extractVideoId(url);
  if (!videoId) return alert("Invalid YouTube link!");

  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();

    const song = {
      title: data.title,
      author: data.author_name || "Unknown Artist",
      thumbnail: data.thumbnail_url,
      id: videoId
    };

    songs.push(song);
    ytInput.value = "";
    renderPlaylist();
  } catch (err) {
    console.error("Error fetching video:", err);
    alert("Failed to load video info!");
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
    playlist.innerHTML = `<p class="empty">No songs yet — add one above!</p>`;
    return;
  }

  songs.forEach((song, i) => {
    const card = document.createElement('div');
    card.classList.add('song-card');
    card.innerHTML = `
      <img src="${song.thumbnail}" alt="${song.title}">
      <h4>${song.title}</h4>
      <p>${song.author}</p>
    `;
    card.addEventListener('click', () => playSong(i));
    playlist.appendChild(card);
  });
}

function playSong(index) {
  currentIndex = index;
  const song = songs[index];
  nowPlaying.textContent = `Now Playing: ${song.title} — ${song.author}`;
  playerFrame.src = `https://www.youtube.com/embed/${song.id}?autoplay=1`;
  playerFrame.style.display = 'none'; // Hidden but still plays
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
  if (currentIndex === -1 && songs.length > 0) playSong(0);
  else playerFrame.src += "&autoplay=1";
});

document.getElementById('pause-btn').addEventListener('click', () => {
  playerFrame.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
});

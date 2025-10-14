const playlist = document.getElementById('playlist');
const addBtn = document.getElementById('add-btn');
const ytInput = document.getElementById('yt-link');

let songs = [];

addBtn.addEventListener('click', async () => {
  const url = ytInput.value.trim();
  if (!url) return alert("Please paste a YouTube link!");

  const videoId = extractVideoId(url);
  if (!videoId) return alert("Invalid YouTube link!");

  const apiUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    const song = {
      title: data.title,
      thumbnail: data.thumbnail_url,
      url: url
    };

    songs.push(song);
    renderPlaylist();
    ytInput.value = "";
  } catch (err) {
    console.error(err);
  }
});

function renderPlaylist() {
  playlist.innerHTML = "";
  if (songs.length === 0) {
    playlist.innerHTML = `<p class="placeholder">Your playlist is empty. Add some YouTube songs!</p>`;
    return;
  }

  songs.forEach(song => {
    const card = document.createElement('div');
    card.classList.add('song-card');
    card.innerHTML = `
      <img src="${song.thumbnail}" alt="${song.title}">
      <h3>${song.title}</h3>
      <button class="btn play-btn">Play</button>
    `;
    card.querySelector('.play-btn').addEventListener('click', () => playSong(song.url));
    playlist.appendChild(card);
  });
}

function extractVideoId(url) {
  const regex = /(?:v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function playSong(url) {
  window.open(url, "_blank");
}

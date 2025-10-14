/* Koziky — Spotify-like YouTube player (IFrame API + noembed for metadata)
   - Paste YouTube link (watch?v=..., youtu.be/..., embed/... or plain id)
   - Click Add to fetch metadata and add to playlist
   - Play / Pause / Prev / Next / Seek / Volume
   - LocalStorage persistence
*/

// --- State & DOM ---
let player; // YT player object (hidden)
let songs = JSON.parse(localStorage.getItem('kozy_songs') || '[]');
let currentIndex = parseInt(localStorage.getItem('kozy_index') || '-1', 10);
if (isNaN(currentIndex)) currentIndex = -1;

const ytInput = document.getElementById('yt-input');
const addBtn = document.getElementById('add-btn');
const playlistEl = document.getElementById('playlist');
const playlistCount = document.getElementById('playlist-count');
const filterInput = document.getElementById('filter');
const trendingRow = document.getElementById('trending-row');

const playingThumb = document.getElementById('playing-thumb');
const playingTitle = document.getElementById('playing-title');
const playingSub = document.getElementById('playing-sub');

const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const seek = document.getElementById('seek');
const curtime = document.getElementById('curtime');
const durtime = document.getElementById('durtime');
const volumeEl = document.getElementById('volume');

// persist helper
function persist() {
  localStorage.setItem('kozy_songs', JSON.stringify(songs));
  localStorage.setItem('kozy_index', String(currentIndex));
}

// robust video ID extractor
function extractVideoId(u) {
  if (!u) return null;
  const s = u.trim();
  // plain id
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  // youtu.be/ID
  const by = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (by) return by[1];
  // v=ID
  const v = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (v) return v[1];
  // embed/ID
  const em = s.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  if (em) return em[1];
  // fallback: search first 11-char token
  const token = s.match(/([A-Za-z0-9_-]{11})/);
  return token ? token[1] : null;
}

// fetch metadata using noembed (no API key)
async function fetchMeta(id) {
  const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
  if (!res.ok) throw new Error('meta fetch failed');
  const j = await res.json();
  return {
    title: j.title || 'Untitled',
    thumbnail: j.thumbnail_url || '',
    author: j.author_name || ''
  };
}

// Render trending placeholder (you can later populate with curated thumbnails)
function renderTrending() {
  trendingRow.innerHTML = '';
  // show nothing or sample placeholders
  for (let i = 0; i < 6; i++) {
    const t = document.createElement('div');
    t.className = 'tile';
    t.innerHTML = `<img src="https://picsum.photos/seed/trend${i}/400/400" alt="t"><div style="margin-top:8px;font-size:13px;color:var(--muted)">Trending ${i+1}</div>`;
    trendingRow.appendChild(t);
  }
}

// Render playlist rows
function renderPlaylist(filterText = '') {
  playlistEl.innerHTML = '';
  const items = songs.filter(s => s.title.toLowerCase().includes(filterText.toLowerCase()));
  playlistCount && (playlistCount.textContent = items.length);
  if (items.length === 0) {
    playlistEl.innerHTML = `<div style="color:var(--muted);padding:16px">No songs in playlist</div>`;
    return;
  }
  items.forEach((s, idx) => {
    const globalIndex = songs.indexOf(s);
    const tr = document.createElement('div');
    tr.className = 'track';
    tr.innerHTML = `
      <img class="track-thumb" src="${s.thumbnail}" alt="">
      <div>
        <div class="track-title">${s.title}</div>
        <div class="track-sub">${s.author || ''}</div>
      </div>
      <div class="track-actions">
        <button class="small-btn play">Play</button>
        <button class="small-btn remove">Remove</button>
      </div>
    `;
    // Play button
    tr.querySelector('.play').addEventListener('click', (e) => {
      e.stopPropagation();
      playIndex(globalIndex);
    });
    // Remove
    tr.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeIndex(globalIndex);
    });
    // double click play
    tr.addEventListener('dblclick', () => playIndex(globalIndex));
    playlistEl.appendChild(tr);
  });
}

// add song click
addBtn.addEventListener('click', async () => {
  const url = ytInput.value.trim();
  if (!url) return alert('Paste YouTube link or ID');
  const id = extractVideoId(url);
  if (!id) return alert('Could not parse YouTube ID');
  try {
    addBtn.disabled = true; addBtn.textContent = 'Adding...';
    const meta = await fetchMeta(id);
    songs.push({ id, title: meta.title, thumbnail: meta.thumbnail, author: meta.author });
    persist();
    renderPlaylist(filterInput.value || '');
    ytInput.value = '';
    // if first song, cue it
    if (songs.length === 1) {
      currentIndex = 0;
      persist();
      cueIndex(0);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to fetch video info (noembed may be down). Try again later.');
  } finally {
    addBtn.disabled = false; addBtn.textContent = 'Add';
  }
});

// remove index
function removeIndex(i) {
  if (i < 0 || i >= songs.length) return;
  const wasCurrent = (i === currentIndex);
  songs.splice(i, 1);
  if (wasCurrent) {
    stopAndClear();
    currentIndex = -1;
  } else if (currentIndex > i) {
    currentIndex--;
  }
  persist();
  renderPlaylist(filterInput.value || '');
  updateNowPlayingUI();
}

// play a given index
function playIndex(i) {
  if (i < 0 || i >= songs.length) return;
  currentIndex = i;
  persist();
  const s = songs[i];
  if (!player) { // YT API not ready yet — cue and set UI
    updateNowPlayingUI();
    return;
  }
  player.loadVideoById(s.id);
  player.playVideo();
  updateNowPlayingUI();
}

// cue but not autoplay
function cueIndex(i) {
  if (i < 0 || i >= songs.length) return;
  currentIndex = i;
  persist();
  const s = songs[i];
  if (player) player.cueVideoById(s.id);
  updateNowPlayingUI();
}

function stopAndClear() {
  try { if (player) player.stopVideo(); } catch (e) {}
  updateNowPlayingUI();
}

// update UI for now playing
function updateNowPlayingUI() {
  if (currentIndex >= 0 && songs[currentIndex]) {
    const s = songs[currentIndex];
    playingThumb.src = s.thumbnail;
    playingTitle.textContent = s.title;
    playingSub.textContent = s.author || '';
  } else {
    playingThumb.src = '';
    playingTitle.textContent = 'Not Playing';
    playingSub.textContent = '—';
  }
}

// prev/next handlers
prevBtn.addEventListener('click', () => {
  if (songs.length === 0) return;
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playIndex(currentIndex);
});
nextBtn.addEventListener('click', () => {
  if (songs.length === 0) return;
  currentIndex = (currentIndex + 1) % songs.length;
  playIndex(currentIndex);
});

// play/pause button behavior (toggle)
playBtn.addEventListener('click', () => {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else {
    if (currentIndex < 0 && songs.length > 0) playIndex(0);
    else player.playVideo();
  }
});

// seek
let isSeeking = false;
seek.addEventListener('input', () => { isSeeking = true; });
seek.addEventListener('change', () => {
  if (!player) return;
  const pct = Number(seek.value) / 100;
  const dur = player.getDuration() || 0;
  player.seekTo(dur * pct, true);
  isSeeking = false;
});

// volume control
volumeEl.addEventListener('input', () => {
  if (player) player.setVolume(Number(volumeEl.value));
  localStorage.setItem('kozy_vol', String(volumeEl.value));
});

// filter local playlist
filterInput && filterInput.addEventListener('input', () => {
  renderPlaylist(filterInput.value || '');
});

// periodic progress update
setInterval(() => {
  if (!player || typeof player.getDuration !== 'function') return;
  try {
    const dur = player.getDuration() || 0;
    const cur = player.getCurrentTime() || 0;
    if (!isSeeking && dur > 0) {
      seek.value = Math.min(100, Math.max(0, (cur / dur) * 100));
    }
    curtime.textContent = formatTime(cur);
    durtime.textContent = formatTime(dur);
  } catch (e) {}
}, 500);

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  s = Math.floor(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// handle YT player state changes
function onPlayerStateChange(event) {
  // ended -> auto next
  if (event.data === YT.PlayerState.ENDED) {
    if (songs.length > 0) {
      currentIndex = (currentIndex + 1) % songs.length;
      persist();
      playIndex(currentIndex);
    }
  }
}

// Initialize trending / UI
renderTrending();
renderPlaylist(filterInput ? filterInput.value : '');
updateNowPlayingUI();

// --- YouTube IFrame API setup ---
function onYouTubeIframeAPIReady() {
  // create hidden dom element for player
  const container = document.getElementById('yt-player-container');
  container.innerHTML = '<div id="ytplayer"></div>';
  player = new YT.Player('ytplayer', {
    height: '0',
    width: '0',
    playerVars: { controls: 0, rel: 0, modestbranding: 1 },
    events: {
      onReady: (ev) => {
        // restore volume
        const vol = parseInt(localStorage.getItem('kozy_vol') || '50', 10);
        volumeEl.value = vol;
        player.setVolume(vol);
        // if last index present, cue it
        if (currentIndex >= 0 && songs[currentIndex]) {
          player.cueVideoById(songs[currentIndex].id);
          updateNowPlayingUI();
        }
      },
      onStateChange: onPlayerStateChange
    }
  });
}

// Save currentIndex on unload
window.addEventListener('beforeunload', () => persist());

// Keyboard space toggles
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (player) {
      const state = player.getPlayerState();
      if (state === YT.PlayerState.PLAYING) player.pauseVideo();
      else player.playVideo();
    }
  }
});

// KozyMusic — Spotify-desktop-like web player (client-side)
// - Preloaded demo tracks
// - Add YouTube link (YouTube IFrame) or MP3 URL
// - Drag & drop reorder saved to localStorage
// - Play / Pause / Next / Prev / Seek / Volume
// - No server required (fully client-side)

let ytPlayer = null;          // YT iframe player
let usingYT = false;          // whether current playback is YT
let songs = JSON.parse(localStorage.getItem('km_songs') || '[]');
let currentIndex = parseInt(localStorage.getItem('km_index') || '-1', 10);
if (isNaN(currentIndex)) currentIndex = -1;

const demo = [
  { id:null, title:"Demo Chill", artist:"Demo Artist", thumbnail:"https://picsum.photos/seed/1/400/400", audio:"https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3" },
  { id:null, title:"Demo Pop", artist:"Demo Artist", thumbnail:"https://picsum.photos/seed/2/400/400", audio:"https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_1MG.mp3" },
  { id:null, title:"Demo Beat", artist:"Demo Artist", thumbnail:"https://picsum.photos/seed/3/400/400", audio:"https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_2MG.mp3" }
];

// fill demo if empty
if (songs.length === 0) {
  songs = demo.slice();
  persist();
}

// DOM references
const recommendedRow = document.getElementById('recommendedRow');
const playlistEl = document.getElementById('playlist');
const queueCount = document.getElementById('queueCount');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const nowThumb = document.getElementById('nowThumb');
const nowTitle = document.getElementById('nowTitle');
const nowArtist = document.getElementById('nowArtist');
const seek = document.getElementById('seek');
const curtimeEl = document.getElementById('curtime');
const durtimeEl = document.getElementById('durtime');
const volumeEl = document.getElementById('volume');

const openAddModal = document.getElementById('openAddModal');
const addModal = document.getElementById('addModal');
const closeAddModal = document.getElementById('closeAddModal');
const songInput = document.getElementById('songInput');
const addSongBtn = document.getElementById('addSongBtn');

const searchLocal = document.getElementById('searchLocal');
const ytPlayerContainer = document.getElementById('yt-player-container');

let audioEl = new Audio();
audioEl.crossOrigin = "anonymous";

// Helpers
function persist(){
  localStorage.setItem('km_songs', JSON.stringify(songs));
  localStorage.setItem('km_index', String(currentIndex));
}

function formatTime(s){
  if (!s || isNaN(s)) return '0:00';
  s = Math.floor(s);
  const m = Math.floor(s/60); const sec = s%60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

// Render recommended (visual filler)
function renderRecommended(){
  recommendedRow.innerHTML = '';
  for (let i=0;i<6;i++){
    const t = document.createElement('div');
    t.className='tile';
    t.innerHTML = `<img src="https://picsum.photos/seed/trend${i}/400/400"><div class="tile-title">Playlist ${i+1}</div><div class="tile-sub">Curated</div>`;
    recommendedRow.appendChild(t);
  }
}

// Render playlist list
function renderPlaylist(filter=''){
  playlistEl.innerHTML = '';
  const filtered = songs.filter(s => s.title.toLowerCase().includes(filter.toLowerCase()) || (s.artist||'').toLowerCase().includes(filter.toLowerCase()));
  queueCount.textContent = filtered.length;
  if (filtered.length === 0) {
    playlistEl.innerHTML = `<div style="color:var(--muted);padding:12px">No songs found</div>`;
    return;
  }

  filtered.forEach((s, idx) => {
    const index = songs.indexOf(s);
    const tr = document.createElement('div');
    tr.className = 'track';
    tr.draggable = true;
    tr.dataset.index = index;
    tr.innerHTML = `
      <img class="track-thumb" src="${s.thumbnail || ''}">
      <div>
        <div class="track-title">${s.title}</div>
        <div class="track-sub">${s.artist || ''}</div>
      </div>
      <div class="track-actions">
        <button class="small-btn play">Play</button>
        <button class="small-btn remove">Remove</button>
      </div>
    `;

    // events
    tr.querySelector('.play').addEventListener('click', (e)=>{ e.stopPropagation(); playIndex(index); });
    tr.querySelector('.remove').addEventListener('click', (e)=>{ e.stopPropagation(); removeIndex(index); });
    tr.addEventListener('dblclick', ()=> playIndex(index));

    // drag handlers
    tr.addEventListener('dragstart', (e)=> {
      e.dataTransfer.setData('text/plain', index);
      tr.classList.add('dragging');
    });
    tr.addEventListener('dragend', ()=> tr.classList.remove('dragging'));

    tr.addEventListener('dragover', (e)=> { e.preventDefault(); tr.classList.add('drag-over'); });
    tr.addEventListener('dragleave', ()=> tr.classList.remove('drag-over'));
    tr.addEventListener('drop', (e)=> {
      e.preventDefault();
      tr.classList.remove('drag-over');
      const from = Number(e.dataTransfer.getData('text/plain'));
      const to = Number(tr.dataset.index);
      reorder(from,to);
    });

    playlistEl.appendChild(tr);
  });
}

// reorder songs
function reorder(from, to){
  if (from === to) return;
  const item = songs.splice(from,1)[0];
  songs.splice(to,0,item);
  // adjust currentIndex
  if (currentIndex === from) currentIndex = to;
  else if (from < currentIndex && to >= currentIndex) currentIndex--;
  else if (from > currentIndex && to <= currentIndex) currentIndex++;
  persist();
  renderPlaylist(searchLocal.value || '');
}

// remove
function removeIndex(i){
  if (i<0 || i>=songs.length) return;
  songs.splice(i,1);
  if (currentIndex === i) { stopEverything(); currentIndex = -1; }
  else if (currentIndex > i) currentIndex--;
  persist();
  renderPlaylist(searchLocal.value || '');
  updateNowUI();
}

// Playback functions
function stopEverything(){
  try{ if (ytPlayer) ytPlayer.stopVideo(); } catch(e){}
  audioEl.pause();
  usingYT = false;
}

function playIndex(i){
  if (i<0 || i>=songs.length) return;
  currentIndex = i; persist();
  const s = songs[i];
  updateNowUI();

  if (s.id){ // YouTube
    usingYT = true;
    ensureYT().then(()=> {
      ytPlayer.loadVideoById(s.id);
      ytPlayer.playVideo();
    });
    audioEl.pause();
  } else if (s.audio){ // direct MP3
    usingYT = false;
    if (ytPlayer) try{ ytPlayer.stopVideo(); } catch(e){}
    audioEl.src = s.audio;
    audioEl.play();
  }
}

// cue only (no autoplay)
function cueIndex(i){
  currentIndex = i; persist();
  const s = songs[i];
  if (s && s.id && ytPlayer) ytPlayer.cueVideoById(s.id);
  updateNowUI();
}

// update now playing UI
function updateNowUI(){
  if (currentIndex >= 0 && songs[currentIndex]){
    const s = songs[currentIndex];
    nowThumb.src = s.thumbnail || '';
    nowTitle.textContent = s.title || 'Untitled';
    nowArtist.textContent = s.artist || '';
  } else {
    nowThumb.src = '';
    nowTitle.textContent = 'Nothing playing';
    nowArtist.textContent = '—';
  }
}

// Prev / Next / Play Toggle
prevBtn.addEventListener('click', ()=> {
  if (songs.length === 0) return;
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playIndex(currentIndex);
});
nextBtn.addEventListener('click', ()=> {
  if (songs.length === 0) return;
  currentIndex = (currentIndex + 1) % songs.length;
  playIndex(currentIndex);
});

playBtn.addEventListener('click', ()=> {
  if (usingYT && ytPlayer){
    const st = ytPlayer.getPlayerState();
    if (st === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else if (st === YT.PlayerState.PAUSED || st === YT.PlayerState.CUED) ytPlayer.playVideo();
  } else {
    if (audioEl.paused) audioEl.play(); else audioEl.pause();
  }
});

// seek & time updates
let isSeeking = false;
seek.addEventListener('input', ()=> isSeeking = true);
seek.addEventListener('change', ()=> {
  if (usingYT && ytPlayer && ytPlayer.getDuration){
    const dur = ytPlayer.getDuration() || 0;
    const t = (seek.value/100) * dur;
    ytPlayer.seekTo(t, true);
  } else if (!usingYT && audioEl.duration){
    audioEl.currentTime = (seek.value/100) * audioEl.duration;
  }
  isSeeking = false;
});

// volume
volumeEl.addEventListener('input', ()=>{
  const v = Number(volumeEl.value);
  if (usingYT && ytPlayer) ytPlayer.setVolume(v);
  audioEl.volume = v/100;
  localStorage.setItem('km_vol', String(v));
});

// audio element events (for direct audio)
audioEl.addEventListener('timeupdate', ()=>{
  if (!usingYT){
    const cur = audioEl.currentTime || 0;
    const dur = audioEl.duration || 0;
    if (!isSeeking && dur > 0) seek.value = Math.min(100, (cur/dur)*100);
    curtimeEl.textContent = formatTime(cur);
    durtimeEl.textContent = formatTime(dur);
  }
});
audioEl.addEventListener('ended', ()=> {
  // play next
  if (!usingYT) nextBtn.click();
});

// YouTube player state updates
function onYouTubeIframeAPIReady(){
  ytPlayer = new YT.Player('ytplayer', {
    height:'0', width:'0',
    playerVars: { controls:0, rel:0, modestbranding:1 },
    events: { onStateChange: onYtState, onReady: onYtReady }
  });
}
function onYtReady(){ 
  // set saved volume
  const v = parseInt(localStorage.getItem('km_vol') || '70', 10);
  volumeEl.value = v;
  if (ytPlayer) ytPlayer.setVolume(v);
}
function onYtState(e){
  if (e.data === YT.PlayerState.ENDED){
    // auto-next
    nextBtn.click();
  } else if (e.data === YT.PlayerState.PLAYING){
    // update progress via interval
    startYtProgress();
    playBtn.classList.add('playing');
    playBtn.textContent = '⏸';
  } else if (e.data === YT.PlayerState.PAUSED){
    stopYtProgress();
    playBtn.classList.remove('playing');
    playBtn.textContent = '▶';
  }
}

let ytProgressInterval = null;
function startYtProgress(){
  clearInterval(ytProgressInterval);
  ytProgressInterval = setInterval(()=> {
    if (!ytPlayer) return;
    try{
      const dur = ytPlayer.getDuration() || 0;
      const cur = ytPlayer.getCurrentTime() || 0;
      if (!isSeeking && dur > 0) seek.value = Math.min(100, (cur/dur)*100);
      curtimeEl.textContent = formatTime(cur);
      durtimeEl.textContent = formatTime(dur);
    }catch(e){}
  }, 500);
}
function stopYtProgress(){ clearInterval(ytProgressInterval); }

// Ensure YT player exists in DOM
function ensureYT(){
  return new Promise((resolve)=>{
    if (ytPlayer) return resolve();
    // create container
    if (!document.getElementById('ytplayer')) {
      ytPlayerContainer.innerHTML = '<div id="ytplayer"></div>';
    }
    // wait for global YT to be ready
    const t = setInterval(()=>{
      if (window.YT && window.YT.Player && document.getElementById('ytplayer')){
        clearInterval(t);
        resolve();
      }
    }, 100);
  });
}

// Add song modal controls
openAddModal.addEventListener('click', ()=> addModal.style.display = 'flex');
closeAddModal.addEventListener('click', ()=> addModal.style.display = 'none');

// add song button
addSongBtn.addEventListener('click', async ()=> {
  const v = songInput.value.trim();
  if (!v) return alert('Paste a YouTube link or direct MP3 URL');
  // check for YouTube ID
  const id = extractVideoId(v);
  if (id){
    // fetch metadata via noembed
    try{
      addSongBtn.disabled = true; addSongBtn.textContent = 'Adding...';
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
      const j = await res.json();
      const newSong = { id, title: j.title || `YouTube ${id}`, artist: j.author_name || '', thumbnail: j.thumbnail_url || '', audio: null };
      songs.push(newSong);
      persist(); renderPlaylist(searchLocal.value || '');
      songInput.value = '';
      addModal.style.display = 'none';
      if (songs.length === 1) cueIndex(0);
    }catch(e){
      alert('Failed to fetch video metadata (noembed service). Try again or use MP3 URL.');
      console.error(e);
    } finally { addSongBtn.disabled = false; addSongBtn.textContent = 'Add Song'; }
  } else {
    // assume direct audio
    const newSong = { id:null, title: v.split('/').pop().slice(0,40), artist:'Added', thumbnail:`https://picsum.photos/seed/${Math.floor(Math.random()*9999)}/400/400`, audio: v };
    songs.push(newSong);
    persist(); renderPlaylist(searchLocal.value || '');
    songInput.value = '';
    addModal.style.display = 'none';
    if (songs.length === 1) playIndex(0);
  }
});

// Simple YouTube ID extractor
function extractVideoId(u){
  if (!u) return null;
  const s = u.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) || s.match(/[?&]v=([A-Za-z0-9_-]{11})/) || s.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Search local
searchLocal.addEventListener('input', ()=> renderPlaylist(searchLocal.value || ''));

// reorder with drag already handled in render

// Initialize UI & events
renderRecommended();
renderPlaylist();
updateNowUI();

// restore volume
const savedVol = parseInt(localStorage.getItem('km_vol') || '70', 10);
volumeEl.value = savedVol;
audioEl.volume = savedVol/100;

// keyboard space to toggle
document.addEventListener('keydown',(e)=>{
  if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT'){
    e.preventDefault();
    playBtn.click();
  }
});

// auto save on unload
window.addEventListener('beforeunload', ()=> persist());

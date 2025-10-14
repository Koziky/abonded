// Koziky Music — YouTube playlist with YouTube IFrame API controls
// Uses noembed.com to fetch title + thumbnail (no API key needed)

let player;                      // YT player instance
let songs = JSON.parse(localStorage.getItem('kozy_songs')||'[]');
let currentIndex = parseInt(localStorage.getItem('kozy_index')||'-1', 10);

// DOM
const ytInput = document.getElementById('yt-input');
const addBtn = document.getElementById('add-song');
const playlistEl = document.getElementById('playlist');
const playlistCount = document.getElementById('playlist-count');

const nowThumb = document.getElementById('now-thumb');
const nowTitle = document.getElementById('now-title');
const nowSub = document.getElementById('now-sub');

const miniThumb = document.getElementById('mini-thumb');
const miniTitle = document.getElementById('mini-title');
const miniPlay = document.getElementById('mini-play');

const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const seek = document.getElementById('seek');
const curtime = document.getElementById('curtime');
const durtime = document.getElementById('durtime');
const volume = document.getElementById('volume');

// Helper: save
function persist(){
  localStorage.setItem('kozy_songs', JSON.stringify(songs));
  localStorage.setItem('kozy_index', String(currentIndex));
}

// Helper: extract video id robustly
function extractVideoId(url){
  try{
    // handle youtu.be, v=, embed/
    const u = url.trim();
    if(u.includes('youtu.be/')){
      return u.split('youtu.be/')[1].split(/[?&]/)[0];
    }
    if(u.includes('v=')){
      return u.split('v=')[1].split(/[&?#]/)[0];
    }
    if(u.includes('/embed/')){
      return u.split('/embed/')[1].split(/[?&]/)[0];
    }
    // if user pasted just id
    if(/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
  }catch(e){}
  return null;
}

// fetch metadata using noembed
async function fetchMeta(id){
  const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
  if(!res.ok) throw new Error('fetch failed');
  const j = await res.json();
  return { title: j.title||'Untitled', thumbnail: j.thumbnail_url||'', author: j.author_name||'' };
}

// Render playlist UI
function renderPlaylist(filter=''){
  playlistEl.innerHTML = '';
  const items = songs.filter(s => s.title.toLowerCase().includes(filter.toLowerCase()));
  playlistCount.textContent = items.length;
  if(items.length===0){
    playlistEl.innerHTML = `<div style="color:var(--muted);padding:16px">No songs in playlist</div>`;
    return;
  }
  items.forEach((s, i) => {
    const idx = songs.indexOf(s); // real index
    const tr = document.createElement('div');
    tr.className = 'track';
    tr.innerHTML = `
      <img class="track-thumb" src="${s.thumbnail}" alt="">
      <div>
        <div class="track-title">${s.title}</div>
        <div class="track-sub">${s.author||''}</div>
      </div>
      <div class="track-actions">
        <button class="small-btn play">Play</button>
        <button class="small-btn remove">Remove</button>
      </div>
    `;
    tr.querySelector('.play').addEventListener('click', (e)=>{
      e.stopPropagation();
      playIndex(idx);
    });
    tr.querySelector('.remove').addEventListener('click', (e)=>{
      e.stopPropagation();
      removeIndex(idx);
    });
    tr.addEventListener('dblclick', ()=>playIndex(idx)); // double click to play
    playlistEl.appendChild(tr);
  });
}

// remove
function removeIndex(i){
  if(i<0 || i>=songs.length) return;
  songs.splice(i,1);
  if(currentIndex === i) {
    // stop player
    stopPlayer();
    currentIndex = -1;
  } else if(currentIndex > i) {
    currentIndex--;
  }
  persist();
  renderPlaylist();
  updateNowPlayingUI();
}

// Add button click
addBtn.addEventListener('click', async ()=>{
  const url = ytInput.value.trim();
  if(!url) return alert('Paste a YouTube link or ID');
  const id = extractVideoId(url);
  if(!id) return alert('Invalid YouTube link or ID');
  try{
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';
    const meta = await fetchMeta(id);
    const song = { id, title: meta.title, thumbnail: meta.thumbnail, author: meta.author };
    songs.push(song);
    persist();
    renderPlaylist();
    ytInput.value = '';
  }catch(err){
    console.error(err);
    alert('Failed to fetch video info. Try again.');
  }finally{
    addBtn.disabled = false;
    addBtn.textContent = 'Add';
  }
});

// Play index
function playIndex(i){
  if(i<0 || i>=songs.length) return;
  currentIndex = i;
  persist();
  const s = songs[i];
  if(!player) return; // wait for YT API
  player.loadVideoById(s.id);
  player.playVideo();
  updateNowPlayingUI();
}

// Update Now Playing UI
function updateNowPlayingUI(){
  if(currentIndex>=0 && songs[currentIndex]){
    const s = songs[currentIndex];
    nowThumb.src = s.thumbnail;
    nowTitle.textContent = s.title;
    nowSub.textContent = s.author || '';
    miniThumb.style.backgroundImage = `url(${s.thumbnail})`;
    miniTitle.textContent = s.title;
    miniPlay.textContent = '⏸';
  } else {
    nowThumb.src = '';
    nowTitle.textContent = 'No song playing';
    nowSub.textContent = 'Add songs and press play';
    miniThumb.style.backgroundImage = '';
    miniTitle.textContent = 'Nothing playing';
    miniPlay.textContent = '▶';
  }
}

// stop player (clear src)
function stopPlayer(){
  if(player) {
    try{ player.stopVideo(); }catch(e){}
  }
  updateNowPlayingUI();
}

// Prev/Next
prevBtn.addEventListener('click', ()=>{
  if(songs.length===0) return;
  currentIndex = (currentIndex -1 + songs.length) % songs.length;
  playIndex(currentIndex);
});
nextBtn.addEventListener('click', ()=>{
  if(songs.length===0) return;
  currentIndex = (currentIndex +1) % songs.length;
  playIndex(currentIndex);
});

// Play/pause
playBtn.addEventListener('click', ()=>{
  if(!player) return;
  const state = player.getPlayerState();
  if(state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else if(state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED || state === YT.PlayerState.ENDED) {
    // if no song selected, play first
    if(currentIndex<0 && songs.length>0) currentIndex = 0;
    if(currentIndex>=0) player.playVideo();
  }
});

// mini player toggle
miniPlay.addEventListener('click', ()=>{
  if(!player) return;
  const state = player.getPlayerState();
  if(state === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
});

// Seek handling
let isSeeking = false;
seek.addEventListener('input', ()=>{
  isSeeking = true;
});
seek.addEventListener('change', ()=>{
  if(player && player.getDuration()){
    const perc = parseFloat(seek.value)/100;
    player.seekTo(player.getDuration()*perc, true);
  }
  isSeeking = false;
});

// Volume
volume.addEventListener('input', ()=>{
  const v = parseInt(volume.value,10);
  if(player) player.setVolume(v);
});

// Remove all and play next on end
function onPlayerStateChange(event){
  // 0 ended
  if(event.data === 0){
    // auto next
    if(songs.length>0){
      currentIndex = (currentIndex + 1) % songs.length;
      persist();
      playIndex(currentIndex);
    }
  } else if(event.data === 1){ // playing
    playBtn.classList.add('playing');
    miniPlay.textContent = '⏸';
  } else if(event.data === 2){ // paused
    playBtn.classList.remove('playing');
    miniPlay.textContent = '▶';
  }
}

// Update progress interval
setInterval(()=>{
  if(player && player.getDuration && player.getPlayerState){
    try{
      const state = player.getPlayerState();
      if(state === YT.PlayerState.PLAYING || state === YT.PlayerState.PAUSED){
        const dur = player.getDuration() || 0;
        const cur = player.getCurrentTime() || 0;
        if(!isSeeking && dur>0) {
          const pct = Math.min(100, Math.max(0, (cur/dur)*100));
          seek.value = pct;
        }
        curtime.textContent = formatTime(cur);
        durtime.textContent = formatTime(dur);
      }
    }catch(e){}
  }
}, 500);

function formatTime(s){
  if(!s || isNaN(s)) return '0:00';
  s = Math.floor(s);
  const m = Math.floor(s/60);
  const sec = s%60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

// remove all tracks helper (not exposed)
function clearAll(){
  songs = [];
  currentIndex = -1;
  persist();
  renderPlaylist();
  stopPlayer();
}

// Remove single: implemented above

// Initialize render
renderPlaylist();
updateNowPlayingUI();

// --------------------- YouTube IFrame API ---------------------
function onYouTubeIframeAPIReady(){
  // Create an invisible player — we don't need UI controls from YouTube.
  const div = document.createElement('div');
  div.id = 'ytplayer';
  div.style.display = 'none';
  document.body.appendChild(div);

  player = new YT.Player('ytplayer', {
    height: '0',
    width: '0',
    playerVars: { controls: 0, disablekb: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: (e)=>{
        // restore volume
        const savedVol = parseInt(localStorage.getItem('kozy_vol')||'50',10);
        volume.value = savedVol;
        player.setVolume(savedVol);
        // if index present, load but not autoplay
        if(currentIndex>=0 && songs[currentIndex]){
          player.cueVideoById(songs[currentIndex].id);
          updateNowPlayingUI();
        }
      },
      onStateChange: onPlayerStateChange
    }
  });
}

// Save volume on change
volume.addEventListener('change', ()=> localStorage.setItem('kozy_vol', volume.value));

// Keyboard: space toggles play/pause
document.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){
    e.preventDefault();
    if(player) {
      const st = player.getPlayerState();
      if(st === YT.PlayerState.PLAYING) player.pauseVideo();
      else player.playVideo();
    }
  }
});

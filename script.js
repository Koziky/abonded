/* GlassBeats — script.js
   Uses YouTube IFrame API for playback + playlist/queue management
*/

(() => {
  // --- Helpers ---
  function $(sel){return document.querySelector(sel)}
  function $all(sel){return Array.from(document.querySelectorAll(sel))}
  function formatTime(sec){
    if (!isFinite(sec)) return "0:00";
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2,"0")}`;
  }
  function extractVideoId(input){
    if (!input) return null;
    // Accept full URLs, share links, or raw ids
    const urlMatch = input.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
    if (urlMatch) return urlMatch[1];
    // fallback: maybe it's just an ID
    const idMatch = input.match(/^[A-Za-z0-9_-]{6,20}$/);
    return idMatch ? idMatch[0] : null;
  }

  // --- State ---
  let playlist = [];   // {id,title}
  let queue = [];      // array of ids
  let currentIndex = -1; // index in playlist
  let ytPlayer = null;
  let isPlaying = false;
  let repeatMode = false;
  let shuffleMode = false;
  const STORAGE_KEY = "glassbeats_playlist_v1";

  // DOM refs
  const playlistEl = $("#playlistItems");
  const queueEl = $("#queueItems");
  const videoUrl = $("#videoUrl");
  const addBtn = $("#addBtn");
  const queueBtn = $("#queueBtn");
  const playBtn = $("#play");
  const nextBtn = $("#next");
  const prevBtn = $("#prev");
  const volEl = $("#volume");
  const progressEl = $("#progress");
  const nowTitle = $("#nowTitle");
  const nowTime = $("#nowTime");
  const durationEl = $("#duration");
  const clearQueueBtn = $("#clearQueue");
  const saveList = $("#saveList");
  const loadList = $("#loadList");
  const savedListsContainer = $("#savedLists");
  const shuffleBtn = $("#shuffle");
  const repeatBtn = $("#repeat");

  // --- YouTube API setup (global function required by API) ---
  window.onYouTubeIframeAPIReady = function(){
    // Create invisible player first; we'll swap container content when playing
    ytPlayer = new YT.Player('playerPlaceholder', {
      height: '200',
      width: '360',
      playerVars: {controls:0, disablekb:1, rel:0, modestbranding:1, showinfo:0},
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      }
    });
  };

  function onPlayerReady(){
    // set volume from control
    ytPlayer.setVolume(volEl.value);
    startProgressUpdater();
  }

  function onPlayerStateChange(e){
    // YT states: -1 unstarted, 0 ended, 1 playing, 2 paused
    if (e.data === 0) { // ended
      if (repeatMode) {
        playCurrent();
      } else {
        playNext();
      }
    } else if (e.data === 1) {
      isPlaying = true;
      playBtn.textContent = "▮▮";
    } else if (e.data === 2) {
      isPlaying = false;
      playBtn.textContent = "▶";
    }
  }

  // --- UI Render ---
  function renderPlaylist(){
    playlistEl.innerHTML = "";
    playlist.forEach((item, idx) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.dataset.index = idx;
      li.innerHTML = `<div class="song-title" title="${item.title || item.id}">${item.title || item.id}</div>
                      <div class="song-actions">
                        <button class="btn-icon play-now" title="Play">▶</button>
                        <button class="btn-icon add-queue" title="Add to Queue">＋</button>
                        <button class="btn-icon remove" title="Remove">✕</button>
                      </div>`;
      // double click to play
      li.addEventListener("dblclick", () => {
        currentIndex = idx;
        loadAndPlayByIndex(idx);
      });

      li.querySelector(".play-now").addEventListener("click", () => {
        currentIndex = idx;
        loadAndPlayByIndex(idx);
      });
      li.querySelector(".add-queue").addEventListener("click", () => {
        queue.push(item.id);
        saveStateToLocal();
        renderQueue();
      });
      li.querySelector(".remove").addEventListener("click", () => {
        if (idx === currentIndex) {
          stop();
        }
        playlist.splice(idx,1);
        if (idx < currentIndex) currentIndex--;
        renderPlaylist();
      });

      // drag events
      li.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", idx);
        li.classList.add("dragging");
      });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        li.style.transform = "translateY(6px)";
      });
      li.addEventListener("dragleave", () => li.style.transform = "");
      li.addEventListener("drop", (ev) => {
        ev.preventDefault();
        const from = Number(ev.dataTransfer.getData("text/plain"));
        const to = Number(li.dataset.index);
        if (from === to) return;
        const [moved] = playlist.splice(from, 1);
        playlist.splice(to, 0, moved);
        if (from === currentIndex) currentIndex = to;
        else if (from < currentIndex && to >= currentIndex) currentIndex--;
        else if (from > currentIndex && to <= currentIndex) currentIndex++;
        renderPlaylist();
      });

      playlistEl.appendChild(li);
    });
  }

  function renderQueue(){
    queueEl.innerHTML = "";
    queue.forEach((id, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<div class="song-title">${id}</div>
                      <div class="song-actions">
                        <button class="btn-icon q-play">▶</button>
                        <button class="btn-icon q-remove">✕</button>
                      </div>`;
      li.querySelector(".q-play").addEventListener("click", () => {
        // if id exists in playlist, play it; else add and play last
        const idx = playlist.findIndex(s => s.id === id);
        if (idx >= 0) {
          currentIndex = idx;
          loadAndPlayByIndex(idx);
        } else {
          const newIdx = playlist.push({id, title: id}) - 1;
          currentIndex = newIdx;
          renderPlaylist();
          loadAndPlayByIndex(newIdx);
        }
      });
      li.querySelector(".q-remove").addEventListener("click", () => {
        queue.splice(i,1);
        renderQueue();
      });
      queueEl.appendChild(li);
    });
  }

  function updateNowPlayingUI(){
    const cur = playlist[currentIndex];
    nowTitle.textContent = cur ? (cur.title || cur.id) : "Nothing playing";
    durationEl.textContent = "0:00";
    nowTime.textContent = "0:00";
    progressEl.value = 0;
  }

  // --- Playback control ---
  function loadAndPlayByIndex(idx){
    if (!playlist[idx]) return;
    const id = playlist[idx].id;
    if (!ytPlayer) return;
    ytPlayer.loadVideoById(id);
    currentIndex = idx;
    updateNowPlayingUI();
    // attempt to fetch title via oEmbed (no CORS issues because it's JSONP? We'll use no external fetch — fallback to id)
    // Try fetch basic title via yt oembed (CORS-friendly)
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => {
        playlist[idx].title = j.title;
        updateNowPlayingUI();
        renderPlaylist();
      }).catch(()=>{ /* ignore */});
    isPlaying = true;
    playBtn.textContent = "▮▮";
    saveStateToLocal();
  }

  function playCurrent(){
    if (currentIndex < 0 && playlist.length > 0) currentIndex = 0;
    if (currentIndex >= 0) loadAndPlayByIndex(currentIndex);
  }

  function pause(){
    if (ytPlayer) ytPlayer.pauseVideo();
  }
  function resume(){
    if (ytPlayer) ytPlayer.playVideo();
  }
  function stop(){
    if (ytPlayer) ytPlayer.stopVideo();
    isPlaying = false;
    playBtn.textContent = "▶";
  }

  function playNext(){
    if (shuffleMode && playlist.length > 1) {
      currentIndex = Math.floor(Math.random() * playlist.length);
      loadAndPlayByIndex(currentIndex);
      return;
    }
    // if queue has items, play them first
    if (queue.length > 0){
      const id = queue.shift();
      // if already in playlist, play existing; else add to end
      const idx = playlist.findIndex(s => s.id === id);
      if (idx >= 0) {
        currentIndex = idx;
        loadAndPlayByIndex(idx);
      } else {
        const newIdx = playlist.push({id, title: id}) - 1;
        currentIndex = newIdx;
        renderPlaylist();
        loadAndPlayByIndex(newIdx);
      }
      renderQueue();
      return;
    }

    if (currentIndex+1 < playlist.length) {
      currentIndex++;
      loadAndPlayByIndex(currentIndex);
    } else {
      if (repeatMode) {
        currentIndex = 0;
        loadAndPlayByIndex(currentIndex);
      } else {
        // end
        stop();
      }
    }
  }

  function playPrev(){
    if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getCurrentTime() > 3) {
      ytPlayer.seekTo(0);
      return;
    }
    if (currentIndex > 0) {
      currentIndex--;
      loadAndPlayByIndex(currentIndex);
    } else {
      // go to last if repeat
      if (repeatMode && playlist.length>0) {
        currentIndex = playlist.length-1;
        loadAndPlayByIndex(currentIndex);
      } else {
        ytPlayer.seekTo(0);
      }
    }
  }

  // --- Progress updater ---
  let progressTimer = null;
  function startProgressUpdater(){
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (!ytPlayer || ytPlayer.getDuration === undefined) return;
      const dur = ytPlayer.getDuration();
      const cur = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
      if (isFinite(dur) && dur > 0) {
        const pct = (cur / dur) * 100;
        progressEl.value = pct;
        nowTime.textContent = formatTime(cur);
        durationEl.textContent = formatTime(dur);
      }
    }, 350);
  }

  // --- Persistence ---
  function saveStateToLocal(){
    try {
      const data = {playlist, queue};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e){}
  }
  function loadStateFromLocal(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj.playlist) playlist = obj.playlist;
      if (obj.queue) queue = obj.queue;
    } catch(e){}
  }

  // Saved playlists (allow multiple)
  function saveNamedList(){
    const name = prompt("Save playlist as (name):", "My Playlist");
    if (!name) return;
    const all = JSON.parse(localStorage.getItem("glassbeats_saved_v1") || "{}");
    all[name] = { playlist, savedAt: Date.now() };
    localStorage.setItem("glassbeats_saved_v1", JSON.stringify(all));
    renderSavedLists();
  }
  function loadNamedList(name){
    const all = JSON.parse(localStorage.getItem("glassbeats_saved_v1") || "{}");
    if (!all[name]) return;
    playlist = all[name].playlist || [];
    queue = [];
    currentIndex = -1;
    renderPlaylist(); renderQueue(); saveStateToLocal();
  }
  function renderSavedLists(){
    savedListsContainer.innerHTML = "";
    const all = JSON.parse(localStorage.getItem("glassbeats_saved_v1") || "{}");
    for (const name in all){
      const el = document.createElement("div");
      el.className = "glass-panel";
      el.style.display="flex"; el.style.justifyContent="space-between"; el.style.alignItems="center";
      el.innerHTML = `<div><strong>${name}</strong><div class="small muted">items: ${ (all[name].playlist||[]).length }</div></div>
        <div style="display:flex;gap:.5rem">
          <button class="btn muted load-saved">Load</button>
          <button class="btn muted delete-saved">Delete</button>
        </div>`;
      el.querySelector(".load-saved").addEventListener("click", ()=> loadNamedList(name));
      el.querySelector(".delete-saved").addEventListener("click", ()=>{
        if (!confirm(`Delete saved playlist "${name}"?`)) return;
        delete all[name];
        localStorage.setItem("glassbeats_saved_v1", JSON.stringify(all));
        renderSavedLists();
      });
      savedListsContainer.appendChild(el);
    }
  }

  // --- Wire up events ---
  addBtn.addEventListener("click", () => {
    const id = extractVideoId(videoUrl.value.trim());
    if (!id) { alert("Couldn't parse a YouTube id/URL."); return; }
    playlist.push({id, title: id});
    renderPlaylist();
    saveStateToLocal();
    videoUrl.value = "";
  });

  queueBtn.addEventListener("click", () => {
    const id = extractVideoId(videoUrl.value.trim());
    if (!id) { alert("Couldn't parse a YouTube id/URL."); return; }
    queue.push(id);
    renderQueue();
    saveStateToLocal();
    videoUrl.value = "";
  });

  playBtn.addEventListener("click", () => {
    if (!ytPlayer) return;
    const state = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
    if (state === 1) pause();
    else if (state === 2 || state === -1 || state === 0) {
      if (currentIndex < 0) playCurrent();
      else resume();
    } else resume();
  });

  nextBtn.addEventListener("click", playNext);
  prevBtn.addEventListener("click", playPrev);

  volEl.addEventListener("input", () => {
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(Number(volEl.value));
  });

  progressEl.addEventListener("input", () => {
    if (ytPlayer && ytPlayer.getDuration){
      const dur = ytPlayer.getDuration();
      const pct = Number(progressEl.value)/100;
      ytPlayer.seekTo(dur * pct, true);
    }
  });

  clearQueueBtn.addEventListener("click", () => {
    queue = []; renderQueue(); saveStateToLocal();
  });

  saveList.addEventListener("click", saveNamedList);
  loadList.addEventListener("click", () => {
    loadStateFromLocal(); renderPlaylist(); renderQueue();
  });

  shuffleBtn.addEventListener("click", () => {
    shuffleMode = !shuffleMode;
    shuffleBtn.style.opacity = shuffleMode ? 1 : 0.6;
  });
  repeatBtn.addEventListener("click", () => {
    repeatMode = !repeatMode;
    repeatBtn.style.opacity = repeatMode ? 1 : 0.6;
  });

  // Click on playlist item to play implemented earlier
  // Periodic UI updates
  function init(){
    loadStateFromLocal();
    renderPlaylist();
    renderQueue();
    renderSavedLists();
    updateNowPlayingUI();
    // start progress even if player not ready
    startProgressUpdater();
  }

  // Expose some helpers to global for debugging
  window.GB = { playlist, queue };

  // Initialize
  init();

})();

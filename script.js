/* GlassBeats — script.js (updated)
   - audio-only (video iframe hidden visually)
   - SVG controls (no emoji)
   - Playlists manager: create/select/delete playlists
   - shuffle / repeat / queue / localStorage persistence
   - keyboard shortcuts: space = play/pause, ←/→ prev/next
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
    const urlMatch = input.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
    if (urlMatch) return urlMatch[1];
    const idMatch = input.match(/^[A-Za-z0-9_-]{6,20}$/);
    return idMatch ? idMatch[0] : null;
  }

  // --- State ---
  let playlists = {};      // { name: [ {id,title} ] }
  let activePlaylist = "Global";
  let playlist = [];       // shortcut to playlists[activePlaylist]
  let queue = [];
  let currentIndex = -1;   // index in playlist
  let ytPlayer = null;
  let isPlaying = false;
  let repeatMode = false;
  let shuffleMode = false;
  const STORAGE_PLAYLISTS = "glassbeats_playlists_v1";
  const STORAGE_QUEUE = "glassbeats_queue_v1";

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
  const createPlaylistBtn = $("#createPlaylistBtn");
  const deletePlaylistBtn = $("#deletePlaylistBtn");
  const playlistsList = $("#playlistsList");
  const activePlaylistNameEl = $("#activePlaylistName");
  const savedListsContainer = $("#savedLists");
  const shuffleBtn = $("#shuffle");
  const repeatBtn = $("#repeat");
  const playIcon = $("#playIcon");
  const pauseIcon = $("#pauseIcon");

  // --- YouTube API setup ---
  window.onYouTubeIframeAPIReady = function(){
    ytPlayer = new YT.Player('playerPlaceholder', {
      height: '200',
      width: '360',
      playerVars: {
        controls: 0,
        disablekb: 1,
        rel: 0,
        modestbranding: 1,
        showinfo: 0,
        iv_load_policy: 3
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      }
    });
  };

  function onPlayerReady(){
    ytPlayer.setVolume(volEl.value);
    startProgressUpdater();
  }

  function onPlayerStateChange(e){
    // -1 unstarted, 0 ended, 1 playing, 2 paused
    if (e.data === 0) {
      if (repeatMode) playCurrent();
      else playNext();
    } else if (e.data === 1) { // playing
      isPlaying = true;
      playIcon.style.display = "none";
      pauseIcon.style.display = "";
    } else if (e.data === 2) { // paused
      isPlaying = false;
      playIcon.style.display = "";
      pauseIcon.style.display = "none";
    }
  }

  // --- Playlists persistence & management ---
  function loadPlaylistsFromStorage(){
    try {
      const raw = localStorage.getItem(STORAGE_PLAYLISTS);
      playlists = raw ? JSON.parse(raw) : {};
    } catch(e){ playlists = {}; }
    // ensure Global exists
    if (!playlists.Global) playlists.Global = [];
    playlist = playlists[activePlaylist] || [];
  }
  function savePlaylistsToStorage(){
    try { localStorage.setItem(STORAGE_PLAYLISTS, JSON.stringify(playlists)); }
    catch(e){}
  }
  function createPlaylist(){
    const name = prompt("New playlist name:", `Playlist ${Object.keys(playlists).length + 1}`);
    if (!name) return;
    if (playlists[name]) { alert("A playlist with that name already exists."); return; }
    playlists[name] = [];
    savePlaylistsToStorage();
    renderPlaylistsUI();
    selectPlaylist(name);
  }
  function deleteActivePlaylist(){
    if (activePlaylist === "Global") { alert("Cannot delete Global playlist."); return; }
    if (!confirm(`Delete playlist "${activePlaylist}"? This cannot be undone.`)) return;
    delete playlists[activePlaylist];
    activePlaylist = "Global";
    playlist = playlists.Global;
    savePlaylistsToStorage();
    renderPlaylistsUI();
    renderPlaylist();
  }
  function selectPlaylist(name){
    if (!playlists[name]) return;
    activePlaylist = name;
    playlist = playlists[activePlaylist];
    activePlaylistNameEl.textContent = ` (${activePlaylist})`;
    renderPlaylistsUI();
    renderPlaylist();
  }
  function renderPlaylistsUI(){
    playlistsList.innerHTML = "";
    Object.keys(playlists).forEach(name => {
      const li = document.createElement("li");
      li.textContent = `${name} (${playlists[name].length})`;
      li.classList.toggle("active", name === activePlaylist);
      li.addEventListener("click", () => selectPlaylist(name));
      playlistsList.appendChild(li);
    });
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
                        <button class="btn-icon play-now" title="Play" aria-label="Play"> 
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 3v18l15-9L5 3z" fill="currentColor"/></svg>
                        </button>
                        <button class="btn-icon add-queue" title="Add to Queue" aria-label="Add to Queue">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <button class="btn-icon remove" title="Remove" aria-label="Remove">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                      </div>`;
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
        saveQueue();
        renderQueue();
      });
      li.querySelector(".remove").addEventListener("click", () => {
        if (idx === currentIndex) stop();
        playlist.splice(idx,1);
        savePlaylistsToStorage();
        if (idx < currentIndex) currentIndex--;
        renderPlaylist();
      });

      // drag & drop
      li.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", idx);
        li.classList.add("dragging");
      });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (ev) => { ev.preventDefault(); li.style.transform = "translateY(6px)"; });
      li.addEventListener("dragleave", () => li.style.transform = "");
      li.addEventListener("drop", (ev) => {
        ev.preventDefault();
        const from = Number(ev.dataTransfer.getData("text/plain"));
        const to = Number(li.dataset.index);
        if (from === to) return;
        const [moved] = playlist.splice(from, 1);
        playlist.splice(to, 0, moved);
        // adjust currentIndex appropriately
        if (from === currentIndex) currentIndex = to;
        else if (from < currentIndex && to >= currentIndex) currentIndex--;
        else if (from > currentIndex && to <= currentIndex) currentIndex++;
        savePlaylistsToStorage();
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
                        <button class="btn-icon q-play" title="Play" aria-label="Play">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 3v18l15-9L5 3z" fill="currentColor"/></svg>
                        </button>
                        <button class="btn-icon q-remove" title="Remove" aria-label="Remove">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                      </div>`;
      li.querySelector(".q-play").addEventListener("click", () => {
        const idx = playlist.findIndex(s => s.id === id);
        if (idx >= 0) {
          currentIndex = idx;
          loadAndPlayByIndex(idx);
        } else {
          playlist.push({id, title: id});
          savePlaylistsToStorage();
          currentIndex = playlist.length - 1;
          renderPlaylist();
          loadAndPlayByIndex(currentIndex);
        }
        queue.splice(i,1);
        saveQueue();
        renderQueue();
      });
      li.querySelector(".q-remove").addEventListener("click", () => {
        queue.splice(i,1);
        saveQueue();
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
    // load video by id and play
    try {
      ytPlayer.loadVideoById(id);
    } catch (e) {
      // if player not ready, queue a small timeout
      setTimeout(() => ytPlayer && ytPlayer.loadVideoById(id), 300);
    }
    currentIndex = idx;
    updateNowPlayingUI();
    // fetch title via oembed
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => {
        playlist[idx].title = j.title;
        savePlaylistsToStorage();
        updateNowPlayingUI();
        renderPlaylist();
      }).catch(()=>{});
    isPlaying = true;
    playIcon.style.display = "none";
    pauseIcon.style.display = "";
    savePlaylistsToStorage();
  }

  function playCurrent(){
    if (currentIndex < 0 && playlist.length > 0) currentIndex = 0;
    if (currentIndex >= 0) loadAndPlayByIndex(currentIndex);
  }
  function pause(){ if (ytPlayer) ytPlayer.pauseVideo(); }
  function resume(){ if (ytPlayer) ytPlayer.playVideo(); }
  function stop(){ if (ytPlayer) ytPlayer.stopVideo(); isPlaying=false; playIcon.style.display=""; pauseIcon.style.display="none"; }

  function playNext(){
    // if queue has items, play them first
    if (queue.length > 0){
      const id = queue.shift();
      saveQueue();
      const idx = playlist.findIndex(s => s.id === id);
      if (idx >= 0) {
        currentIndex = idx;
        loadAndPlayByIndex(idx);
      } else {
        playlist.push({id, title: id});
        savePlaylistsToStorage();
        currentIndex = playlist.length - 1;
        renderPlaylist();
        loadAndPlayByIndex(currentIndex);
      }
      renderQueue();
      return;
    }

    if (shuffleMode && playlist.length > 1) {
      currentIndex = Math.floor(Math.random() * playlist.length);
      loadAndPlayByIndex(currentIndex);
      return;
    }

    if (currentIndex + 1 < playlist.length) {
      currentIndex++;
      loadAndPlayByIndex(currentIndex);
    } else {
      if (repeatMode && playlist.length > 0) {
        currentIndex = 0;
        loadAndPlayByIndex(currentIndex);
      } else {
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
      if (repeatMode && playlist.length > 0) {
        currentIndex = playlist.length - 1;
        loadAndPlayByIndex(currentIndex);
      } else {
        if (ytPlayer) ytPlayer.seekTo(0);
      }
    }
  }

  // --- Progress updater ---
  let progressTimer = null;
  function startProgressUpdater(){
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return;
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

  // --- Queue persistence ---
  function saveQueue(){ try { localStorage.setItem(STORAGE_QUEUE, JSON.stringify(queue)); } catch(e){} }
  function loadQueue(){ try { const raw = localStorage.getItem(STORAGE_QUEUE); queue = raw ? JSON.parse(raw) : []; } catch(e){ queue = []; } }

  // --- Saved playlists area (visual list of saved playlist objects) ---
  function renderSavedLists(){
    savedListsContainer.innerHTML = "";
    const names = Object.keys(playlists);
    names.forEach(name => {
      const item = document.createElement("div");
      item.className = "glass-panel";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.innerHTML = `<div><strong>${name}</strong><div class="small muted">items: ${playlists[name].length}</div></div>
        <div style="display:flex;gap:.5rem">
          <button class="btn muted load-saved">Load</button>
          <button class="btn muted delete-saved">Delete</button>
        </div>`;
      item.querySelector(".load-saved").addEventListener("click", () => selectPlaylist(name));
      item.querySelector(".delete-saved").addEventListener("click", () => {
        if (name === "Global") { alert("Cannot delete Global playlist"); return; }
        if (!confirm(`Delete playlist "${name}"?`)) return;
        delete playlists[name];
        savePlaylistsToStorage();
        renderPlaylistsUI();
        renderSavedLists();
        if (activePlaylist === name) selectPlaylist("Global");
      });
      savedListsContainer.appendChild(item);
    });
  }

  // --- Wire up events ---
  addBtn.addEventListener("click", () => {
    const id = extractVideoId(videoUrl.value.trim());
    if (!id) { alert("Couldn't parse a YouTube id/URL."); return; }
    playlist.push({id, title: id});
    savePlaylistsToStorage();
    renderPlaylist();
    videoUrl.value = "";
  });

  queueBtn.addEventListener("click", () => {
    const id = extractVideoId(videoUrl.value.trim());
    if (!id) { alert("Couldn't parse a YouTube id/URL."); return; }
    queue.push(id);
    saveQueue();
    renderQueue();
    videoUrl.value = "";
  });

  createPlaylistBtn.addEventListener("click", createPlaylist);
  deletePlaylistBtn.addEventListener("click", deleteActivePlaylist);

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

  clearQueueBtn.addEventListener("click", () => { queue = []; saveQueue(); renderQueue(); });

  shuffleBtn.addEventListener("click", () => {
    shuffleMode = !shuffleMode;
    shuffleBtn.style.opacity = shuffleMode ? 1 : 0.6;
  });
  repeatBtn.addEventListener("click", () => {
    repeatMode = !repeatMode;
    repeatBtn.style.opacity = repeatMode ? 1 : 0.6;
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return; // avoid interfering with typing
    if (e.code === "Space") { e.preventDefault(); playBtn.click(); }
    if (e.code === "ArrowRight") nextBtn.click();
    if (e.code === "ArrowLeft") prevBtn.click();
  });

  // --- Initialization ---
  function init(){
    loadPlaylistsFromStorage();
    loadQueue();
    renderPlaylistsUI();
    selectPlaylist(activePlaylist); // will render playlist
    renderQueue();
    renderSavedLists();
    updateNowPlayingUI();
    startProgressUpdater();
  }

  // expose for debugging
  window.GB = { playlists, queue };

  init();
})();

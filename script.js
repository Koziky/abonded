// Music Player State
const state = {
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    volume: 50,
    isShuffle: false,
    repeatMode: 'off', // 'off', 'all', 'one'
    playlists: [],
    currentPlaylist: null,
    allSongs: [],
    player: null,
    currentTime: 0,
    duration: 0,
    previousVolume: 50
};

// YouTube Player
let player;
let updateInterval;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '0',
        width: '0',
        playerVars: {
            autoplay: 0,
            controls: 0
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    state.player = player;
    loadState();
    updateUI();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNext();
    } else if (event.data === YT.PlayerState.PLAYING) {
        state.isPlaying = true;
        state.duration = player.getDuration();
        startProgressUpdate();
        updatePlayButton();
    } else if (event.data === YT.PlayerState.PAUSED) {
        state.isPlaying = false;
        stopProgressUpdate();
        updatePlayButton();
    }
}

function startProgressUpdate() {
    stopProgressUpdate();
    updateInterval = setInterval(() => {
        if (player && state.isPlaying) {
            state.currentTime = player.getCurrentTime();
            updateProgress();
        }
    }, 1000);
}

function stopProgressUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// Helper Functions
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// State Management
function saveState() {
    const saveData = {
        queue: state.queue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        playlists: state.playlists,
        allSongs: state.allSongs
    };
    localStorage.setItem('musicPlayerState', JSON.stringify(saveData));
}

function loadState() {
    try {
        const saved = localStorage.getItem('musicPlayerState');
        if (saved) {
            const data = JSON.parse(saved);
            state.queue = data.queue || [];
            state.currentIndex = data.currentIndex || -1;
            state.volume = data.volume || 50;
            state.isShuffle = data.isShuffle || false;
            state.repeatMode = data.repeatMode || 'off';
            state.playlists = data.playlists || [];
            state.allSongs = data.allSongs || [];
            
            if (player) {
                player.setVolume(state.volume);
            }
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

// Song Management
async function addSongFromUrl(url) {
    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }

    // Check if song already exists
    const exists = state.allSongs.find(s => s.youtubeId === videoId);
    if (exists) {
        addToQueue(exists);
        return;
    }

    // Fetch video info
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await response.json();
        
        const song = {
            id: generateId(),
            youtubeId: videoId,
            title: data.title || 'Unknown Title',
            artist: data.author_name || 'Unknown Artist',
            thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };

        state.allSongs.push(song);
        addToQueue(song);
        saveState();
        updateUI();
    } catch (error) {
        console.error('Error fetching video info:', error);
        // Fallback
        const song = {
            id: generateId(),
            youtubeId: videoId,
            title: 'Unknown Title',
            artist: 'Unknown Artist',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        };
        state.allSongs.push(song);
        addToQueue(song);
        saveState();
        updateUI();
    }
}

function addToQueue(song) {
    state.queue.push(song);
    if (state.currentIndex === -1) {
        state.currentIndex = 0;
        loadSong(0);
    }
    saveState();
    updateUI();
}

function removeFromQueue(index) {
    state.queue.splice(index, 1);
    if (index < state.currentIndex) {
        state.currentIndex--;
    } else if (index === state.currentIndex) {
        if (state.queue.length === 0) {
            state.currentIndex = -1;
            stopPlayback();
        } else {
            state.currentIndex = Math.min(state.currentIndex, state.queue.length - 1);
            loadSong(state.currentIndex);
        }
    }
    saveState();
    updateUI();
}

function clearQueue() {
    if (confirm('Clear all songs from queue?')) {
        state.queue = [];
        state.currentIndex = -1;
        stopPlayback();
        saveState();
        updateUI();
    }
}

// Playback Controls
function loadSong(index) {
    if (index < 0 || index >= state.queue.length) return;
    
    const song = state.queue[index];
    state.currentIndex = index;
    
    if (player && player.loadVideoById) {
        player.loadVideoById(song.youtubeId);
        if (state.isPlaying) {
            player.playVideo();
        }
    }
    
    updateNowPlaying();
    updateQueueDisplay();
    saveState();
}

function togglePlayPause() {
    if (!player || state.queue.length === 0) return;
    
    if (state.currentIndex === -1 && state.queue.length > 0) {
        state.currentIndex = 0;
        loadSong(0);
    }
    
    if (state.isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function playNext() {
    if (state.queue.length === 0) return;
    
    if (state.repeatMode === 'one') {
        loadSong(state.currentIndex);
        return;
    }
    
    let nextIndex;
    if (state.isShuffle) {
        nextIndex = Math.floor(Math.random() * state.queue.length);
    } else {
        nextIndex = state.currentIndex + 1;
        if (nextIndex >= state.queue.length) {
            if (state.repeatMode === 'all') {
                nextIndex = 0;
            } else {
                stopPlayback();
                return;
            }
        }
    }
    
    loadSong(nextIndex);
    if (state.isPlaying) {
        player.playVideo();
    }
}

function playPrevious() {
    if (state.queue.length === 0) return;
    
    if (state.currentTime > 3) {
        player.seekTo(0);
        return;
    }
    
    let prevIndex = state.currentIndex - 1;
    if (prevIndex < 0) {
        prevIndex = state.repeatMode === 'all' ? state.queue.length - 1 : 0;
    }
    
    loadSong(prevIndex);
    if (state.isPlaying) {
        player.playVideo();
    }
}

function stopPlayback() {
    if (player) {
        player.stopVideo();
    }
    state.isPlaying = false;
    stopProgressUpdate();
    updatePlayButton();
}

function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    document.getElementById('shuffleBtn').classList.toggle('active', state.isShuffle);
    saveState();
}

function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(state.repeatMode);
    state.repeatMode = modes[(currentIdx + 1) % modes.length];
    
    const btn = document.getElementById('repeatBtn');
    btn.classList.toggle('active', state.repeatMode !== 'off');
    btn.textContent = state.repeatMode === 'one' ? '🔂' : '🔁';
    saveState();
}

function setVolume(value) {
    state.volume = value;
    if (player) {
        player.setVolume(value);
    }
    updateVolumeButton();
    saveState();
}

function toggleMute() {
    if (state.volume === 0) {
        setVolume(state.previousVolume);
        document.getElementById('volumeBar').value = state.previousVolume;
    } else {
        state.previousVolume = state.volume;
        setVolume(0);
        document.getElementById('volumeBar').value = 0;
    }
}

function seekTo(seconds) {
    if (player) {
        player.seekTo(seconds);
        state.currentTime = seconds;
        updateProgress();
    }
}

// Playlist Management
function createPlaylist(name) {
    const playlist = {
        id: generateId(),
        name: name,
        songs: []
    };
    state.playlists.push(playlist);
    saveState();
    updatePlaylistsDisplay();
}

function loadPlaylist(playlistId) {
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    state.currentPlaylist = playlistId;
    state.queue = [...playlist.songs];
    state.currentIndex = state.queue.length > 0 ? 0 : -1;
    
    if (state.currentIndex >= 0) {
        loadSong(0);
    }
    
    saveState();
    updateUI();
}

// UI Updates
function updateUI() {
    updateQueueDisplay();
    updateNowPlaying();
    updatePlaylistsDisplay();
    updateLibraryDisplay();
}

function updateQueueDisplay() {
    const queueList = document.getElementById('queueList');
    
    if (state.queue.length === 0) {
        queueList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🎵</span>
                <p>Your queue is empty</p>
                <p class="text-muted">Add some songs to get started</p>
            </div>
        `;
        return;
    }
    
    queueList.innerHTML = state.queue.map((song, index) => `
        <div class="queue-item ${index === state.currentIndex ? 'active' : ''}" data-index="${index}">
            <img src="${song.thumbnail}" alt="${song.title}" class="queue-thumbnail">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <button class="btn-remove" data-index="${index}">✕</button>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.queue-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-remove')) {
                const index = parseInt(item.dataset.index);
                loadSong(index);
                if (!state.isPlaying) {
                    togglePlayPause();
                }
            }
        });
    });
    
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeFromQueue(index);
        });
    });
}

function updateNowPlaying() {
    const song = state.queue[state.currentIndex];
    const thumbnail = document.getElementById('playerThumbnail');
    const title = document.getElementById('playerTitle');
    const artist = document.getElementById('playerArtist');
    
    if (song) {
        thumbnail.innerHTML = `<img src="${song.thumbnail}" alt="${song.title}">`;
        title.textContent = song.title;
        artist.textContent = song.artist;
    } else {
        thumbnail.innerHTML = '<span class="thumbnail-placeholder">🎵</span>';
        title.textContent = 'No song playing';
        artist.textContent = 'Select a song to start';
    }
}

function updatePlayButton() {
    const playBtn = document.getElementById('playBtn');
    playBtn.textContent = state.isPlaying ? '⏸️' : '▶️';
}

function updateProgress() {
    const seekBar = document.getElementById('seekBar');
    const currentTimeEl = document.getElementById('currentTime');
    
    currentTimeEl.textContent = formatTime(state.currentTime);
    document.getElementById('duration').textContent = formatTime(state.duration);
    
    if (state.duration > 0) {
        seekBar.max = state.duration;
        seekBar.value = state.currentTime;
    }
}

function updateVolumeButton() {
    const muteBtn = document.getElementById('muteBtn');
    if (state.volume === 0) {
        muteBtn.textContent = '🔇';
    } else if (state.volume < 50) {
        muteBtn.textContent = '🔉';
    } else {
        muteBtn.textContent = '🔊';
    }
}

function updatePlaylistsDisplay() {
    const playlistsList = document.getElementById('playlistsList');
    
    if (state.playlists.length === 0) {
        playlistsList.innerHTML = '<p class="text-muted" style="padding: 1rem;">No playlists yet</p>';
        return;
    }
    
    playlistsList.innerHTML = state.playlists.map(playlist => `
        <div class="playlist-item ${state.currentPlaylist === playlist.id ? 'active' : ''}" data-id="${playlist.id}">
            <span>📝 ${playlist.name}</span>
            <span class="text-muted">${playlist.songs.length}</span>
        </div>
    `).join('');
    
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => {
            loadPlaylist(item.dataset.id);
        });
    });
}

function updateLibraryDisplay() {
    const libraryList = document.getElementById('libraryList');
    const songCount = document.getElementById('librarySongCount');
    
    songCount.textContent = `${state.allSongs.length} song${state.allSongs.length !== 1 ? 's' : ''}`;
    
    if (state.allSongs.length === 0) {
        libraryList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📀</span>
                <p>Your library is empty</p>
                <p class="text-muted">Add YouTube videos to start building your collection</p>
            </div>
        `;
        return;
    }
    
    libraryList.innerHTML = state.allSongs.map(song => `
        <div class="queue-item" data-id="${song.id}">
            <img src="${song.thumbnail}" alt="${song.title}" class="queue-thumbnail">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <button class="btn btn-ghost" data-id="${song.id}">Add to Queue</button>
        </div>
    `).join('');
    
    document.querySelectorAll('#libraryList .btn-ghost').forEach(btn => {
        btn.addEventListener('click', () => {
            const song = state.allSongs.find(s => s.id === btn.dataset.id);
            if (song) addToQueue(song);
        });
    });
}

// View Management
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    document.getElementById(`${viewName}View`).classList.remove('hidden');
    document.getElementById('headerTitle').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add Song
    document.getElementById('addSongBtn').addEventListener('click', () => {
        const url = document.getElementById('youtubeUrl').value.trim();
        if (url) {
            addSongFromUrl(url);
            document.getElementById('youtubeUrl').value = '';
        }
    });
    
    document.getElementById('youtubeUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('addSongBtn').click();
        }
    });
    
    // Player Controls
    document.getElementById('playBtn').addEventListener('click', togglePlayPause);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    document.getElementById('prevBtn').addEventListener('click', playPrevious);
    document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
    
    // Volume
    document.getElementById('volumeBar').addEventListener('input', (e) => {
        setVolume(parseInt(e.target.value));
    });
    document.getElementById('muteBtn').addEventListener('click', toggleMute);
    
    // Seek
    document.getElementById('seekBar').addEventListener('input', (e) => {
        seekTo(parseFloat(e.target.value));
    });
    
    // Queue
    document.getElementById('clearQueueBtn').addEventListener('click', clearQueue);
    
    // Sidebar
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
    });
    
    document.getElementById('sidebarClose').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
    });
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
            if (window.innerWidth < 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    });
    
    // Playlist Modal
    document.getElementById('createPlaylistBtn').addEventListener('click', () => {
        document.getElementById('createPlaylistModal').classList.add('open');
        document.getElementById('playlistNameInput').focus();
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('createPlaylistModal').classList.remove('open');
        document.getElementById('playlistNameInput').value = '';
    });
    
    document.getElementById('cancelPlaylistBtn').addEventListener('click', () => {
        document.getElementById('createPlaylistModal').classList.remove('open');
        document.getElementById('playlistNameInput').value = '';
    });
    
    document.getElementById('savePlaylistBtn').addEventListener('click', () => {
        const name = document.getElementById('playlistNameInput').value.trim();
        if (name) {
            createPlaylist(name);
            document.getElementById('createPlaylistModal').classList.remove('open');
            document.getElementById('playlistNameInput').value = '';
        }
    });
    
    document.getElementById('playlistNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('savePlaylistBtn').click();
        }
    });
    
    // Close modal on background click
    document.getElementById('createPlaylistModal').addEventListener('click', (e) => {
        if (e.target.id === 'createPlaylistModal') {
            document.getElementById('createPlaylistModal').classList.remove('open');
        }
    });
    
    // Initialize
    updateUI();
});

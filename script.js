// Music Player State
let player = null;
let playerReady = false;
let queue = [];
let allSongs = [];
let playlists = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'off'; // 'off', 'all', 'one'
let volume = 70;
let previousVolume = 70;
let currentTime = 0;
let duration = 0;
let updateInterval = null;

// Initialize YouTube API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('playerContainer', {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
            autoplay: 0,
            controls: 0,
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
        },
    });
}

function onPlayerReady(event) {
    playerReady = true;
    player.setVolume(volume);
    console.log('Player ready');
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayButton();
        startProgressUpdate();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayButton();
        stopProgressUpdate();
    } else if (event.data === YT.PlayerState.ENDED) {
        handleTrackEnd();
    }
}

// Extract YouTube Video ID
function extractVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
}

// Fetch Video Metadata
async function fetchVideoMetadata(videoId) {
    try {
        // Use YouTube oEmbed API for basic info
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        const data = await response.json();
        
        return {
            id: generateId(),
            youtubeId: videoId,
            title: data.title || 'Unknown Title',
            artist: data.author_name || 'Unknown Artist',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        };
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return {
            id: generateId(),
            youtubeId: videoId,
            title: 'Unknown Title',
            artist: 'Unknown Artist',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        };
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Add Song from URL
document.getElementById('addSongForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('youtubeUrl').value.trim();
    const videoId = extractVideoId(url);
    
    if (!videoId) {
        alert('Please enter a valid YouTube URL');
        return;
    }
    
    const song = await fetchVideoMetadata(videoId);
    queue.push(song);
    
    // Add to all songs if not already there
    if (!allSongs.find(s => s.youtubeId === videoId)) {
        allSongs.push(song);
    }
    
    document.getElementById('youtubeUrl').value = '';
    updateQueueUI();
    updateYourMusicCount();
    
    // Auto-play if first song
    if (queue.length === 1 && playerReady) {
        playTrack(0);
    }
    
    saveToLocalStorage();
});

// Play Track
function playTrack(index) {
    if (!playerReady || index < 0 || index >= queue.length) return;
    
    currentIndex = index;
    const song = queue[index];
    
    player.loadVideoById(song.youtubeId);
    player.playVideo();
    isPlaying = true;
    
    updateNowPlaying();
    updateQueueUI();
    updatePlayButton();
}

// Player Controls
document.getElementById('playBtn').addEventListener('click', () => {
    if (!playerReady || queue.length === 0) return;
    
    if (isPlaying) {
        player.pauseVideo();
    } else {
        if (currentIndex >= 0 && currentIndex < queue.length) {
            player.playVideo();
        } else if (queue.length > 0) {
            playTrack(0);
        }
    }
});

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentIndex > 0) {
        playTrack(currentIndex - 1);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    playNext();
});

document.getElementById('shuffleBtn').addEventListener('click', () => {
    isShuffle = !isShuffle;
    document.getElementById('shuffleBtn').classList.toggle('active', isShuffle);
    saveToLocalStorage();
});

document.getElementById('repeatBtn').addEventListener('click', () => {
    if (repeatMode === 'off') {
        repeatMode = 'all';
        document.getElementById('repeatBtn').textContent = '🔁';
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        document.getElementById('repeatBtn').textContent = '🔂';
    } else {
        repeatMode = 'off';
        document.getElementById('repeatBtn').textContent = '🔁';
    }
    document.getElementById('repeatBtn').classList.toggle('active', repeatMode !== 'off');
    saveToLocalStorage();
});

// Volume Control
document.getElementById('volumeSlider').addEventListener('input', (e) => {
    volume = parseInt(e.target.value);
    if (playerReady) {
        player.setVolume(volume);
    }
    updateMuteButton();
    saveToLocalStorage();
});

document.getElementById('muteBtn').addEventListener('click', () => {
    if (volume === 0) {
        volume = previousVolume;
    } else {
        previousVolume = volume;
        volume = 0;
    }
    document.getElementById('volumeSlider').value = volume;
    if (playerReady) {
        player.setVolume(volume);
    }
    updateMuteButton();
    saveToLocalStorage();
});

// Progress Bar
document.getElementById('progressBar').addEventListener('input', (e) => {
    const seekTime = (duration * e.target.value) / 100;
    if (playerReady) {
        player.seekTo(seekTime);
        currentTime = seekTime;
    }
});

// Track End Handler
function handleTrackEnd() {
    if (repeatMode === 'one') {
        player.playVideo();
    } else {
        playNext();
    }
}

function playNext() {
    if (currentIndex < queue.length - 1) {
        playTrack(currentIndex + 1);
    } else if (repeatMode === 'all' && queue.length > 0) {
        playTrack(0);
    } else {
        stopProgressUpdate();
        isPlaying = false;
        updatePlayButton();
    }
}

// Progress Update
function startProgressUpdate() {
    stopProgressUpdate();
    updateInterval = setInterval(() => {
        if (playerReady && player.getCurrentTime) {
            try {
                currentTime = player.getCurrentTime();
                duration = player.getDuration();
                updateProgressBar();
            } catch (e) {
                // Player not ready
            }
        }
    }, 100);
}

function stopProgressUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

function updateProgressBar() {
    const progress = (currentTime / duration) * 100;
    document.getElementById('progressBar').value = progress || 0;
    document.getElementById('currentTime').textContent = formatTime(currentTime);
    document.getElementById('duration').textContent = formatTime(duration);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// UI Updates
function updateNowPlaying() {
    const container = document.getElementById('nowPlayingContent');
    const song = queue[currentIndex];
    
    if (!song) {
        container.innerHTML = `
            <div class="empty-player">
                <div class="empty-player-icon">🎵</div>
                <div style="font-size: 0.875rem;">No song playing</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <img src="${song.thumbnail}" alt="${song.title}" class="now-playing-thumbnail">
        <div class="now-playing-info">
            <h3>${song.title}</h3>
            <p>${song.artist}</p>
        </div>
    `;
}

function updateQueueUI() {
    const queueList = document.getElementById('queueList');
    
    if (queue.length === 0) {
        queueList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <p>Queue is empty</p>
            </div>
        `;
        return;
    }
    
    queueList.innerHTML = queue.map((song, index) => `
        <div class="queue-item ${index === currentIndex ? 'active' : ''}" data-index="${index}">
            <img src="${song.thumbnail}" alt="${song.title}" class="queue-item-thumbnail">
            <div class="queue-item-info">
                <div class="queue-item-title">${song.title}</div>
                <div class="queue-item-artist">${song.artist}</div>
            </div>
            <button class="queue-item-remove" data-index="${index}">✕</button>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.queue-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('queue-item-remove')) {
                const index = parseInt(item.dataset.index);
                playTrack(index);
            }
        });
    });
    
    document.querySelectorAll('.queue-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeFromQueue(index);
        });
    });
}

function removeFromQueue(index) {
    if (index === currentIndex && isPlaying) {
        if (queue.length > 1) {
            playNext();
        } else {
            player.stopVideo();
            isPlaying = false;
        }
    }
    
    queue.splice(index, 1);
    
    if (index < currentIndex) {
        currentIndex--;
    } else if (index === currentIndex) {
        currentIndex = Math.min(currentIndex, queue.length - 1);
    }
    
    updateQueueUI();
    updateNowPlaying();
    saveToLocalStorage();
}

function updatePlayButton() {
    document.getElementById('playBtn').textContent = isPlaying ? '⏸️' : '▶️';
}

function updateMuteButton() {
    document.getElementById('muteBtn').textContent = volume === 0 ? '🔇' : '🔊';
}

// Playlist Management
document.getElementById('createPlaylistBtn').addEventListener('click', () => {
    document.getElementById('createPlaylistModal').classList.add('open');
});

document.getElementById('cancelPlaylistBtn').addEventListener('click', () => {
    document.getElementById('createPlaylistModal').classList.remove('open');
    document.getElementById('newPlaylistName').value = '';
});

document.getElementById('confirmPlaylistBtn').addEventListener('click', () => {
    const name = document.getElementById('newPlaylistName').value.trim();
    if (name) {
        playlists.push({
            id: generateId(),
            name: name,
            songs: []
        });
        document.getElementById('createPlaylistModal').classList.remove('open');
        document.getElementById('newPlaylistName').value = '';
        updatePlaylistsUI();
        saveToLocalStorage();
    }
});

function updatePlaylistsUI() {
    const playlistsList = document.getElementById('playlistsList');
    const playlistsManager = document.getElementById('playlistsManager');
    
    if (playlists.length === 0) {
        const emptyHTML = '<p style="text-align: center; color: var(--muted-foreground); padding: 2rem 0;">No playlists yet</p>';
        playlistsList.innerHTML = emptyHTML;
        playlistsManager.innerHTML = emptyHTML;
        return;
    }
    
    const playlistsHTML = playlists.map(playlist => `
        <button class="playlist-item" data-id="${playlist.id}">
            <div style="font-weight: 600;">${playlist.name}</div>
            <div style="font-size: 0.875rem; color: var(--muted-foreground);">${playlist.songs.length} songs</div>
        </button>
    `).join('');
    
    playlistsList.innerHTML = playlistsHTML;
    playlistsManager.innerHTML = playlistsHTML;
}

// Your Music Modal
document.getElementById('yourMusicBtn').addEventListener('click', () => {
    document.getElementById('yourMusicModal').classList.add('open');
    updateYourMusicUI();
});

document.getElementById('closeYourMusicBtn').addEventListener('click', () => {
    document.getElementById('yourMusicModal').classList.remove('open');
});

function updateYourMusicUI() {
    const grid = document.getElementById('yourMusicGrid');
    
    if (allSongs.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">🎵</div>
                <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">No music yet</h3>
                <p style="color: var(--muted-foreground);">Add YouTube videos to start building your collection</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = allSongs.map(song => `
        <div class="music-card" data-id="${song.id}">
            <img src="${song.thumbnail}" alt="${song.title}" class="music-card-image">
            <div class="music-card-overlay">
                <button class="music-card-play">▶️</button>
            </div>
            <div class="music-card-info">
                <div class="music-card-title">${song.title}</div>
                <div class="music-card-artist">${song.artist}</div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.music-card').forEach(card => {
        card.addEventListener('click', () => {
            const songId = card.dataset.id;
            const song = allSongs.find(s => s.id === songId);
            if (song && !queue.find(s => s.id === songId)) {
                queue.push(song);
                updateQueueUI();
                if (queue.length === 1 && playerReady) {
                    playTrack(0);
                }
                saveToLocalStorage();
            }
        });
    });
}

function updateYourMusicCount() {
    document.getElementById('musicCount').textContent = `${allSongs.length} songs in your library`;
}

// Mobile Menu Toggle
document.getElementById('menuToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
});

// Click outside to close modal
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('open');
        }
    });
});

// Local Storage
function saveToLocalStorage() {
    localStorage.setItem('musicPlayerState', JSON.stringify({
        queue,
        allSongs,
        playlists,
        volume,
        isShuffle,
        repeatMode
    }));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('musicPlayerState');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            queue = data.queue || [];
            allSongs = data.allSongs || [];
            playlists = data.playlists || [];
            volume = data.volume || 70;
            isShuffle = data.isShuffle || false;
            repeatMode = data.repeatMode || 'off';
            
            document.getElementById('volumeSlider').value = volume;
            document.getElementById('shuffleBtn').classList.toggle('active', isShuffle);
            document.getElementById('repeatBtn').classList.toggle('active', repeatMode !== 'off');
            if (repeatMode === 'one') {
                document.getElementById('repeatBtn').textContent = '🔂';
            }
            
            updateQueueUI();
            updatePlaylistsUI();
            updateNowPlaying();
            updateYourMusicCount();
            updateMuteButton();
        } catch (e) {
            console.error('Error loading from localStorage:', e);
        }
    }
}

// Initialize
window.addEventListener('load', () => {
    loadFromLocalStorage();
    updateNowPlaying();
});

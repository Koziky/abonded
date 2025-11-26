// YouTube Player State
let player;
let playerReady = false;
let playlist = [];
let queue = [];
let currentTrackIndex = 0;
let isShuffleOn = false;
let isRepeatOn = false;
let updateInterval;

// Initialize YouTube API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
            'autoplay': 0,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    playerReady = true;
    console.log('Player ready');
    updateVolumeDisplay();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        document.getElementById('playBtn').textContent = '⏸️';
        startProgressUpdate();
    } else if (event.data === YT.PlayerState.PAUSED) {
        document.getElementById('playBtn').textContent = '▶️';
        stopProgressUpdate();
    } else if (event.data === YT.PlayerState.ENDED) {
        handleTrackEnd();
    }
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Add video to playlist
document.getElementById('addBtn').addEventListener('click', async () => {
    const url = document.getElementById('videoUrl').value.trim();
    const videoId = extractVideoId(url);
    
    if (!videoId) {
        alert('Please enter a valid YouTube URL');
        return;
    }
    
    try {
        const videoData = {
            id: videoId,
            title: 'Loading...',
            duration: '0:00'
        };
        
        playlist.push(videoData);
        queue.push(videoData);
        
        document.getElementById('videoUrl').value = '';
        updatePlaylistUI();
        updateQueueUI();
        
        // Fetch video details
        fetchVideoDetails(videoId, playlist.length - 1);
        
        // Auto-play first video
        if (queue.length === 1 && playerReady) {
            playTrack(0);
        }
    } catch (error) {
        console.error('Error adding video:', error);
        alert('Error adding video. Please try again.');
    }
});

// Fetch video details (simplified - using player API)
function fetchVideoDetails(videoId, index) {
    // This is a simplified version. In production, you'd use YouTube Data API
    setTimeout(() => {
        if (playlist[index]) {
            playlist[index].title = `Video ${videoId}`;
            updatePlaylistUI();
            updateQueueUI();
        }
    }, 1000);
}

// Play/Pause
document.getElementById('playBtn').addEventListener('click', () => {
    if (!playerReady || queue.length === 0) return;
    
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
});

// Previous track
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentTrackIndex > 0) {
        playTrack(currentTrackIndex - 1);
    }
});

// Next track
document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentTrackIndex < queue.length - 1) {
        playTrack(currentTrackIndex + 1);
    }
});

// Shuffle
document.getElementById('shuffleBtn').addEventListener('click', () => {
    isShuffleOn = !isShuffleOn;
    document.getElementById('shuffleBtn').classList.toggle('active', isShuffleOn);
    
    if (isShuffleOn) {
        shuffleQueue();
    } else {
        queue = [...playlist];
        updateQueueUI();
    }
});

// Repeat
document.getElementById('repeatBtn').addEventListener('click', () => {
    isRepeatOn = !isRepeatOn;
    document.getElementById('repeatBtn').classList.toggle('active', isRepeatOn);
});

// Volume control
document.getElementById('volumeSlider').addEventListener('input', (e) => {
    if (playerReady) {
        player.setVolume(e.target.value);
    }
});

function updateVolumeDisplay() {
    if (playerReady) {
        const volume = player.getVolume();
        document.getElementById('volumeSlider').value = volume;
    }
}

// Shuffle queue
function shuffleQueue() {
    const currentTrack = queue[currentTrackIndex];
    const remainingTracks = queue.filter((_, i) => i !== currentTrackIndex);
    
    for (let i = remainingTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
    }
    
    queue = [currentTrack, ...remainingTracks];
    currentTrackIndex = 0;
    updateQueueUI();
}

// Play track
function playTrack(index) {
    if (!playerReady || index < 0 || index >= queue.length) return;
    
    currentTrackIndex = index;
    const track = queue[index];
    
    player.loadVideoById(track.id);
    player.playVideo();
    
    document.getElementById('currentTrack').textContent = track.title;
    updateQueueUI();
}

// Handle track end
function handleTrackEnd() {
    if (isRepeatOn) {
        player.playVideo();
    } else if (currentTrackIndex < queue.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else {
        stopProgressUpdate();
    }
}

// Progress bar update
function startProgressUpdate() {
    stopProgressUpdate();
    updateInterval = setInterval(updateProgress, 100);
}

function stopProgressUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

function updateProgress() {
    if (!playerReady) return;
    
    try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        
        if (duration > 0) {
            const progress = (currentTime / duration) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('currentTime').textContent = formatTime(currentTime);
            document.getElementById('duration').textContent = formatTime(duration);
        }
    } catch (error) {
        // Player not ready
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update UI
function updateQueueUI() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';
    
    if (queue.length === 0) {
        queueList.innerHTML = '<li style="padding: 2rem; text-align: center; color: var(--muted-foreground);">No tracks in queue</li>';
        return;
    }
    
    queue.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'track-item';
        if (index === currentTrackIndex) {
            li.classList.add('playing');
        }
        
        li.innerHTML = `
            <div class="track-item-info">
                <div class="track-item-title">${track.title}</div>
                <div class="track-item-duration">${track.duration}</div>
            </div>
            <button class="track-item-remove" data-index="${index}">✕</button>
        `;
        
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('track-item-remove')) {
                playTrack(index);
            }
        });
        
        queueList.appendChild(li);
    });
    
    // Add remove listeners
    document.querySelectorAll('.track-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeFromQueue(index);
        });
    });
}

function updatePlaylistUI() {
    const playlistList = document.getElementById('playlistList');
    playlistList.innerHTML = '';
    
    if (playlist.length === 0) {
        playlistList.innerHTML = '<li style="padding: 2rem; text-align: center; color: var(--muted-foreground);">No tracks in playlist</li>';
        return;
    }
    
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'track-item';
        
        li.innerHTML = `
            <div class="track-item-info">
                <div class="track-item-title">${track.title}</div>
                <div class="track-item-duration">${track.duration}</div>
            </div>
            <button class="track-item-remove" data-index="${index}">✕</button>
        `;
        
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('track-item-remove')) {
                addToQueue(track);
            }
        });
        
        playlistList.appendChild(li);
    });
    
    // Add remove listeners
    document.querySelectorAll('#playlistList .track-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            removeFromPlaylist(index);
        });
    });
}

function addToQueue(track) {
    queue.push(track);
    updateQueueUI();
    
    if (queue.length === 1 && playerReady) {
        playTrack(0);
    }
}

function removeFromQueue(index) {
    if (index === currentTrackIndex) {
        if (queue.length > 1) {
            playTrack(index < queue.length - 1 ? index : index - 1);
        }
    }
    
    queue.splice(index, 1);
    
    if (index < currentTrackIndex) {
        currentTrackIndex--;
    }
    
    updateQueueUI();
}

function removeFromPlaylist(index) {
    playlist.splice(index, 1);
    updatePlaylistUI();
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(tab + 'Tab').classList.add('active');
    });
});

// Enter key support for URL input
document.getElementById('videoUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('addBtn').click();
    }
});

// Initialize
updateQueueUI();
updatePlaylistUI();

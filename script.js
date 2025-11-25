// App State
const state = {
    queue: [
        { id: '1', title: 'Sample Song 1', artist: 'Artist Name', album: 'Album Name', duration: 195, thumbnail: '' },
        { id: '2', title: 'Sample Song 2', artist: 'Another Artist', album: 'Another Album', duration: 223, thumbnail: '' }
    ],
    pendingSong: null,
    playlists: [
        { id: '1', name: 'My Favorites', songCount: 2, songs: ['1', '2'] },
        { id: '2', name: 'Chill Vibes', songCount: 0, songs: [] }
    ],
    currentSongIndex: 0,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'off', // 'off', 'all', 'one'
    currentView: 'home',
    selectedPlaylist: null,
    progress: 0,
    volume: 80,
    isLiked: false
};

// DOM Elements
const elements = {
    navBtns: document.querySelectorAll('.nav-btn'),
    views: document.querySelectorAll('.view'),
    playlistList: document.querySelector('.playlist-list'),
    queueList: document.querySelector('.queue-list'),
    queueCount: document.querySelector('.queue-count'),
    createPlaylistBtn: document.querySelector('.create-playlist-btn'),
    addSongBtn: document.querySelector('.add-song-btn'),
    modal: document.getElementById('addSongModal'),
    modalClose: document.querySelector('.modal-close'),
    cancelBtn: document.querySelector('.cancel-btn'),
    playBtn: document.querySelector('.play-btn'),
    prevBtn: document.querySelector('.prev-btn'),
    nextBtn: document.querySelector('.next-btn'),
    shuffleBtn: document.querySelector('.shuffle-btn'),
    repeatBtn: document.querySelector('.repeat-btn'),
    likeBtn: document.querySelector('.like-btn'),
    progressSlider: document.querySelector('.progress-slider'),
    volumeSlider: document.querySelector('.volume-slider'),
    timeCurrent: document.querySelector('.time-current'),
    timeTotal: document.querySelector('.time-total'),
    songCover: document.querySelector('.song-cover'),
    songTitle: document.querySelector('.song-title'),
    songArtist: document.querySelector('.song-artist'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.querySelector('.search-results'),
    libraryGrid: document.querySelector('.library-grid')
};

// Utility Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getCurrentSong() {
    return state.queue[state.currentSongIndex] || null;
}

// Render Functions
function renderQueue() {
    const currentSong = getCurrentSong();
    elements.queueCount.textContent = `${state.queue.length} songs`;
    
    elements.queueList.innerHTML = state.queue.map((song, index) => `
        <div class="queue-item ${song.id === currentSong?.id ? 'active' : ''}" data-index="${index}">
            <svg class="drag-handle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            ${song.thumbnail ? `<img src="${song.thumbnail}" class="queue-item-thumbnail" alt="${song.title}">` : '<div class="queue-item-thumbnail">🎵</div>'}
            <div class="queue-item-info">
                <div class="queue-item-title">${song.title}${song.id === currentSong?.id ? ' <span style="color: var(--accent-purple)">Playing</span>' : ''}</div>
                <div class="queue-item-artist">${song.artist}</div>
            </div>
            <span class="queue-item-duration">${formatTime(song.duration)}</span>
            <div class="queue-item-actions">
                <button class="queue-btn remove-btn" data-id="${song.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            removeSong(id);
        });
    });

    // Add drag and drop
    initDragAndDrop();
}

function renderPlaylists() {
    elements.playlistList.innerHTML = state.playlists.map(playlist => `
        <div class="playlist-item ${state.selectedPlaylist === playlist.id ? 'active' : ''}" data-id="${playlist.id}">
            <div class="playlist-name">${playlist.name}</div>
            <div class="playlist-count">${playlist.songCount} songs</div>
        </div>
    `).join('');

    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => {
            state.selectedPlaylist = item.dataset.id;
            state.currentView = 'home';
            renderApp();
        });
    });
}

function renderLibrary() {
    elements.libraryGrid.innerHTML = state.playlists.map(playlist => `
        <div class="library-item" data-id="${playlist.id}">
            <div class="library-cover">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                </svg>
            </div>
            <div class="library-name">${playlist.name}</div>
            <div class="library-count">${playlist.songCount} song${playlist.songCount !== 1 ? 's' : ''}</div>
        </div>
    `).join('');

    document.querySelectorAll('.library-item').forEach(item => {
        item.addEventListener('click', () => {
            state.selectedPlaylist = item.dataset.id;
            state.currentView = 'home';
            renderApp();
        });
    });
}

function renderPlayer() {
    const song = getCurrentSong();
    
    if (song) {
        if (song.thumbnail) {
            elements.songCover.innerHTML = `<img src="${song.thumbnail}" alt="${song.title}">`;
        } else {
            elements.songCover.textContent = '🎵';
        }
        elements.songTitle.textContent = song.title;
        elements.songArtist.textContent = song.artist;
        elements.timeTotal.textContent = formatTime(song.duration);
    } else {
        elements.songCover.textContent = '🎵';
        elements.songTitle.textContent = 'No song playing';
        elements.songArtist.textContent = '';
        elements.timeTotal.textContent = '0:00';
    }

    // Update play button
    elements.playBtn.innerHTML = state.isPlaying 
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
               <rect x="6" y="4" width="4" height="16"></rect>
               <rect x="14" y="4" width="4" height="16"></rect>
           </svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
               <polygon points="5 3 19 12 5 21 5 3"></polygon>
           </svg>`;

    // Update shuffle button
    if (state.isShuffle) {
        elements.shuffleBtn.classList.add('active');
    } else {
        elements.shuffleBtn.classList.remove('active');
    }

    // Update repeat button
    if (state.repeatMode !== 'off') {
        elements.repeatBtn.classList.add('active');
    } else {
        elements.repeatBtn.classList.remove('active');
    }

    // Update like button
    if (state.isLiked) {
        elements.likeBtn.classList.add('liked');
    } else {
        elements.likeBtn.classList.remove('liked');
    }
}

function renderSearch() {
    const query = elements.searchInput.value.toLowerCase();
    
    if (!query) {
        elements.searchResults.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); margin-top: 80px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.5; margin: 0 auto 16px;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p style="font-size: 18px;">Start typing to search for songs</p>
            </div>
        `;
        return;
    }

    const results = state.queue.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.album.toLowerCase().includes(query)
    );

    if (results.length === 0) {
        elements.searchResults.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); margin-top: 80px;">
                <p style="font-size: 18px;">No results found for "${query}"</p>
            </div>
        `;
        return;
    }

    elements.searchResults.innerHTML = `
        <h2 style="margin-bottom: 16px;">${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"</h2>
        ${results.map(song => `
            <div class="search-result-item" data-id="${song.id}">
                <div class="result-cover">🎵</div>
                <div class="result-info">
                    <div class="result-title">${song.title}</div>
                    <div class="result-artist">${song.artist}</div>
                </div>
                <span class="result-duration">${formatTime(song.duration)}</span>
            </div>
        `).join('')}
    `;

    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const song = state.queue.find(s => s.id === item.dataset.id);
            playSong(song);
        });
    });
}

function renderApp() {
    // Update navigation
    elements.navBtns.forEach(btn => {
        if (btn.dataset.view === state.currentView) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update views
    elements.views.forEach(view => {
        if (view.classList.contains(`${state.currentView}-view`)) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    renderQueue();
    renderPlaylists();
    renderPlayer();
    
    if (state.currentView === 'library') {
        renderLibrary();
    } else if (state.currentView === 'search') {
        renderSearch();
    }
}

// Player Functions
function playSong(song) {
    const index = state.queue.findIndex(s => s.id === song.id);
    if (index !== -1) {
        state.currentSongIndex = index;
        state.isPlaying = true;
        renderApp();
    }
}

function togglePlayPause() {
    state.isPlaying = !state.isPlaying;
    renderApp();
}

function nextSong() {
    if (state.repeatMode === 'one') {
        return;
    }

    if (state.isShuffle) {
        state.currentSongIndex = Math.floor(Math.random() * state.queue.length);
    } else {
        const nextIndex = state.currentSongIndex + 1;
        if (nextIndex < state.queue.length) {
            state.currentSongIndex = nextIndex;
        } else if (state.repeatMode === 'all') {
            state.currentSongIndex = 0;
        }
    }
    renderApp();
}

function prevSong() {
    if (state.currentSongIndex > 0) {
        state.currentSongIndex--;
    } else if (state.repeatMode === 'all') {
        state.currentSongIndex = state.queue.length - 1;
    }
    renderApp();
}

function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    renderApp();
}

function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(state.repeatMode);
    state.repeatMode = modes[(currentIndex + 1) % modes.length];
    renderApp();
}

function removeSong(id) {
    const index = state.queue.findIndex(s => s.id === id);
    state.queue = state.queue.filter(s => s.id !== id);
    
    if (state.currentSongIndex >= state.queue.length) {
        state.currentSongIndex = Math.max(0, state.queue.length - 1);
    } else if (index < state.currentSongIndex) {
        state.currentSongIndex--;
    }
    
    renderApp();
}

function addSong(songData) {
    const newSong = {
        ...songData,
        id: Date.now().toString()
    };
    state.queue.push(newSong);
    state.pendingSong = null;
    renderApp();
}

// YouTube API Functions
async function fetchYouTubeInfo(url) {
    try {
        // Extract video ID from URL
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // Use YouTube oEmbed API (no API key required)
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
            throw new Error('Failed to fetch video info');
        }

        const data = await response.json();
        
        // Get thumbnail (higher quality)
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // Parse title and artist (usually in format "Artist - Song Title")
        let title = data.title;
        let artist = data.author_name;
        
        // Try to split title if it contains common separators
        if (title.includes(' - ')) {
            const parts = title.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        } else if (title.includes(' – ')) {
            const parts = title.split(' – ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' – ').trim();
        }

        return {
            title,
            artist,
            album: 'YouTube',
            thumbnail,
            duration: 180, // Default duration as we can't get it without API key
            videoId
        };
    } catch (error) {
        console.error('Error fetching YouTube info:', error);
        throw error;
    }
}

function extractVideoId(url) {
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Drag and Drop
function initDragAndDrop() {
    const items = document.querySelectorAll('.queue-item');
    let draggedItem = null;
    let draggedIndex = null;

    items.forEach((item, index) => {
        item.draggable = true;

        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            draggedIndex = parseInt(item.dataset.index);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
            draggedIndex = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedItem && draggedItem !== item) {
                const targetIndex = parseInt(item.dataset.index);
                const newQueue = [...state.queue];
                const draggedSong = newQueue[draggedIndex];
                
                newQueue.splice(draggedIndex, 1);
                newQueue.splice(targetIndex, 0, draggedSong);
                
                state.queue = newQueue;
                draggedIndex = targetIndex;
                renderQueue();
            }
        });
    });
}

// Event Listeners
elements.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.currentView = btn.dataset.view;
        state.selectedPlaylist = null;
        renderApp();
    });
});

elements.createPlaylistBtn.addEventListener('click', () => {
    const newPlaylist = {
        id: Date.now().toString(),
        name: `New Playlist ${state.playlists.length + 1}`,
        songCount: 0,
        songs: []
    };
    state.playlists.push(newPlaylist);
    renderApp();
});

elements.addSongBtn.addEventListener('click', () => {
    elements.modal.classList.add('active');
});

elements.modalClose.addEventListener('click', () => {
    elements.modal.classList.remove('active');
    resetModal();
});

elements.cancelBtn.addEventListener('click', () => {
    elements.modal.classList.remove('active');
    resetModal();
});

// YouTube fetch button
const fetchBtn = document.getElementById('fetchBtn');
const youtubeInput = document.getElementById('youtubeUrl');
const songPreview = document.getElementById('songPreview');
const addSongBtn = document.getElementById('addSongBtn');
const previewThumbnail = document.getElementById('previewThumbnail');
const previewTitle = document.getElementById('previewTitle');
const previewArtist = document.getElementById('previewArtist');

fetchBtn.addEventListener('click', async () => {
    const url = youtubeInput.value.trim();
    if (!url) return;

    fetchBtn.disabled = true;
    fetchBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
        Fetching...
    `;

    try {
        const songData = await fetchYouTubeInfo(url);
        state.pendingSong = songData;
        
        // Show preview
        previewThumbnail.src = songData.thumbnail;
        previewTitle.textContent = songData.title;
        previewArtist.textContent = songData.artist;
        songPreview.style.display = 'flex';
        addSongBtn.disabled = false;
        
        fetchBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Fetched Successfully
        `;
        fetchBtn.style.background = 'var(--accent-purple)';
    } catch (error) {
        alert('Failed to fetch video info. Please check the URL and try again.');
        fetchBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            Fetch Song Info
        `;
    } finally {
        fetchBtn.disabled = false;
    }
});

addSongBtn.addEventListener('click', () => {
    if (state.pendingSong) {
        addSong(state.pendingSong);
        elements.modal.classList.remove('active');
        resetModal();
    }
});

function resetModal() {
    youtubeInput.value = '';
    songPreview.style.display = 'none';
    addSongBtn.disabled = true;
    state.pendingSong = null;
    fetchBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
        Fetch Song Info
    `;
    fetchBtn.style.background = '';
}

elements.playBtn.addEventListener('click', togglePlayPause);
elements.prevBtn.addEventListener('click', prevSong);
elements.nextBtn.addEventListener('click', nextSong);
elements.shuffleBtn.addEventListener('click', toggleShuffle);
elements.repeatBtn.addEventListener('click', toggleRepeat);
elements.likeBtn.addEventListener('click', () => {
    state.isLiked = !state.isLiked;
    renderApp();
});

elements.progressSlider.addEventListener('input', (e) => {
    state.progress = parseInt(e.target.value);
    const song = getCurrentSong();
    if (song) {
        const currentTime = (state.progress / 100) * song.duration;
        elements.timeCurrent.textContent = formatTime(currentTime);
    }
});

elements.volumeSlider.addEventListener('input', (e) => {
    state.volume = parseInt(e.target.value);
});

elements.searchInput.addEventListener('input', renderSearch);

// Close modal on outside click
elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
        elements.modal.classList.remove('active');
        resetModal();
    }
});

// Initialize
renderApp();

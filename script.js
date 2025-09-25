// Example videos (put your video files in a "videos/" folder)
const videos = [
  { title: "Sample Video 1", file: "videos/video1.mp4" },
  { title: "Sample Video 2", file: "videos/video2.mp4" },
  { title: "Sample Video 3", file: "videos/video3.mp4" }
];

const gallery = document.getElementById("video-gallery");

// Generate video cards
videos.forEach(video => {
  const card = document.createElement("div");
  card.classList.add("video-card");
  card.innerHTML = `
    <h3>${video.title}</h3>
    <video controls>
      <source src="${video.file}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  `;
  gallery.appendChild(card);
});

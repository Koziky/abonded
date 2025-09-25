// Add your videos here.
// Put the video files inside the "videos" folder.
const videos = [
  { title: "My First Video", file: "videos/video1.mp4" },
  // You can add more like this:
  // { title: "Second Clip", file: "videos/video2.mp4" }
];

const gallery = document.getElementById("video-gallery");

videos.forEach(video => {
  const card = document.createElement("div");
  card.classList.add("video-card");
  card.innerHTML = `
    <h2>${video.title}</h2>
    <video controls>
      <source src="${video.file}" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  `;
  gallery.appendChild(card);
});

const remembered = new Map();

export function rememberVideos(videos = []) {
  for (const video of videos) {
    if (!video?.id) continue;
    remembered.set(video.id, { ...remembered.get(video.id), ...video });
  }
}

export function rememberVideo(video) {
  if (video?.id) remembered.set(video.id, { ...remembered.get(video.id), ...video });
}

export function getRememberedVideo(id) {
  return remembered.get(id) || null;
}

export default function AudioPlayer({ src, title }) {
  if (!src) return null;

  return (
    <div className="audio-player">
      {title && <div className="audio-player-title">{title}</div>}
      <audio controls preload="metadata">
        <source src={src} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

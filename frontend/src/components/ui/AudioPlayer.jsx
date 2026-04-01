export default function AudioPlayer({ src, title }) {
  if (!src) return null;

  return (
    <div className="audio-player">
      {title && <div className="audio-player-title">{title}</div>}
      <audio controls preload="metadata">
        <source src={src} />
        Seu navegador nao suporta o elemento de audio.
      </audio>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke , convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
type BeatProject = {
  folder: string;
  audio: string;
  artwork: string | null;
  duration: number;
};
type RenderProgress = {
  percent: number;
  time: number;
};
function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [theme, setTheme] = useState<"dark" | "beige">(() => {
    try {
      return localStorage.getItem("beatflow-theme") === "beige" ? "beige" : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("beatflow-theme", theme);
    } catch (error) {
      console.error("Could not save theme preference:", error);
    }
  }, [theme]);
  const [project, setProject] = useState<BeatProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const projectPanelRef = useRef<HTMLDivElement | null>(null);
  const hoverAudioRef = useRef<AudioContext | null>(null);
  const lastHoverSoundRef = useRef(0);

  const playHoverSound = () => {
    const now = Date.now();
    if (now - lastHoverSoundRef.current < 140) return;
    lastHoverSoundRef.current = now;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!hoverAudioRef.current) {
        hoverAudioRef.current = new AudioContextClass();
      }

      const context = hoverAudioRef.current;
      if (context.state === "suspended") {
        void context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(720, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(520, context.currentTime + 0.045);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.025, context.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.065);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.07);
    } catch {
      // Hover audio is a decorative enhancement; it must never interrupt the app.
    }
  };
  const scrollToProject = () => {
  requestAnimationFrame(() => {
    projectPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
};
  /*
   * Listen for real FFmpeg progress
   */
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupProgressListener = async () => {
      unlisten = await listen<RenderProgress>(
        "render-progress",
        (event) => {
          setRenderProgress(event.payload.percent);
          setRenderTime(event.payload.time);
        }
      );
    };
    setupProgressListener();
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
  /*
   * Scan beat folder
   */
  const scanFolder = async (folder: string) => {
    try {
      setError(null);
      setOutput(null);
      const result = await invoke("scan_beat_folder", {
        folder,
      });
      console.log("BeatFlow project:", result);
      console.log("Artwork path:", (result as BeatProject).artwork);
      console.log(
      "Artwork URL:",
      (result as BeatProject).artwork
        ? convertFileSrc((result as BeatProject).artwork!)
        : "No artwork found"
);
      setProject(result as BeatProject);
      scrollToProject();
    } catch (error) {
      console.error("BeatFlow scanner error:", error);
      setProject(null);
      setError(String(error));
      scrollToProject();
    }
  };
  /*
   * Browse for beat folder
   */
  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Beat Folder",
    });
    if (!selected || Array.isArray(selected)) {
      return;
    }
    await scanFolder(selected);
  };
  /*
   * Create video
   */
  const handleCreateVideo = async () => {
    if (!project || !project.artwork || isCreating) {
      return;
    }
    try {
      setError(null);
      setOutput(null);
      setIsCreating(true);
      setRenderProgress(0);
      setRenderTime(0);
      console.log("BeatFlow: creating video...");
      const result = await invoke<string>("create_video", {
        folder: project.folder,
      });
      console.log("BeatFlow video created:", result);
      setRenderProgress(100);
      setRenderTime(project.duration);
      setOutput(result);
      /*
       * Automatically open the folder containing the video.
       */
      try {
        await invoke("open_output_folder", {
          folder: project.folder,
        });
      } catch (error) {
        console.error("Could not open output folder:", error);
        setError(
          `Video created, but could not open folder: ${String(error)}`
        );
      }
    } catch (error) {
      console.error("BeatFlow render error:", error);
      setError(String(error));
    } finally {
      setIsCreating(false);
    }
  };

  /*
   * Native Tauri drag & drop
   */
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupDragDrop = async () => {
      unlisten =
        await getCurrentWebview().onDragDropEvent(
          (event) => {
            if (event.payload.type === "enter") {
              setIsDragging(true);
            }
            if (event.payload.type === "over") {
              setIsDragging(true);
            }
            if (event.payload.type === "leave") {
              setIsDragging(false);
            }
            if (event.payload.type === "drop") {
              setIsDragging(false);
              const droppedPath =
                event.payload.paths[0];
              if (!droppedPath) {
                return;
              }
              console.log(
                "BeatFlow dropped path:",
                droppedPath
              );
              scanFolder(droppedPath);
            }
          }
        );
    };
    setupDragDrop();
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
  const hasArtwork = Boolean(project?.artwork);
  const outputName = output
    ? output.split("/").pop()
    : null;
  /*
   * Format seconds as M:SS
   */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(
      seconds % 60
    );
    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };
  return (
    <main className={`app-shell ${theme === "beige" ? "theme-beige" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">
              BEATFLOW
            </div>
            <div className="brand-subtitle">
              VIDEO ENGINE
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onMouseEnter={playHoverSound}
            onClick={() => setTheme((current) => (current === "dark" ? "beige" : "dark"))}
            aria-label={`Switch to ${theme === "dark" ? "beige" : "dark"} theme`}
            title="Switch theme"
          >
            {theme === "dark" ? "BEIGE MODE" : "TEXTURED BLACK"}
          </button>
          <div className="system-status">
            <span className="status-dot" />
            <span>{isCreating ? "ENCODING" : "READY"}</span>
          </div>
        </div>
      </header>
      <section className="workspace">
        <div className="hero-copy">
          <p className="eyebrow">
            PRODUCER WORKFLOW
          </p>
          <h1>
            Turn your beat
            <br />
            into a <span>video.</span>
          </h1>
          <p className="hero-description">
            Drop a beat folder and BeatFlow handles
            the rest.
            <br />
            Artwork, audio, encoding — all in one
            place.
          </p>
        </div>
        <div
          className={`drop-zone ${
            isDragging ? "dragging" : ""
          }`}
          onMouseEnter={playHoverSound}
        >
          <div className="drop-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 16V4M12 4L7 9M12 4L17 9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 14V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V14"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2>
            {isDragging
              ? "DROP IT"
              : "DROP YOUR BEAT"}
          </h2>
          <p>
            {isDragging ? (
              <>
                Release to load your beat
                <br />
                <span>
                  BeatFlow will scan it automatically
                </span>
              </>
            ) : (
              <>
                Drag a beat folder anywhere here
                <br />
                <span>
                  or choose one manually
                </span>
              </>
            )}
          </p>
          <button
            className="browse-button"
            onMouseEnter={playHoverSound}
            onClick={handleBrowse}
          >
            Browse folders
          </button>
        </div>
        {error && (
          <div
            ref={projectPanelRef}
            className="project-panel project-panel-enter"
          >
            <div className="panel-heading">
              <div>
                <p className="section-label">
                  ERROR
                </p>
                <h3>
                  Something went wrong
                </h3>
              </div>
              <span className="panel-badge">
                ERROR
              </span>
            </div>
            <div className="project-content">
              <div className="project-details">
                <div className="detail-row">
                  <span>Message</span>
                  <span className="muted">
                    {error}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        {!error && (
          <div
            ref={projectPanelRef}
            className={`project-panel ${
              project
                ? "project-panel-enter"
                : ""
            }`}
          >
            <div className="panel-heading">
              <div>
                <p className="section-label">
                  PROJECT
                </p>
                <h3>
                  {project
                    ? project.folder
                        .split("/")
                        .pop()
                    : "Waiting for a beat"}
                </h3>
              </div>
              <span className="panel-badge">
                {project
                  ? hasArtwork
                    ? isCreating
                      ? "CREATING VIDEO"
                      : "PROJECT READY"
                    : "ARTWORK MISSING"
                  : "NO PROJECT"}
              </span>
            </div>
            <div className="project-content">
            <div className="artwork-placeholder">
  {project?.artwork ? (
    <img
      className="artwork-image"
      src={convertFileSrc(project.artwork)}
      alt="Beat artwork"
    />
  ) : (
    <div className="artwork-inner">
      <span>NO ARTWORK</span>
    </div>
  )}
</div>
              <div className="project-details">
                <div className="detail-row">
                  <span>Audio</span>
                  <span className="muted">
                    {project
                      ? project.audio
                          .split("/")
                          .pop()
                      : "Waiting..."}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Artwork</span>
                  <span className="muted">
                    {project
                      ? project.artwork
                        ? project.artwork
                            .split("/")
                            .pop()
                        : "Missing"
                      : "Waiting..."}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Duration</span>
                  <span className="muted">
                    {project
                      ? formatTime(
                          project.duration
                        )
                      : "—"}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Output</span>
                  <span className="muted">
                    {outputName ?? "—"}
                  </span>
                </div>
              </div>
            </div>
            {isCreating && (
              <div className="render-progress">
                <div className="render-progress-header">
                  <span>RENDERING</span>
                  <span>
                    {Math.round(renderProgress)}%
                  </span>
                </div>
                <div className="render-progress-track">
                  <div
                    className="render-progress-bar"
                    style={{
                      width: `${renderProgress}%`,
                    }}
                  />
                </div>
                <div className="render-progress-time">
                  <span>
                    {formatTime(renderTime)}
                  </span>
                  <span>
                    {project
                      ? formatTime(
                          project.duration
                        )
                      : "—"}
                  </span>
                </div>
              </div>
            )}
            <div className="panel-footer">
              <div className="engine-info">
                <span className="mini-dot" />
                {isCreating
                  ? "FFmpeg ENGINE RUNNING"
                  : "FFmpeg ENGINE"}
                <span className="engine-version">
                  {isCreating
                    ? "ENCODING"
                    : "READY"}
                </span>
              </div>
              <button
                className="create-button"
                disabled={
                  !project ||
                  !hasArtwork ||
                  isCreating
                }
                onClick={handleCreateVideo}
              >
                {isCreating
                  ? "CREATING..."
                  : "CREATE VIDEO"}
                <span>→</span>
              </button>
            </div>
          </div>
        )}
      </section>
      <footer className="footer">
        <span>BEATFLOW</span>
        <span>LOCAL PROCESSING</span>
        <span>v1.0.0</span>
      </footer>
    </main>
  );
}
export default App;
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  FileText,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Footer } from "@/components/ui/footer";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useDocumentAnalysis } from "@/contexts/DocumentAnalysisContext";
import { usePageTransitionNavigation } from "@/hooks/use-page-transition";
import BackNavigation from "@/components/BackNavigation";

const AudioDecipher: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const { analysisData, isLoading } = useDocumentAnalysis();
  const { navigateWithTransition } = usePageTransitionNavigation();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  // Debug logging at component level
  console.log("=== AUDIO DECIPHER COMPONENT RENDERED ===");
  console.log("Analysis data from context:", analysisData);
  console.log("Is loading:", isLoading);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [audioData, setAudioData] = useState<{
    audio_url?: string;
    title?: string;
    description?: string;
    summary?: string;
    transcript?: string;
    transcript_title?: string;
    key_points?: string[];
    recommendations?: string[];
    document_details?: {
      document_type?: string;
      word_count?: number;
      target_audience?: string;
      style?: string;
      topics_covered?: string[];
    };
  } | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  // Fetch audio data from backend
  const fetchAudioData = async (gcsUri: string) => {
    setIsLoadingAudio(true);
    setAudioError(null);

    console.log("Fetching audio data for GCS URI:", gcsUri);

    try {
      const requestBody = {
        file_uri: gcsUri, // Changed from gcs_uri to file_uri
      };

      console.log("Request body:", requestBody);
      console.log(
        "Making request to: `${import.meta.env.VITE_BACKEND_URL}/explain-document/"
      );

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/explain-document/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log("Audio data from backend:", data);

        // Transform the backend response to match our expected format
        const transformedData = {
          audio_url: data.audio_url,
          title:
            data.document_details?.document_type || "Document Audio Overview",
          description:
            data.document_details?.style ||
            "Audio explanation generated successfully",
          summary: data.message,
          transcript: data.document_details?.topics_covered?.join("\n\n") || "",
          transcript_title: "Document Topics Covered",
          key_points: data.document_details?.topics_covered || [],
          recommendations: data.document_details?.topics_covered || [],
          document_details: data.document_details,
        };

        console.log("Transformed audio data:", transformedData);
        setAudioData(transformedData);
      } else {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        setAudioError(
          `Backend error (${response.status}): ${errorText || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error fetching audio data:", error);
      setAudioError(
        `Network error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Get audio URL from backend data (no fallback)
  const audioUrl = audioData?.audio_url;

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          setAudioError("Failed to play audio");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    // Close dropdown after a small delay to ensure the click is processed
    setTimeout(() => {
      setIsSpeedDropdownOpen(false);
    }, 100);
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const handleMuteToggle = () => {
    setShowVolumeSlider(!showVolumeSlider);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
    }
    setIsMuted(newVolume === 0);
  };

  const getVolumeIcon = () => {
    if (volume === 0 || isMuted) {
      return <VolumeX className="h-5 w-5 text-muted-foreground" />;
    } else if (volume < 0.5) {
      return <Volume2 className="h-5 w-5 text-muted-foreground" />;
    } else {
      return <Volume2 className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Fetch audio data when analysisData changes
  useEffect(() => {
    console.log("=== AUDIO DECIPHER DEBUG ===");
    console.log("Analysis data changed:", analysisData);
    console.log("Risk assessment:", analysisData?.risk_assessment);
    console.log(
      "GCS URI in risk assessment:",
      analysisData?.risk_assessment?.gcs_uri
    );
    console.log("Full analysis data keys:", Object.keys(analysisData || {}));
    console.log(
      "Risk assessment keys:",
      Object.keys(analysisData?.risk_assessment || {})
    );

    if (analysisData?.risk_assessment?.gcs_uri) {
      const gcsUri = analysisData.risk_assessment?.gcs_uri as string;
      console.log("✅ GCS URI found:", gcsUri);
      console.log("GCS URI type:", typeof gcsUri);
      console.log("GCS URI length:", gcsUri.length);
      console.log("=== CALLING FETCH AUDIO DATA ===");
      fetchAudioData(gcsUri);
    } else {
      console.log("❌ No GCS URI found in analysis data");
      console.log(
        "Available keys in risk_assessment:",
        Object.keys(analysisData?.risk_assessment || {})
      );
      console.log("=== END AUDIO DECIPHER DEBUG ===");
    }
  }, [analysisData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isSpeedDropdownOpen && !target.closest(".speed-dropdown")) {
        setIsSpeedDropdownOpen(false);
      }
      if (showVolumeSlider && !target.closest(".volume-control")) {
        setShowVolumeSlider(false);
      }
    };

    if (isSpeedDropdownOpen || showVolumeSlider) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSpeedDropdownOpen, showVolumeSlider]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = "Career_guidance_system_Natural_Conversation.mp3";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.header
        className="glass-card sticky top-0 z-50 border-b border-border/50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackNavigation />
              <div
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() =>
                  navigateWithTransition("/dashboard", "Loading...")
                }
              >
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🎵</span>
                </div>
                <span className="text-2xl font-bold text-foreground">
                  Audio Decipher
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div
        className="container mx-auto px-4 py-8 relative z-10"
        variants={containerVariants}
      >
        {/* Page Header */}
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {isLoadingAudio
              ? "Loading Audio Analysis..."
              : "Audio Content Analysis"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {analysisData?.document_name
              ? `Audio analysis for ${analysisData.document_name} - Extract key insights, transcribe conversations, and understand content structure.`
              : "Upload and analyze audio files to extract key insights, transcribe conversations, and understand content structure."}
          </p>
          {isLoadingAudio && (
            <div className="flex items-center justify-center mt-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">
                Processing audio content...
              </span>
            </div>
          )}
        </motion.div>

        {/* Audio Player Card */}
        <Card className="p-8 rounded-xl border-0 bg-gradient-to-br from-background via-background to-primary/5 shadow-lg">
          <div className="flex items-center gap-6 mb-6">
            <div>
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {audioData?.title ||
                  analysisData?.document_name ||
                  "Audio Content Analysis"}
              </h2>
              <p className="text-muted-foreground">
                {audioData?.description || "AI-powered audio content analysis"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {audioData?.summary ||
                  "Listen to the audio content and explore the analysis below."}
              </p>
              {!analysisData && (
                <p className="text-xs text-yellow-600 mt-2 font-medium">
                  ⚠️ Please upload a document first to access audio analysis
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Error Message */}
            {audioError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm mb-2">{audioError}</p>
                {analysisData?.risk_assessment?.gcs_uri && (
                  <Button
                    onClick={() => {
                      const gcsUri = analysisData.risk_assessment
                        ?.gcs_uri as string;
                      fetchAudioData(gcsUri);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-800 border-red-300 hover:bg-red-100"
                  >
                    Retry Audio Fetch
                  </Button>
                )}
              </div>
            )}

            {/* Cool Loading State */}
            {isLoadingAudio && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-8 mb-6">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-white animate-spin" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping opacity-20"></div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    🎵 Generating Audio Content
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Our AI is creating a personalized audio explanation of your
                    document...
                  </p>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    This usually takes about 1 minute ⏱️
                  </p>
                </div>
              </div>
            )}

            {/* Audio Player - Only show when audio is loaded */}
            {!isLoadingAudio && audioUrl && (
              <>
                {/* Audio Controls */}
                <div className="flex items-center gap-6">
                  <div
                    className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-300"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 text-white" />
                    ) : (
                      <Play className="h-6 w-6 text-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative volume-control">
                        <button
                          onClick={handleMuteToggle}
                          className="p-1 rounded"
                        >
                          {getVolumeIcon()}
                        </button>

                        {showVolumeSlider && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-background border border-border/50 rounded-lg shadow-xl z-10 p-3 backdrop-blur-sm"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-xs text-muted-foreground font-medium">
                                Vol
                              </span>
                              <div className="h-16 flex items-center">
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={volume}
                                  onChange={(e) =>
                                    handleVolumeChange(
                                      parseFloat(e.target.value)
                                    )
                                  }
                                  className="w-1.5 h-16 bg-muted/30 rounded-md appearance-none cursor-pointer slider"
                                  style={{
                                    background: `linear-gradient(to bottom, hsl(var(--accent)) 0%, hsl(var(--accent)) ${
                                      volume * 100
                                    }%, hsl(var(--muted)) ${
                                      volume * 100
                                    }%, hsl(var(--muted)) 100%)`,
                                    writingMode: "vertical-lr" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                                    WebkitAppearance: "slider-vertical",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">
                                {Math.round(volume * 100)}%
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1 mx-3">
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-2 bg-muted/30 rounded-lg appearance-none cursor-pointer slider hover:bg-muted/50 transition-colors"
                          style={{
                            background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${
                              (currentTime / duration) * 100
                            }%, hsl(var(--muted)) ${
                              (currentTime / duration) * 100
                            }%, hsl(var(--muted)) 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">
                        {formatTime(duration)}
                      </span>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">
                        Speed:
                      </span>
                      <div className="relative speed-dropdown">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setIsSpeedDropdownOpen(!isSpeedDropdownOpen)
                          }
                          className="h-8 px-3 text-xs bg-muted/30 hover:bg-muted/50 border-0"
                        >
                          {playbackRate}x
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>

                        {isSpeedDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-1 bg-background border border-border/50 rounded-lg shadow-xl z-10 min-w-[80px] backdrop-blur-sm"
                          >
                            {speedOptions.map((speed) => (
                              <button
                                key={speed}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSpeedChange(speed);
                                }}
                                className={`w-full px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                  playbackRate === speed
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <div
                  className="flex items-center text-primary font-semibold cursor-pointer hover:text-primary/80 transition-colors duration-200 p-2 rounded-lg hover:bg-primary/5"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5 mr-3" />
                  Download Audio File
                  <span>→</span>
                </div>

                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setAudioError("Audio playback error")}
                  onPlay={() => {
                    if (audioRef.current) {
                      audioRef.current.playbackRate = playbackRate;
                      audioRef.current.volume = volume;
                      audioRef.current.muted = volume === 0;
                    }
                  }}
                />
              </>
            )}

            {/* No Audio Available Message */}
            {!isLoadingAudio && !audioUrl && !audioError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="text-yellow-600 mb-2">🎵</div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Audio Not Available
                </h3>
                <p className="text-yellow-700">
                  Please upload a document first to generate audio content.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Transcript Section */}
        <motion.div variants={itemVariants} className="mt-8">
          <Card className="p-8 rounded-lg border bg-gradient-to-br from-background to-muted/20 shadow-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {audioData?.transcript_title || "Document Topics Covered"}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Key topics and insights from your document
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {isLoadingAudio ? (
                <div className="text-center py-16">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                      <FileText className="h-10 w-10 text-white animate-pulse" />
                    </div>
                    <div className="absolute inset-0 w-20 h-20 mx-auto bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl animate-ping opacity-20"></div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    📝 Processing Document Content
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Extracting and analyzing document topics...
                  </p>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              ) : audioData?.transcript ? (
                <div className="space-y-6">
                  {audioData.document_details?.topics_covered?.map(
                    (topic: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative"
                      >
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/40">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-foreground leading-relaxed text-base font-medium group-hover:text-primary transition-colors duration-200">
                                {topic}
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  )}
                </div>
              ) : audioData?.summary ? (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8">
                  <h3 className="font-bold text-xl mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📋</span>
                    </div>
                    Summary
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-base">
                    {audioData.summary}
                  </p>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mb-6">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    No Document Content Available
                  </h3>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      Welcome to our audio content analysis. This section will
                      display the transcript and analysis of your uploaded
                      document.
                    </p>
                    <p>
                      Please upload a document first to see the audio analysis
                      and transcript here.
                    </p>
                    <p>
                      Once you upload a document, this section will show the
                      detailed audio content analysis including key insights,
                      transcript, and recommendations.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Additional Analysis Section */}
        {audioData && (
          <motion.div variants={itemVariants} className="mt-8">
            <Card className="p-8 rounded-lg border bg-gradient-to-br from-background to-muted/20 shadow-lg">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Document Analysis
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Comprehensive insights and metadata
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {audioData.summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">📋</span>
                      </div>
                      <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                        Executive Summary
                      </h3>
                    </div>
                    <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-base font-medium">
                      {audioData.summary}
                    </p>
                  </motion.div>
                )}

                {audioData.document_details && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">📄</span>
                      </div>
                      <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                        Document Metadata
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                                📝
                              </span>
                            </div>
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                              Document Type
                            </span>
                          </div>
                          <span className="text-emerald-900 dark:text-emerald-100 font-bold text-sm bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                            {audioData.document_details.document_type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                                📊
                              </span>
                            </div>
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                              Word Count
                            </span>
                          </div>
                          <span className="text-emerald-900 dark:text-emerald-100 font-bold text-sm bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                            {audioData.document_details.word_count}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                                👥
                              </span>
                            </div>
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                              Target Audience
                            </span>
                          </div>
                          <span className="text-emerald-900 dark:text-emerald-100 font-bold text-sm bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                            {audioData.document_details.target_audience}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                                🎨
                              </span>
                            </div>
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                              Writing Style
                            </span>
                          </div>
                          <span className="text-emerald-900 dark:text-emerald-100 font-bold text-sm bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                            {audioData.document_details.style}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {audioData.key_points && audioData.key_points.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">🎯</span>
                      </div>
                      <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">
                        Key Topics & Insights
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {audioData.key_points.map(
                        (point: string, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="group"
                          >
                            <div className="flex items-start gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-amber-200/50 dark:border-amber-700/50 hover:shadow-md transition-all duration-200 hover:border-amber-300 dark:hover:border-amber-600">
                              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform duration-200">
                                {index + 1}
                              </div>
                              <p className="text-amber-800 dark:text-amber-200 leading-relaxed text-sm font-medium group-hover:text-amber-900 dark:group-hover:text-amber-100 transition-colors duration-200">
                                {point}
                              </p>
                            </div>
                          </motion.div>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Footer */}
        <Footer className="mt-16" />
      </motion.div>
    </motion.div>
  );
};

export default AudioDecipher;

// Audio manager to coordinate audio playback across components
let currentAudio: HTMLAudioElement | null = null;

export const audioManager = {
    play(audio: HTMLAudioElement) {
        // Stop any currently playing audio
        if (currentAudio && currentAudio !== audio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        // Set the new audio as current and play it
        currentAudio = audio;
        audio.play();
    },

    stop() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
    }
}; 
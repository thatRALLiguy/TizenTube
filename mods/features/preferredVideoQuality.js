import { configRead, configChangeEmitter } from "../config.js";

const SELECTORS = {
    PLAYER: '.html5-video-player',
};

const EVENTS = {
    YT_STATE_CHANGE: 'onStateChange',
    CONFIG_CHANGE: 'configChange',
};

const CONFIG_KEYS = {
    QUALITY: 'preferredVideoQuality',
};

class PreferredQualityHandler {
    #player = null;
    #attachTimeout = null;
    #lastVideoId = null;
    #hasAppliedQuality = false;

    constructor() {
        this.init();
    }

    init() {
        this.#pollForPlayer();
        this.#setupConfigListener();
    }

    #pollForPlayer() {
        clearTimeout(this.#attachTimeout);

        const playerElement = document.querySelector(SELECTORS.PLAYER);

        if (!playerElement) {
            this.#attachTimeout = setTimeout(() => this.#pollForPlayer(), 100);
            return;
        }

        this.#player = playerElement;

        this.#player.addEventListener(EVENTS.YT_STATE_CHANGE, this.#handleStateChange);

        this.#handleStateChange();
    }

    #setupConfigListener() {
        configChangeEmitter.addEventListener(EVENTS.CONFIG_CHANGE, (ev) => {
            if (ev.detail?.key === CONFIG_KEYS.QUALITY) {
                this.#hasAppliedQuality = this.#applyQuality();
            }
        });
    }

    #handleStateChange = () => {
        const state = this.#player?.getPlayerStateObject?.();
        const videoData = this.#player?.getVideoData?.();
        const videoId = videoData?.video_id;

        if (videoId !== this.#lastVideoId) {
            this.#lastVideoId = videoId;
            this.#hasAppliedQuality = false;
        }

        const stats = this.#player.getVideoStats?.() || {};
        const isShorts = Object.keys(stats).some(key => stats[key] === 'shortspage');
        if (state?.isPlaying && !this.#hasAppliedQuality && !isShorts) {
            this.#hasAppliedQuality = this.#applyQuality();
        }
    };

    #applyQuality() {
        const preferredQuality = configRead(CONFIG_KEYS.QUALITY);
        if (!this.#player || typeof this.#player.setPlaybackQualityRange !== 'function') return false;

        try {
            const quality = !preferredQuality || preferredQuality === 'auto' ? 'default' : this.#determineQuality(preferredQuality);

            if (quality) {
              this.#player.setPlaybackQualityRange(quality, quality);
              return true;
            }
        } catch (e) {
            console.warn('[PreferredQuality] Failed to apply quality:', e);
        }
        return false;
    }

    #determineQuality(preference) {
        const availableQualities = this.#player.getAvailableQualityData();
        if (!availableQualities?.length) return null;

        const getQualityValue = (label) => parseInt(label, 10) || 0;
        const targetValue = getQualityValue(preference);

        const sorted = availableQualities.filter(q => getQualityValue(q.qualityLabel) > 0)
            .slice().sort((a, b) => getQualityValue(b.qualityLabel) - getQualityValue(a.qualityLabel));
        const match = sorted.find(q => getQualityValue(q.qualityLabel) <= targetValue);
        return match ? match.quality : sorted.length ? sorted[sorted.length - 1].quality : null;
    }
}

window.preferredVideoQualityHandler = new PreferredQualityHandler();

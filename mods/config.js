const CONFIG_KEY = 'ytaf-configuration';
const defaultConfig = {
  enableAdBlock: true,
  enableSponsorBlock: true,
  enableSponsorBlockToasts: true,
  sponsorBlockManualSkips: ['intro', 'outro', 'filler'],
  enableSponsorBlockSponsor: true,
  enableSponsorBlockIntro: true,
  enableSponsorBlockOutro: true,
  enableSponsorBlockInteraction: true,
  enableSponsorBlockSelfPromo: true,
  enableSponsorBlockPreview: true,
  enableSponsorBlockMusicOfftopic: true,
  enableSponsorBlockFiller: false,
  enableSponsorBlockHighlight: true,
  videoSpeed: 1,
  preferredVideoQuality: 'auto',
  enableDeArrow: true,
  enableDeArrowThumbnails: false,
  focusContainerColor: '#0f0f0f',
  routeColor: '#0f0f0f',
  enableFixedUI: (window.h5vcc) ? false : true,
  enableHqThumbnails: false,
  enableChapters: true,
  enableLongPress: true,
  enableShorts: true,
  dontCheckUpdateUntil: 0,
  enableWhoIsWatchingMenu: false,
  permanentlyEnableWhoIsWatchingMenu: false,
  enableWhosWatchingMenuOnAppExit: false,
  enableShowUserLanguage: true,
  enableShowOtherLanguages: false,
  enableCaptionStylePersistence: true,
  captionStyleSettings: null,
  captionRawKeyBackups: {},
  showWelcomeToast: true,
  enablePreviousNextButtons: true,
  enableSuperThanksButton: false,
  enableAIAskButton: false,
  enableSpeedControlsButton: true,
  enablePatchingVideoPlayer: true,
  enableMPButton: true,
  enableSwapMPWithPIP: false,
  enablePreviews: true,
  enableHideWatchedVideos: false,
  hideWatchedVideosThreshold: 80,
  hideWatchedVideosPages: [],
  enableHideEndScreenCards: false,
  enableYouThereRenderer: true,
  lastAnnouncementCheck: 0,
  enableScreenDimming: false,
  dimmingTimeout: 60,
  dimmingOpacity: 0.5,
  enablePaidPromotionOverlay: true,
  speedSettingsIncrement: 0.25,
  videoPreferredCodec: 'any',
  launchToOnStartup: null,
  reloadHomeOnStartup: true,
  disabledSidebarContents: [],
  sidebarContentsOrder: [],
  disableChannelsOnSidebar: false,
  enableUpdater: true,
  autoFrameRate: false,
  autoFrameRatePauseVideoFor: 0,
  enableSigninReminder: false,
  sortSubscriptionsByAlphabet: false,
  enableClock: false,
  isClock12HourFormat: false,
  clockShowSeconds: false,
  clockHideWhenVideoPlaying: false,
  disableEnlargingThumbnails: false,
  enableShrinkingThumbnails: false,
  hideRelatedVideosPlayer: false,
};

let localConfig;

try {
  localConfig = JSON.parse(window.localStorage[CONFIG_KEY]);
  if (!localConfig || typeof localConfig !== 'object' || Array.isArray(localConfig)) {
    throw new Error('Invalid settings object');
  }
} catch (err) {
  console.warn('Config read failed:', err);
  localConfig = JSON.parse(JSON.stringify(defaultConfig));
}

export function configRead(key) {
  if (!Object.prototype.hasOwnProperty.call(defaultConfig, key)) return localConfig[key];
  if (localConfig[key] === undefined ||
      (defaultConfig[key] !== null && (typeof localConfig[key] !== typeof defaultConfig[key] ||
       Array.isArray(localConfig[key]) !== Array.isArray(defaultConfig[key])))) {
    console.warn('Populating key', key, 'with default value', defaultConfig[key]);
    localConfig[key] = JSON.parse(JSON.stringify(defaultConfig[key] === undefined ? null : defaultConfig[key]));
  }

  return localConfig[key];
}

export function configWrite(key, value) {
  console.info('Setting key', key, 'to', value);
  localConfig[key] = value;
  try {
    window.localStorage[CONFIG_KEY] = JSON.stringify(localConfig);
  } catch (err) {
    console.warn('Settings could not be saved; using them for this session.', err);
  }
  configChangeEmitter.dispatchEvent(new CustomEvent('configChange', { detail: { key, value } }));
}

export const configChangeEmitter = {
  listeners: {},
  addEventListener(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  },
  removeEventListener(type, callback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
  },
  dispatchEvent(event) {
    const type = event.type;
    if (!this.listeners[type]) return;
    this.listeners[type].forEach(cb => {
      try {
        cb.call(this, event)
      } catch (_) {};
    });
  }
};

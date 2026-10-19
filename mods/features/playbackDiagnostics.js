// Snapshot only: no polling, network requests, or changes to playback.
function read(object, method) {
    try { return object && typeof object[method] === 'function' ? object[method]() : null; }
    catch (_) { return null; }
}

function text(value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : 'Not reported';
}

export function collectPlaybackDiagnostics(doc = document, win = window) {
    const player = doc.querySelector('.html5-video-player');
    const video = doc.querySelector('video');
    const stats = read(player, 'getStatsForNerds') || {};
    const quality = read(video, 'getVideoPlaybackQuality');
    return [
        ['Build', 'TizenTube 1.15.2 reliability.1'],
        ['Playback engine', win.h5vcc ? 'Cobalt' : 'HTML5 / browser'],
        ['Playback', !video ? 'No video element' : video.ended ? 'Ended' : video.paused ? 'Paused' : 'Playing'],
        ['Decoded resolution', video && video.videoWidth ? video.videoWidth + ' × ' + video.videoHeight : 'Not reported'],
        ['Player resolution / frame rate', text(stats.resolution)],
        ['Selected quality', text(read(player, 'getPlaybackQuality'))],
        ['Codecs (player report)', text(stats.codecs)],
        ['Color / HDR (player report)', text(stats.color)],
        ['Playback speed', video ? text(video.playbackRate) + '×' : 'Not reported'],
        ['Dropped frames', text(quality ? quality.droppedVideoFrames : video && video.webkitDroppedFrameCount)],
        ['Total frames', text(quality ? quality.totalVideoFrames : video && video.webkitDecodedFrameCount)],
        ['Audio output / surround', 'Not exposed by this player; rear-speaker activity does not identify the stream channel count.']
    ];
}

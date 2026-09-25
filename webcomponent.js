(function(){
/**
 * VideoRTC v1.6.0 - Video player for go2rtc streaming application.
 * Enhanced for Smart TV (Tizen, webOS, Android TV, Fire TV) & Desktop compatibility.
 */
class VideoRTC extends HTMLElement {
    constructor() {
        super();

        this.DISCONNECT_TIMEOUT = 5000;
        this.RECONNECT_TIMEOUT = 15000;

        this.CODECS = [
            'avc1.42E01E',      // H.264 Baseline 3.0 (broadest Smart TV support)
            'avc1.42001E',      // H.264 Baseline 3.0 alt
            'avc1.4D401E',      // H.264 Main 3.0
            'avc1.4D401F',      // H.264 Main 3.1
            'avc1.4D4028',      // H.264 Main 4.0
            'avc1.64001E',      // H.264 High 3.0
            'avc1.64001F',      // H.264 High 3.1
            'avc1.640028',      // H.264 High 4.0
            'avc1.640029',      // H.264 High 4.1 (Chromecast 1st and 2nd Gen)
            'avc1.64002A',      // H.264 High 4.2 (Chromecast 3rd Gen)
            'avc1.640033',      // H.264 High 5.1 (Chromecast with Google TV)
            'hvc1.1.6.L153.B0', // H.265 Main 5.1 (Chromecast Ultra)
            'hev1.1.6.L153.B0', // H.265 Main 5.1 alt
            'mp4a.40.2',        // AAC LC
            'mp4a.40.5',        // AAC HE
            'flac',             // FLAC (PCM compatible)
            'opus',             // OPUS Chrome, Firefox
        ];

        /**
         * [config] Supported modes (webrtc, webrtc/tcp, mse, hls, mp4, mjpeg).
         * @type {string}
         */
        this.mode = 'webrtc,mse,hls,mjpeg';

        /**
         * [Config] Requested medias (video, audio, microphone).
         * @type {string}
         */
        this.media = 'video,audio';

        /**
         * [config] Run stream when not displayed on the screen. Default `false`.
         * @type {boolean}
         */
        this.background = false;

        /**
         * [config] Run stream only when player in the viewport. Stop when user scroll out player.
         * Value is percentage of visibility from `0` (not visible) to `1` (full visible).
         * Default `0` - disable;
         * @type {number}
         */
        this.visibilityThreshold = 0;

        /**
         * [config] Run stream only when browser page on the screen. Stop when user change browser
         * tab or minimise browser windows.
         * @type {boolean}
         */
        this.visibilityCheck = true;

        /**
         * [config] WebRTC configuration
         * @type {RTCConfiguration}
         */
        this.pcConfig = {
            bundlePolicy: 'max-bundle',
            iceServers: [{urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302']}],
            sdpSemantics: 'unified-plan',  // important for Chromecast 1
        };

        /**
         * [info] WebSocket connection state. Values: CONNECTING, OPEN, CLOSED
         * @type {number}
         */
        this.wsState = WebSocket.CLOSED;

        /**
         * [info] WebRTC connection state.
         * @type {number}
         */
        this.pcState = WebSocket.CLOSED;

        /**
         * @type {HTMLVideoElement}
         */
        this.video = null;

        /**
         * @type {WebSocket}
         */
        this.ws = null;

        /**
         * @type {string|URL}
         */
        this.wsURL = '';

        /**
         * @type {RTCPeerConnection}
         */
        this.pc = null;

        /**
         * @type {number}
         */
        this.connectTS = 0;

        /**
         * @type {string}
         */
        this.mseCodecs = '';

        /**
         * [internal] Disconnect TimeoutID.
         * @type {number}
         */
        this.disconnectTID = 0;

        /**
         * [internal] Reconnect TimeoutID.
         * @type {number}
         */
        this.reconnectTID = 0;

        /**
         * [internal] Handler for receiving Binary from WebSocket.
         * @type {Function}
         */
        this.ondata = null;

        /**
         * [internal] Handlers list for receiving JSON from WebSocket.
         * @type {Object.<string,Function>}
         */
        this.onmessage = null;
    }

    /**
     * Set video source (WebSocket URL). Support relative path.
     * @param {string|URL} value
     */
    set src(value) {
        if (!value) {
            this.wsURL = '';
            this.ondisconnect();
            return;
        }
        if (typeof value !== 'string') value = value.toString();
        if (value.startsWith('http')) {
            value = 'ws' + value.substring(4);
        } else if (value.startsWith('/')) {
            value = 'ws' + location.origin.substring(4) + value;
        }

        this.wsURL = value;
        this.onconnect();
    }

    /**
     * Play video. Support automute when autoplay blocked.
     * https://developer.chrome.com/blog/autoplay/
     */
    play() {
        if (!this.video) return;
        this.video.muted = true;
        const p = this.video.play();
        if (p && typeof p.catch === 'function') {
            p.catch(er => {
                if (!this.video.muted) {
                    this.video.muted = true;
                    this.video.play().catch(e => {
                        console.debug('[VideoRTC] Autoplay rejected:', e);
                    });
                }
            });
        }
    }

    /**
     * Send message to server via WebSocket
     * @param {Object} value
     */
    send(value) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(value));
            } catch (e) {
                console.warn('[VideoRTC] ws send error:', e);
            }
        }
    }

    /** @param {Function} isSupported */
    codecs(isSupported) {
        let supported = '';
        try {
            supported = this.CODECS
                .filter(codec => this.media.includes(codec.includes('vc1') || codec.includes('ev1') ? 'video' : 'audio'))
                .filter(codec => {
                    try {
                        return typeof isSupported === 'function' && isSupported(`video/mp4; codecs="${codec}"`);
                    } catch (e) {
                        return false;
                    }
                }).join();
        } catch (e) {
            console.warn('[VideoRTC] codec detection error:', e);
        }

        // Smart TV Fallback: if browser gave false for high profiles, send safe standards
        if (!supported && this.media.includes('video')) {
            supported = 'avc1.42E01E,avc1.640029,mp4a.40.2';
        }
        return supported;
    }

    /**
     * `CustomElement`. Invoked each time the custom element is appended into a
     * document-connected element.
     */
    connectedCallback() {
        if (this.disconnectTID) {
            clearTimeout(this.disconnectTID);
            this.disconnectTID = 0;
        }

        // because video autopause on disconnected from DOM
        if (this.video) {
            try {
                const seek = this.video.seekable;
                if (seek && seek.length > 0) {
                    this.video.currentTime = seek.end(seek.length - 1);
                }
            } catch (e) {}
            this.play();
        } else {
            this.oninit();
        }

        this.onconnect();
    }

    /**
     * `CustomElement`. Invoked each time the custom element is disconnected from the
     * document's DOM.
     */
    disconnectedCallback() {
        if (this.background || this.disconnectTID) return;
        if (this.wsState === WebSocket.CLOSED && this.pcState === WebSocket.CLOSED) return;

        this.disconnectTID = setTimeout(() => {
            if (this.reconnectTID) {
                clearTimeout(this.reconnectTID);
                this.reconnectTID = 0;
            }

            this.disconnectTID = 0;
            this.ondisconnect();
        }, this.DISCONNECT_TIMEOUT);
    }

    /**
     * Creates child DOM elements. Called automatically once on `connectedCallback`.
     */
    oninit() {
        this.video = document.createElement('video');
        this.video.controls = false; // TV / clean video wall display without default OS play bars
        this.video.playsInline = true;
        this.video.muted = true;
        this.video.autoplay = true;
        this.video.preload = 'auto';
        this.video.setAttribute('muted', '');
        this.video.setAttribute('autoplay', '');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('webkit-playsinline', '');
        this.video.setAttribute('preload', 'auto');

        this.video.style.display = 'block'; // fix bottom margin 4px
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        this.video.style.objectFit = 'contain';

        this.appendChild(this.video);

        this.video.addEventListener('error', ev => {
            const err = this.video.error;
            const MEDIA_ERRORS = {
                1: 'MEDIA_ERR_ABORTED',
                2: 'MEDIA_ERR_NETWORK',
                3: 'MEDIA_ERR_DECODE',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
            };
            console.error('[VideoRTC] Video error:', {
                error: err ? MEDIA_ERRORS[err.code] : 'unknown',
                message: err ? err.message : 'unknown',
                codecs: this.mseCodecs || 'not set',
                readyState: this.video.readyState,
                networkState: this.video.networkState,
                currentTime: this.video.currentTime
            });
            if (this.ws) {
                try { this.ws.close(); } catch (e) {}
            }
        });

        // all Safari lies about supported audio codecs
        const ua = (window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : '';
        const m = ua.match(/Version\/(\d+).+Safari/);
        if (m) {
            const skip = m[1] < '13' ? 'mp4a.40.2' : m[1] < '14' ? 'flac' : 'opus';
            const skipIdx = this.CODECS.indexOf(skip);
            if (skipIdx !== -1) this.CODECS.splice(skipIdx);
        }

        if (this.background) return;

        if ('hidden' in document && this.visibilityCheck) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.disconnectedCallback();
                } else if (this.isConnected) {
                    this.connectedCallback();
                }
            });
        }

        if ('IntersectionObserver' in window && this.visibilityThreshold) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        this.disconnectedCallback();
                    } else if (this.isConnected) {
                        this.connectedCallback();
                    }
                });
            }, {threshold: this.visibilityThreshold});
            observer.observe(this);
        }
    }

    /**
     * Connect to WebSocket. Called automatically on `connectedCallback`.
     * @return {boolean} true if the connection has started.
     */
    onconnect() {
        if (!this.isConnected || !this.wsURL || this.ws || this.pc) return false;

        this.wsState = WebSocket.CONNECTING;
        this.connectTS = Date.now();

        try {
            this.ws = new WebSocket(this.wsURL);
            this.ws.binaryType = 'arraybuffer';
            this.ws.addEventListener('open', () => this.onopen());
            this.ws.addEventListener('close', () => this.onclose());
            this.ws.addEventListener('error', (err) => {
                console.warn('[VideoRTC] WebSocket error:', err);
            });
            return true;
        } catch (e) {
            console.error('[VideoRTC] WebSocket creation failed:', e);
            return false;
        }
    }

    ondisconnect() {
        this.wsState = WebSocket.CLOSED;
        if (this.ws) {
            try { this.ws.close(); } catch(e) {}
            this.ws = null;
        }

        this.pcState = WebSocket.CLOSED;
        if (this.pc) {
            try {
                this.pc.getSenders().forEach(sender => {
                    if (sender.track) {
                        try { sender.track.stop(); } catch(e) {}
                    }
                });
                this.pc.close();
            } catch(e) {}
            this.pc = null;
        }

        if (this.video) {
            try {
                this.video.src = '';
                this.video.srcObject = null;
            } catch(e) {}
        }
    }

    /**
     * @returns {Array.<string>} of modes (mse, webrtc, etc.)
     */
    onopen() {
        this.wsState = WebSocket.OPEN;

        this.ws.addEventListener('message', ev => {
            if (typeof ev.data === 'string') {
                try {
                    const msg = JSON.parse(ev.data);
                    for (const mode in this.onmessage) {
                        if (typeof this.onmessage[mode] === 'function') {
                            this.onmessage[mode](msg);
                        }
                    }
                } catch(e) {}
            } else if (typeof this.ondata === 'function') {
                this.ondata(ev.data);
            }
        });

        this.ondata = null;
        this.onmessage = {};

        const modes = [];

        if (this.mode.includes('mse') && ('MediaSource' in window || 'ManagedMediaSource' in window)) {
            modes.push('mse');
            this.onmse();
        } else if (this.mode.includes('hls') && this.video && this.video.canPlayType && this.video.canPlayType('application/vnd.apple.mpegurl')) {
            modes.push('hls');
            this.onhls();
        } else if (this.mode.includes('mp4')) {
            modes.push('mp4');
            this.onmp4();
        }

        if (this.mode.includes('webrtc') && 'RTCPeerConnection' in window) {
            modes.push('webrtc');
            this.onwebrtc();
        }

        if (this.mode.includes('mjpeg')) {
            if (modes.length) {
                this.onmessage['mjpeg'] = msg => {
                    if (msg.type !== 'error' || (modes[0] && msg.value && msg.value.indexOf(modes[0]) !== 0)) return;
                    this.onmjpeg();
                };
            } else {
                modes.push('mjpeg');
                this.onmjpeg();
            }
        }

        return modes;
    }

    /**
     * @return {boolean} true if reconnection has started.
     */
    onclose() {
        if (this.wsState === WebSocket.CLOSED) return false;

        this.wsState = WebSocket.CONNECTING;
        this.ws = null;

        const delay = Math.max(this.RECONNECT_TIMEOUT - (Date.now() - this.connectTS), 0);

        this.reconnectTID = setTimeout(() => {
            this.reconnectTID = 0;
            this.onconnect();
        }, delay);

        return true;
    }

    onmse() {
        /** @type {MediaSource} */
        let ms;

        if ('ManagedMediaSource' in window) {
            const MediaSource = window.ManagedMediaSource;

            ms = new MediaSource();
            ms.addEventListener('sourceopen', () => {
                this.send({type: 'mse', value: this.codecs(MediaSource.isTypeSupported)});
            }, {once: true});

            this.video.disableRemotePlayback = true;
            this.video.srcObject = ms;
        } else if ('MediaSource' in window) {
            ms = new MediaSource();
            ms.addEventListener('sourceopen', () => {
                try { URL.revokeObjectURL(this.video.src); } catch(e) {}
                this.send({type: 'mse', value: this.codecs(MediaSource.isTypeSupported)});
            }, {once: true});

            try {
                this.video.src = URL.createObjectURL(ms);
                this.video.srcObject = null;
            } catch (e) {
                console.warn('[VideoRTC] createObjectURL failed:', e);
            }
        }

        this.play();
        this.mseCodecs = '';

        this.onmessage['mse'] = msg => {
            if (msg.type !== 'mse') return;

            this.mseCodecs = msg.value;

            let sb;
            try {
                sb = ms.addSourceBuffer(msg.value);
            } catch (e) {
                console.warn('[VideoRTC] addSourceBuffer failed:', e, msg.value);
                return;
            }
            sb.mode = 'segments';
            sb.addEventListener('updateend', () => {
                if (!sb.updating && bufLen > 0) {
                    try {
                        const data = buf.slice(0, bufLen);
                        sb.appendBuffer(data);
                        bufLen = 0;
                    } catch (e) {}
                }

                if (!sb.updating && sb.buffered && sb.buffered.length) {
                    try {
                        const end = sb.buffered.end(sb.buffered.length - 1);
                        const start = end - 5;
                        const start0 = sb.buffered.start(0);
                        if (start > start0) {
                            sb.remove(start0, start);
                            if (typeof ms.setLiveSeekableRange === 'function') {
                                ms.setLiveSeekableRange(start, end);
                            }
                        }
                        if (this.video.currentTime < start) {
                            this.video.currentTime = start;
                        }
                        const gap = end - this.video.currentTime;
                        this.video.playbackRate = gap > 0.1 ? gap : 0.1;
                    } catch(e) {}
                }
            });

            const buf = new Uint8Array(2 * 1024 * 1024);
            let bufLen = 0;

            this.ondata = data => {
                if (sb.updating || bufLen > 0) {
                    const b = new Uint8Array(data);
                    buf.set(b, bufLen);
                    bufLen += b.byteLength;
                } else {
                    try {
                        sb.appendBuffer(data);
                    } catch (e) {}
                }
            };
        };
    }

    onwebrtc() {
        let pc;
        try {
            pc = new RTCPeerConnection(this.pcConfig);
        } catch (e) {
            console.warn('[VideoRTC] RTCPeerConnection creation failed:', e);
            return;
        }

        pc.addEventListener('icecandidate', ev => {
            if (ev.candidate && this.mode.includes('webrtc/tcp') && ev.candidate.protocol === 'udp') return;
            const candidate = ev.candidate ? ev.candidate.toJSON().candidate : '';
            this.send({type: 'webrtc/candidate', value: candidate});
        });

        pc.addEventListener('connectionstatechange', () => {
            if (pc.connectionState === 'connected') {
                const tracks = pc.getTransceivers()
                    .filter(tr => tr.currentDirection === 'recvonly')
                    .map(tr => tr.receiver.track);
                const video2 = document.createElement('video');
                video2.muted = true;
                video2.autoplay = true;
                video2.addEventListener('loadeddata', () => this.onpcvideo(video2), {once: true});
                video2.srcObject = new MediaStream(tracks);
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                try { pc.close(); } catch(e) {}
                this.pcState = WebSocket.CLOSED;
                this.pc = null;
                this.onconnect();
            }
        });

        this.onmessage['webrtc'] = msg => {
            switch (msg.type) {
                case 'webrtc/candidate':
                    if (this.mode.includes('webrtc/tcp') && msg.value.includes(' udp ')) return;
                    pc.addIceCandidate({candidate: msg.value, sdpMid: '0'}).catch(er => {
                        console.warn(er);
                    });
                    break;
                case 'webrtc/answer':
                    pc.setRemoteDescription({type: 'answer', sdp: msg.value}).catch(er => {
                        console.warn(er);
                    });
                    break;
                case 'error':
                    if (!msg.value || !msg.value.includes('webrtc/offer')) return;
                    try { pc.close(); } catch(e) {}
            }
        };

        this.createOffer(pc).then(offer => {
            this.send({type: 'webrtc/offer', value: offer.sdp});
        }).catch(e => {
            console.warn('[VideoRTC] createOffer failed:', e);
        });

        this.pcState = WebSocket.CONNECTING;
        this.pc = pc;
    }

    /**
     * @param pc {RTCPeerConnection}
     * @return {Promise<RTCSessionDescriptionInit>}
     */
    async createOffer(pc) {
        try {
            if (this.media.includes('microphone') && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                const media = await navigator.mediaDevices.getUserMedia({audio: true});
                media.getTracks().forEach(track => {
                    pc.addTransceiver(track, {direction: 'sendonly'});
                });
            }
        } catch (e) {
            console.warn(e);
        }

        for (const kind of ['video', 'audio']) {
            if (this.media.includes(kind)) {
                try {
                    pc.addTransceiver(kind, {direction: 'recvonly'});
                } catch(e) {}
            }
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return offer;
    }

    /**
     * @param video2 {HTMLVideoElement}
     */
    onpcvideo(video2) {
        if (this.pc) {
            let rtcPriority = 0, msePriority = 0;

            /** @type {MediaStream} */
            const stream = video2.srcObject;
            if (stream && stream.getVideoTracks().length > 0) {
                const sdp = (this.pc.remoteDescription && this.pc.remoteDescription.sdp) ? this.pc.remoteDescription.sdp : '';
                const isH265Supported = sdp.includes('H265/90000');
                rtcPriority += isH265Supported ? 0x240 : 0x220;
            }
            if (stream && stream.getAudioTracks().length > 0) rtcPriority += 0x102;

            if (this.mseCodecs.includes('hvc1.') || this.mseCodecs.includes('hev1.')) msePriority += 0x230;
            if (this.mseCodecs.includes('avc1.')) msePriority += 0x210;
            if (this.mseCodecs.includes('mp4a.')) msePriority += 0x101;

            if (rtcPriority >= msePriority) {
                this.video.srcObject = stream;
                this.play();

                this.pcState = WebSocket.OPEN;
                this.wsState = WebSocket.CLOSED;
                if (this.ws) {
                    try { this.ws.close(); } catch(e) {}
                    this.ws = null;
                }
            } else {
                this.pcState = WebSocket.CLOSED;
                if (this.pc) {
                    try { this.pc.close(); } catch(e) {}
                    this.pc = null;
                }
            }
        }

        video2.srcObject = null;
    }

    onmjpeg() {
        this.ondata = data => {
            if (this.video) {
                this.video.controls = false;
                try {
                    const blob = new Blob([data], {type: 'image/jpeg'});
                    const oldUrl = this._blobUrl;
                    this._blobUrl = URL.createObjectURL(blob);
                    this.video.poster = this._blobUrl;
                    if (oldUrl) URL.revokeObjectURL(oldUrl);
                } catch (e) {
                    this.video.poster = 'data:image/jpeg;base64,' + VideoRTC.btoa(data);
                }
            }
        };
        this.send({type: 'mjpeg'});
    }

    onhls() {
        this.onmessage['hls'] = msg => {
            if (msg.type !== 'hls') return;
            const url = 'http' + this.wsURL.substring(2, this.wsURL.indexOf('/ws')) + '/hls/';
            const playlist = msg.value.replace('hls/', url);
            this.video.src = 'data:application/vnd.apple.mpegurl;base64,' + btoa(playlist);
            this.play();
        };
        this.send({type: 'hls', value: this.codecs(type => this.video.canPlayType(type))});
    }

    onmp4() {
        /** @type {HTMLCanvasElement} **/
        const canvas = document.createElement('canvas');
        let context;

        const video2 = document.createElement('video');
        video2.autoplay = true;
        video2.playsInline = true;
        video2.muted = true;
        video2.setAttribute('muted', '');
        video2.setAttribute('autoplay', '');
        video2.setAttribute('playsinline', '');

        video2.addEventListener('loadeddata', () => {
            if (!context) {
                canvas.width = video2.videoWidth;
                canvas.height = video2.videoHeight;
                context = canvas.getContext('2d');
            }
            if (context) {
                context.drawImage(video2, 0, 0, canvas.width, canvas.height);
                this.video.controls = false;
                this.video.poster = canvas.toDataURL('image/jpeg');
            }
        });

        this.ondata = data => {
            video2.src = 'data:video/mp4;base64,' + VideoRTC.btoa(data);
        };

        this.send({type: 'mp4', value: this.codecs(this.video.canPlayType)});
    }

    static btoa(buffer) {
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        let binary = '';
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

/**
 * Extended VideoStream component for Video Wall & TV dashboards.
 */
class VideoStream extends VideoRTC {
    set divMode(value) {
        const modeEl = this.querySelector('.mode');
        const statEl = this.querySelector('.status');
        if (modeEl) modeEl.innerText = value;
        if (statEl) statEl.innerText = '';
    }

    set divError(value) {
        const modeEl = this.querySelector('.mode');
        const statEl = this.querySelector('.status');
        if (!modeEl) return;
        const state = modeEl.innerText;
        if (state !== 'loading') return;
        modeEl.innerText = 'error';
        if (statEl) statEl.innerText = value;
    }

    /**
     * Custom GUI
     */
    oninit() {
        console.debug('stream.oninit');
        super.oninit();

        this.innerHTML = `
        <style>
        video-stream {
            position: relative;
            display: block;
            width: 100%;
            height: 100%;
        }
        .info {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 8px 10px;
            color: white;
            display: flex;
            justify-content: space-between;
            pointer-events: none;
            font-size: 11px;
            z-index: 2;
        }
        </style>
        <div class="info">
            <div class="status"></div>
            <div class="mode"></div>
        </div>
        `;

        const info = this.querySelector('.info');
        this.insertBefore(this.video, info);
    }

    onconnect() {
        console.debug('stream.onconnect');
        const result = super.onconnect();
        if (result) this.divMode = 'loading';
        return result;
    }

    ondisconnect() {
        console.debug('stream.ondisconnect');
        super.ondisconnect();
    }

    onopen() {
        console.debug('stream.onopen');
        const result = super.onopen();

        this.onmessage['stream'] = msg => {
            console.debug('stream.onmessage', msg);
            switch (msg.type) {
                case 'error':
                    this.divError = msg.value;
                    break;
                case 'mse':
                case 'hls':
                case 'mp4':
                case 'mjpeg':
                    this.divMode = msg.type.toUpperCase();
                    break;
            }
        };

        return result;
    }

    onclose() {
        console.debug('stream.onclose');
        return super.onclose();
    }

    onpcvideo(ev) {
        console.debug('stream.onpcvideo');
        super.onpcvideo(ev);

        if (this.pcState !== WebSocket.CLOSED) {
            this.divMode = 'RTC';
        }
    }
}

if (!customElements.get('video-stream')) {
    customElements.define('video-stream', VideoStream);
}
})();

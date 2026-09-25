/**
 * VideoRTC v1.6.0 - Smart TV & Desktop Optimized Video Player for go2rtc.
 */
export class VideoRTC extends HTMLElement {
    constructor() {
        super();

        this.DISCONNECT_TIMEOUT = 5000;
        this.RECONNECT_TIMEOUT = 15000;

        this.CODECS = [
            'avc1.42E01E',      // H.264 Baseline 3.0 (Smart TV primary)
            'avc1.42001E',      // H.264 Baseline 3.0 alt
            'avc1.4D401E',      // H.264 Main 3.0
            'avc1.4D401F',      // H.264 Main 3.1
            'avc1.4D4028',      // H.264 Main 4.0
            'avc1.64001E',      // H.264 High 3.0
            'avc1.64001F',      // H.264 High 3.1
            'avc1.640028',      // H.264 High 4.0
            'avc1.640029',      // H.264 High 4.1
            'avc1.64002A',      // H.264 High 4.2
            'avc1.640033',      // H.264 High 5.1
            'hvc1.1.6.L153.B0', // H.265 Main 5.1
            'hev1.1.6.L153.B0', // H.265 Main 5.1 alt
            'mp4a.40.2',        // AAC LC
            'mp4a.40.5',        // AAC HE
            'flac',             // FLAC
            'opus',             // OPUS
        ];

        /**
         * [config] Supported modes (mse, webrtc, mp4, mjpeg, snapshot).
         * @type {string}
         */
        this.mode = 'mse,webrtc,mp4,mjpeg';

        /**
         * [Config] Requested medias (video, audio).
         * @type {string}
         */
        this.media = 'video,audio';

        this.background = false;
        this.visibilityThreshold = 0;
        this.visibilityCheck = true;

        this.pcConfig = {
            bundlePolicy: 'max-bundle',
            iceServers: [{urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302']}],
            sdpSemantics: 'unified-plan',
        };

        this.wsState = WebSocket.CLOSED;
        this.pcState = WebSocket.CLOSED;

        this.video = null;
        this.img = null;
        this.ws = null;
        this.wsURL = '';
        this.pc = null;
        this.connectTS = 0;
        this.mseCodecs = '';

        this.disconnectTID = 0;
        this.reconnectTID = 0;
        this._snapshotTimer = null;

        this.ondata = null;
        this.onmessage = null;
        this._blobUrl = null;
        this._mediaStream = null;
    }

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

    play() {
        if (!this.video) return;
        this.video.muted = true;
        try {
            const p = this.video.play();
            if (p && typeof p.catch === 'function') {
                p.catch(er => {
                    if (!this.video.muted) {
                        this.video.muted = true;
                        this.video.play().catch(function(e) {});
                    }
                });
            }
        } catch (e) {}
    }

    send(value) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(value));
            } catch (e) {
                console.warn('[VideoRTC] ws send error:', e);
            }
        }
    }

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
            console.warn('[VideoRTC] codec check error:', e);
        }

        if (!supported && this.media.includes('video')) {
            supported = 'avc1.42E01E,avc1.640029,mp4a.40.2';
        }
        return supported;
    }

    connectedCallback() {
        if (this.disconnectTID) {
            clearTimeout(this.disconnectTID);
            this.disconnectTID = 0;
        }

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

    oninit() {
        this.video = document.createElement('video');
        this.video.controls = false;
        this.video.playsInline = true;
        this.video.muted = true;
        this.video.autoplay = true;
        this.video.preload = 'auto';
        this.video.setAttribute('muted', '');
        this.video.setAttribute('autoplay', '');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('webkit-playsinline', '');
        this.video.setAttribute('preload', 'auto');
        this.video.style.display = 'block';
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        this.video.style.objectFit = 'contain';

        this.img = document.createElement('img');
        this.img.style.display = 'none';
        this.img.style.width = '100%';
        this.img.style.height = '100%';
        this.img.style.objectFit = 'contain';
        this.img.style.background = '#000';

        this.appendChild(this.video);
        this.appendChild(this.img);

        this.video.addEventListener('error', ev => {
            console.warn('[VideoRTC] Video element error:', this.video.error);
            if (this.ws) {
                try { this.ws.close(); } catch (e) {}
            }
        });

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
    }

    onconnect() {
        if (!this.isConnected || !this.wsURL) return false;

        const modePref = (this.mode || '').toLowerCase();
        if (modePref === 'snapshot') {
            this.onsnapshot();
            return true;
        }

        if (this.ws || this.pc) return false;

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
        if (this._snapshotTimer) {
            clearInterval(this._snapshotTimer);
            this._snapshotTimer = null;
        }

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

        if (this._blobUrl) {
            try { URL.revokeObjectURL(this._blobUrl); } catch(e) {}
            this._blobUrl = null;
        }

        if (this.video) {
            try {
                this.video.src = '';
                this.video.srcObject = null;
            } catch(e) {}
        }
    }

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

        const modePref = this.mode.toLowerCase();

        if (modePref === 'snapshot') {
            this.onsnapshot();
            return ['snapshot'];
        }

        if (modePref === 'mjpeg' || modePref.startsWith('mjpeg')) {
            this.onmjpeg();
            return ['mjpeg'];
        }

        if (modePref.includes('mse') && ('MediaSource' in window || 'ManagedMediaSource' in window)) {
            this.onmse();
            this.onmessage['fallback'] = msg => {
                if (msg.type === 'error' && modePref.includes('mjpeg')) {
                    this.onmjpeg();
                }
            };
            return ['mse'];
        }

        if (modePref.includes('webrtc') && 'RTCPeerConnection' in window) {
            this.onwebrtc();
            return ['webrtc'];
        }

        if (modePref.includes('mp4')) {
            this.onmp4();
            return ['mp4'];
        }

        this.onmjpeg();
        return ['mjpeg'];
    }

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
        if (this.img) this.img.style.display = 'none';
        if (this.video) this.video.style.display = 'block';

        let ms;
        const hasManaged = ('ManagedMediaSource' in window);
        const MediaSourceClass = hasManaged ? window.ManagedMediaSource : window.MediaSource;

        if (!MediaSourceClass) {
            this.onmjpeg();
            return;
        }

        ms = new MediaSourceClass();
        ms.addEventListener('sourceopen', () => {
            const codecStr = this.codecs(MediaSourceClass.isTypeSupported);
            this.send({type: 'mse', value: codecStr});
        }, {once: true});

        if (hasManaged) {
            this.video.disableRemotePlayback = true;
            this.video.srcObject = ms;
        } else {
            try {
                if (this.video.src && this.video.src.startsWith('blob:')) {
                    URL.revokeObjectURL(this.video.src);
                }
                this.video.src = URL.createObjectURL(ms);
                this.video.srcObject = null;
            } catch (e) {
                console.warn('[VideoRTC] createObjectURL for MediaSource failed:', e);
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
                this.onmjpeg();
                return;
            }
            sb.mode = 'segments';

            const buf = new Uint8Array(2 * 1024 * 1024);
            let bufLen = 0;

            sb.addEventListener('updateend', () => {
                if (!sb.updating && bufLen > 0) {
                    try {
                        const data = buf.slice(0, bufLen);
                        bufLen = 0;
                        sb.appendBuffer(data);
                    } catch (e) {}
                }

                if (!sb.updating && sb.buffered && sb.buffered.length > 0) {
                    try {
                        const start0 = sb.buffered.start(0);
                        const end = sb.buffered.end(sb.buffered.length - 1);

                        if (this.video.currentTime < start0 || this.video.currentTime > end || (end - this.video.currentTime) > 4) {
                            this.video.currentTime = Math.max(start0, end - 0.3);
                        }

                        const keepStart = Math.max(start0, end - 6);
                        if (keepStart > start0 && !sb.updating) {
                            sb.remove(start0, keepStart);
                        }

                        const gap = end - this.video.currentTime;
                        this.video.playbackRate = gap > 0.4 ? (gap > 2 ? 1.4 : 1.1) : 1.0;
                    } catch(e) {}
                }
            });

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
        if (this.img) this.img.style.display = 'none';
        if (this.video) this.video.style.display = 'block';

        let pc;
        try {
            pc = new RTCPeerConnection(this.pcConfig);
        } catch (e) {
            console.warn('[VideoRTC] RTCPeerConnection creation failed:', e);
            this.onmse();
            return;
        }

        pc.addEventListener('icecandidate', ev => {
            if (ev.candidate && this.mode.includes('webrtc/tcp') && ev.candidate.protocol === 'udp') return;
            const candidate = ev.candidate ? ev.candidate.toJSON().candidate : '';
            this.send({type: 'webrtc/candidate', value: candidate});
        });

        pc.addEventListener('track', ev => {
            if (this.video) {
                if (ev.streams && ev.streams[0]) {
                    this.video.srcObject = ev.streams[0];
                } else if (ev.track) {
                    if (!this._mediaStream) this._mediaStream = new MediaStream();
                    this._mediaStream.addTrack(ev.track);
                    this.video.srcObject = this._mediaStream;
                }
                this.play();
                this.pcState = WebSocket.OPEN;
            }
        });

        pc.addEventListener('connectionstatechange', () => {
            if (pc.connectionState === 'connected') {
                const tracks = pc.getTransceivers()
                    .filter(tr => tr.currentDirection === 'recvonly')
                    .map(tr => tr.receiver.track)
                    .filter(Boolean);
                if (tracks.length > 0 && this.video && !this.video.srcObject) {
                    this.video.srcObject = new MediaStream(tracks);
                    this.play();
                }
                this.pcState = WebSocket.OPEN;
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
                    if (this.mode.includes('webrtc/tcp') && msg.value && msg.value.includes(' udp ')) return;
                    pc.addIceCandidate({candidate: msg.value, sdpMid: '0'}).catch(er => {});
                    break;
                case 'webrtc/answer':
                    pc.setRemoteDescription({type: 'answer', sdp: msg.value}).catch(er => {});
                    break;
                case 'error':
                    if (!msg.value || !msg.value.includes('webrtc/offer')) return;
                    try { pc.close(); } catch(e) {}
                    this.onmse();
            }
        };

        this.createOffer(pc).then(offer => {
            this.send({type: 'webrtc/offer', value: offer.sdp});
        }).catch(e => {
            console.warn('[VideoRTC] createOffer failed:', e);
            this.onmse();
        });

        this.pcState = WebSocket.CONNECTING;
        this.pc = pc;
    }

    async createOffer(pc) {
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

    onmjpeg() {
        if (this.video) this.video.style.display = 'none';
        if (this.img) this.img.style.display = 'block';

        this.ondata = data => {
            if (this.img) {
                try {
                    const blob = new Blob([data], {type: 'image/jpeg'});
                    const oldUrl = this._blobUrl;
                    this._blobUrl = URL.createObjectURL(blob);
                    this.img.src = this._blobUrl;
                    if (oldUrl) {
                        setTimeout(() => { try { URL.revokeObjectURL(oldUrl); } catch(e){} }, 80);
                    }
                } catch (e) {
                    this.img.src = 'data:image/jpeg;base64,' + VideoRTC.btoa(data);
                }
            }
        };
        this.send({type: 'mjpeg'});
    }

    onsnapshot() {
        if (this.video) this.video.style.display = 'none';
        if (this.img) this.img.style.display = 'block';
        if (this.ws) { try { this.ws.close(); } catch(e){} this.ws = null; }

        if (this._snapshotTimer) clearInterval(this._snapshotTimer);

        let srcName = '';
        try {
            const parsed = new URL(this.wsURL, window.location.href);
            srcName = parsed.searchParams.get('src') || '';
        } catch(e) {
            const m = this.wsURL.match(/src=([^&]+)/);
            if (m) srcName = decodeURIComponent(m[1]);
        }

        if (!srcName) return;

        const hostUrl = this.wsURL.replace(/^ws/, 'http').split('/api/')[0];
        const snapshotUrl = hostUrl + '/api/frame.jpeg?src=' + encodeURIComponent(srcName);

        const updateFrame = () => {
            if (!this.isConnected || this.mode !== 'snapshot') {
                if (this._snapshotTimer) clearInterval(this._snapshotTimer);
                return;
            }
            const nextImg = new Image();
            nextImg.onload = () => {
                if (this.img) this.img.src = nextImg.src;
            };
            nextImg.src = snapshotUrl + '&_t=' + Date.now();
        };

        updateFrame();
        this._snapshotTimer = setInterval(updateFrame, 1500);
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

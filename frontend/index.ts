class Boom {
    width = 12000;
    height = 400;
    videoNode:HTMLVideoElement;
    timeCursorNode:HTMLDivElement;
    canvasCtx:CanvasRenderingContext2D;
    scale = 1;
    pixelsPerSecond = 30;


    realSplits = this.readSplits();

    readSplits() {
        try {
            return JSON.parse(localStorage.getItem('splits')) || [];
        } catch (err) {
            return [];
        }
    }

    saveSplits() {
        localStorage.setItem('splits', JSON.stringify(this.realSplits));
    }


    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.className = 'graph';
        canvas.style.width = `${(this.width)}px`;
        canvas.style.height = `${(this.height)}px`;
        document.body.appendChild(canvas);
        canvas.onclick = (event)=> {
            this.videoNode.currentTime = event.layerX / this.pixelsPerSecond / this.scale;
        };
        canvas.addEventListener("contextmenu", (event) => {
            var split = event.layerX / this.scale | 0;
            this.realSplits.push(split);
            this.saveSplits();
            this.renderSplit(split);
            event.preventDefault();
        });
        return canvas.getContext('2d');
    }

    readFile():Promise<Uint8Array> {
        return fetch('data.dat').then(response => response.arrayBuffer()).then(buff => new Uint8Array(buff));
    }

    renderVideo() {
        const video = document.createElement('video');
        video.className = 'video';
        video.width = 1000;
        video.controls = true;
        this.videoNode = video;
        video.src = '1.mp4';
        video.autoplay = true;
        document.body.appendChild(video);
        video.volume = 0;
        // video.playbackRate = .5;
    }

    renderRealSplits() {
        for (let i = 0; i < this.realSplits.length; i++) {
            const split = this.realSplits[i];
            this.renderSplit(split);
        }
    }

    private renderSplit(split:number) {
        const div = document.createElement('div');
        div.className = 'split';
        document.body.appendChild(div);
        div.style.left = split * this.pixelsPerSecond / 10 * this.scale + 'px';
        return div;
    }

    renderTimeCursor() {
        const div = document.createElement('div');
        this.timeCursorNode = div;
        div.className = 'time-cursor';
        document.body.appendChild(div);
    }

    renderImage() {
        const {width, height} = this;
        const ctx = this.createCanvas();
        const imd = ctx.createImageData(width, height);
        const imdd = imd.data;
        this.readFile().then(arr => {
            const perAlgHeight = 50;
            const diffHistorySize = 10;
            const colorHeight = 50;
            const lineWidth = width * 4;
            const diffHistory = [
                new Array(diffHistorySize),
                new Array(diffHistorySize),
                new Array(diffHistorySize),
                new Array(diffHistorySize)
            ];
            const prevDiff = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
            ];
            const monoColors = new Array(6);
            diffHistory.forEach(dh => dh.fill(0));
            const monochromeColorHeight = 20;

            let oldR = 0;
            let oldG = 0;
            let oldB = 0;

            let oldY = 0;
            let oldCr = 0;
            let oldCb = 0;


            let oldH = 0;
            let oldS = 0;
            let oldL = 0;


            for (let i = 1; i < width; i++) {
                const offsetLeft = i * 4;
                const k = i * 3;

                const R = arr[k];
                const G = arr[k + 1];
                const B = arr[k + 2];

                const R1 = R / 255;
                const G1 = G / 255;
                const B1 = B / 255;

                const Y = 16 + (65 * R1 + 128 * G1 + 25 * B1);
                const Cr = 255 - (128 + (112 * R1 - 93 * G1 - 18 * B1) * 10);
                const Cb = 128 + (-38 * R1 - 74 * G1 + 112 * B1) * 10;

                let H = 0;
                let S = 0;
                let L = 0;

                {
                    let max = Math.max(R1, G1, B1), min = Math.min(R1, G1, B1);
                    let h, s, l = (max + min) / 2;

                    if (max == min) {
                        h = s = 0; // achromatic
                    } else {
                        let d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                            case R1:
                                h = (G1 - B1) / d + (G1 < B1 ? 6 : 0);
                                break;
                            case G1:
                                h = (B1 - R1) / d + 2;
                                break;
                            case B1:
                                h = (R1 - G1) / d + 4;
                                break;
                        }
                        h /= 6;
                    }
                    H = h * 50 | 0;
                    S = s * 255 | 0;
                    L = l * 255 | 0;
                }

                monoColors[0] = Y;
                monoColors[1] = L;
                monoColors[2] = Cb;
                monoColors[3] = Cr;
                monoColors[4] = H;
                monoColors[5] = S;


                let offsetTop = 0;

                for (let j = 0; j < colorHeight; j++) {
                    const pos = (j * lineWidth) + offsetLeft;
                    imdd[pos] = R;
                    imdd[pos + 1] = G;
                    imdd[pos + 2] = B;
                    imdd[pos + 3] = 255;
                }

                offsetTop += colorHeight;


                for (let p = 0; p < monoColors.length; p++) {
                    const color = monoColors[p];
                    for (let j = 0; j < monochromeColorHeight - 1; j++) {
                        const pos = ((j + offsetTop) * lineWidth) + offsetLeft;
                        imdd[pos] = color;
                        imdd[pos + 1] = color;
                        imdd[pos + 2] = color;
                        imdd[pos + 3] = 255;
                    }
                    offsetTop += monochromeColorHeight;
                }


                // let prevDiff;
                for (let l = 0; l < diffHistory.length; l++) {
                    let diffAverage = 0;
                    for (let j = 0; j < diffHistorySize; j++) {
                        diffAverage += diffHistory[l][j];
                    }

                    let diff = 0;
                    switch (l) {
                        case 0:
                            diff = Math.abs(Y - oldY);
                            break;
                        case 1:
                            diff = Math.abs(L - oldL);
                            break;

                        case 2:
                            diff = Math.abs(H - oldH);
                            break;

                        case 3:
                            diff = Math.abs(S - oldS);
                            break;
                        // case 1: diff = Math.abs(Y - oldY); break;
                        // case 2: diff = Math.abs(Cb - oldCb); break;
                        // case 3: diff = Math.abs(Y - oldY); break;
                        // case 4: diff = Math.abs(Y - oldY); break;
                    }
                    // let currentDiff = Math.min(diff, perAlgHeight - 5);
                    // let currentDiff = Math.min((diff / (diffAverage / diffHistorySize) | 0), perAlgHeight - 5);
                    // let currentDiff = Math.min((diffAverage / 10), perAlgHeight - 5);
                    let currentDiff = Math.min(diff / (prevDiff[l] === 0 ? 1 : prevDiff[l]) | 0, perAlgHeight - 5);
                    // diffHistory[l][i % diffHistorySize] = diff;
                    prevDiff[l] = diff;


                    for (let j = 0; j < currentDiff; j++) {
                        const pos = ((j + offsetTop) * lineWidth) + offsetLeft;
                        imdd[pos] = 0;
                        imdd[pos + 1] = 0;
                        imdd[pos + 2] = 0;
                        imdd[pos + 3] = 255;
                    }
                    offsetTop += perAlgHeight;
                }


                oldR = R;
                oldG = G;
                oldB = B;

                oldY = Y;
                oldCr = Cr;
                oldCb = Cb;


                oldH = H;
                oldS = S;
                oldL = L;
            }
            ctx.putImageData(imd, 0, 0);
        });
    }

    updateTimeCursor = () => {
        this.timeCursorNode.style.transform = `translateX(${this.videoNode.currentTime * this.pixelsPerSecond * this.scale}px)`;
        requestAnimationFrame(this.updateTimeCursor)
    }
}

const boom = new Boom();
boom.renderVideo();
boom.renderImage();
boom.renderTimeCursor();
boom.updateTimeCursor();
boom.renderRealSplits();

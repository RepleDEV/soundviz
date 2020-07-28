const { desktopCapturer } = require("electron");

const audioContext = new AudioContext();

var WIDTH=500;
var HEIGHT=50;
var audioStream,meter,analyser;

desktopCapturer.getSources({types: ['window', 'screen']}).then(async sources => {
    for (const source of sources) {
        if (source.name === "Entire Screen") {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio:{mandatory:{chromeMediaSource:'desktop'}},
                    video:{mandatory:{chromeMediaSource:'desktop'}}
                });
                handleStream(stream);
            } catch (e) {
                console.log(e);
            }
            return;
        }
    }
});

function handleStream(stream) {
    audioStream = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    audioStream.connect(analyser)

    meter = createAudioMeter(audioContext,0.4,0.99);
    audioStream.connect(meter);

    setBrightness();
    setColor();
    updatePitch();
}

const brightnessBox = document.getElementById("box");
const colorbox = document.getElementById("colorbox");

var volume;
var pitch;
var multiplier = 2;
function setBrightness() {
    var ceil = 50;
    volume = meter.volume * 1000 * multiplier;
    volume = volume > ceil ? ceil : volume;
    volume = Math.round(map(volume,0,ceil,0,255));

    document.getElementById("volume").innerHTML = volume;
    brightnessBox.style.backgroundColor = `rgb(${volume},${volume},${volume})`;

    setTimeout(setBrightness, 25);
}

function setColor() {
    var ceil = 16000;
    var ptch = pitch > ceil ? ceil : pitch;
    ptch = map(ptch,0,ceil,0,10);

    var colors = [0,0,0];

    if (ptch < 5) {
        if (ptch < 2.5) {
            colors[2] = 255;
            colors[1] = ptch / 2.5 * 255;
        } else if (ptch > 2.5) {
            colors[1] = 255;
            colors[2] = (ptch - 2.5) / 2.5 * 255;
        } else {
            colors[1],colors[2] = 255,255;
        }
    } else if (ptch > 5) {
        if (ptch < 7.5) {
            colors[1] = 255;
            colors[0] = (ptch - 5) / 2.5 * 255;
        } else if (ptch > 7.5) {
            console.log((ptch-7.5) / 2.5 * 255);
            colors[0] = 255;
            colors[1] = (ptch - 7.5) / 2.5 * 255;
        } else {
            colors[0],colors[1] = 255,255;
        }
    } else {
        colors[1] = 255;
    }
    
    var color = `rgb(${colors[0]},${colors[1]},${colors[2]})`;
    colorbox.style.backgroundColor = color;

    setTimeout(setColor, 25);
}

function map (val, xlow, xhigh, ylow, yhigh) {
    return (val - xlow) * (yhigh - ylow) / (xhigh - xlow) + ylow;
}

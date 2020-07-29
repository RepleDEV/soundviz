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
    calculateAll();
}

const brightnessBox = document.getElementById("box");
const colorbox = document.getElementById("colorbox");
const mixbox = document.getElementById("mixbox");

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
    updateMultiplier();
    setTimeout(setBrightness, 25);
}

var multiplier_buffer = [];
var multiplier_samples = 16;

/**
   * Updates the volume multiplier variable
   @param average The expected average of the sampled volumes
   @param clip If pitch goes below this, it stops the execution of the function
*/
function updateMultiplier(average = 220, clip = 440) {
    if (pitch < clip) {
        return;
    }
    if (multiplier_buffer.length < multiplier_samples) {
        multiplier_buffer.push(volume);
        return;
    }
    var multiplier_average = multiplier_buffer.reduce((a, b) => a + b, 0) / multiplier_buffer.length;
    if (multiplier_average > average - 10 && multiplier_average < average + 10) {
        return;
    }
    if (multiplier_average < average + 10) {
        multiplier+=0.1;
    } else {
        multiplier-=0.1;
    }
    multiplier_buffer = [];
}

var colors = [0,0,0];
function setColor() {
    var ceil = 16000;
    pitch = pitch > ceil ? ceil : pitch;
    pitch = map(pitch,0,ceil,0,100);


    if (pitch < 50) {
        if (pitch < 25) {
            colors[2] = 255;
            colors[1] = pitch / 25 * 255;
        } else if (pitch > 25) {
            colors[1] = 255;
            colors[2] = 255 - (pitch / 25 * 255); 
        } else {
            colors[1],colors[2] = 255,255;
        }
        colors[0] = 0;
    } else if (pitch > 50) {
        if (pitch < 75) {
            colors[1] = 255;
            colors[0] = (pitch - 50) / 25 * 255
        } else if (pitch > 75) {
            colors[0] = 255;
            colors[1] = 255 - ((pitch - 75) / 25 * 255);
        } else {
            colors[0], colors[1] = 255,255;
        }
        colors[2] = 0;
    }
    
    var color = `rgb(${colors[0]},${colors[1]},${colors[2]})`;
    colorbox.style.backgroundColor = color;
    setTimeout(setColor, 25);
}

function calculateAll() {
    var values = colors.map(val => val * (volume / 255));
    mixbox.style.backgroundColor = `rgb(${values[0]},${values[1]},${values[2]})`;
    setTimeout(calculateAll, 25);
}

function map (val, xlow, xhigh, ylow, yhigh) {
    return (val - xlow) * (yhigh - ylow) / (xhigh - xlow) + ylow;
}

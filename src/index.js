const { desktopCapturer } = require("electron");

const audioContext = new AudioContext();

var WIDTH=500;
var HEIGHT=50;
var audioStream,meter;
var canvasContext = document.getElementById( "meter" ).getContext("2d");

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

    meter = createAudioMeter(audioContext,0.4,0.99);
    audioStream.connect(meter);

    handleAudioStream();
    drawLoop();
}

function handleAudioStream() {
    document.getElementById("volume").innerHTML = Math.floor(meter.volume*1000);
    setTimeout(handleAudioStream, 25);
}

function drawLoop( time ) {
    // clear the background
    canvasContext.clearRect(0,0,WIDTH,HEIGHT);

    // check if we're currently clipping
    if (meter.checkClipping())
        canvasContext.fillStyle = "red";
    else
        canvasContext.fillStyle = "green";

    // draw a bar based on the current volume
    canvasContext.fillRect(0, 0, meter.volume*WIDTH*1.4, HEIGHT);

    // set up the next visual callback
    rafID = window.requestAnimationFrame( drawLoop );
}
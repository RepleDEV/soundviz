const { desktopCapturer } = require("electron");

const audioContext = new AudioContext();

var WIDTH=500;
var HEIGHT=50;
var audioStream,meter,analyser;
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

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    meter = createAudioMeter(audioContext,0.4,0.99);
    audioStream.connect(meter);
    audioStream.connect(analyser)

    // handleAudioStream();
    drawLoop();
    updatePitch();
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

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be
var buf = new Float32Array( 1024 );
function autoCorrelate( buf, sampleRate ) {
	var SIZE = buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
    rms = Math.sqrt(rms/SIZE);
	// if (rms<0.01) // not enough signal
	// 	return -1;

	var lastCorrelation=1;
	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
			// Now we need to tweak the offset - by interpolating between the values to the left and right of the
			// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
			// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
			// (anti-aliased) offset.

			// we know best_offset >=1, 
			// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
			// we can't drop into this clause until the following pass (else if).
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
    }
	if (best_correlation > 0.01) {
		// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return sampleRate/best_offset;
	}
	return -1;
//	var best_frequency = sampleRate/best_offset;
}

function updatePitch() {
    analyser.getFloatTimeDomainData( buf );
    var ac = autoCorrelate( buf, audioContext.sampleRate );
    document.getElementById("pitch").innerHTML = Math.floor(map(Math.floor(ac), -1, 20000, 0, 255));
    setTimeout(updatePitch, 10);
}

function map (val, xlow, xhigh, ylow, yhigh) {
    return (val - xlow) * (yhigh - ylow) / (xhigh - xlow) + ylow;
}
import { pipeline, env } from '@xenova/transformers';

// Disable local loading to force downloading from huggingface
env.allowLocalModels = false;

let pipe = null;

self.onmessage = async (e) => {
    const { type, audio } = e.data;

    if (type === 'load') {
        self.postMessage({ status: 'loading' });
        try {
            pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                progress_callback: (data) => {
                    self.postMessage({ status: 'progress', data });
                }
            });
            self.postMessage({ status: 'ready' });
        } catch (err) {
            self.postMessage({ status: 'error', error: err.message });
        }
    } else if (type === 'transcribe') {
        if (!pipe) {
            self.postMessage({ status: 'error', error: 'Pipeline not loaded' });
            return;
        }

        self.postMessage({ status: 'transcribing' });

        try {
            const result = await pipe(audio, {
                language: 'english',
                task: 'transcribe',
            });

            // Handle different output formats from transformers.js
            let textOutput = "";
            if (typeof result === 'string') {
                textOutput = result;
            } else if (result.text) {
                textOutput = result.text;
            } else if (Array.isArray(result) && result[0] && result[0].text) {
                textOutput = result[0].text;
            } else {
                textOutput = JSON.stringify(result);
            }

            self.postMessage({ status: 'complete', text: textOutput });
        } catch (err) {
            self.postMessage({ status: 'error', error: err.message });
        }
    }
};

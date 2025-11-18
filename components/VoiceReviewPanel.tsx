
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { DocContent } from '../types';

interface VoiceReviewPanelProps {
  docContent: DocContent;
  onClose: () => void;
}

const VoiceReviewPanel: React.FC<VoiceReviewPanelProps> = ({ docContent, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const [isTalking, setIsTalking] = useState(false);
  
  // Transcription State
  const [transcriptionHistory, setTranscriptionHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [currentLiveText, setCurrentLiveText] = useState<{role: 'user' | 'model', text: string} | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Audio state management
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Transcription Buffers
  const inputBufferRef = useRef('');
  const outputBufferRef = useRef('');
  
  // Track mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
      isMountedRef.current = true;
      // Auto-scroll to bottom of transcript
      if (historyEndRef.current) {
          historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      return () => { isMountedRef.current = false; };
  }, [transcriptionHistory, currentLiveText]);

  useEffect(() => {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      setStatus('error');
      return;
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const startSession = async () => {
      try {
        // Initialize Audio Contexts
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        inputAudioContextRef.current = inputAudioContext;
        audioContextRef.current = outputAudioContext;

        // Get Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const config = {
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: `You are a helpful and friendly document review assistant. 
            You have access to the user's document content below. 
            Answer questions about the document, summarize it, or discuss specific sections. 
            Be concise and conversational.
            
            --- DOCUMENT CONTENT ---
            ${docContent.fullText}
            --- END CONTENT ---
            `,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
          },
        };

        const sessionPromise = ai.live.connect({
          ...config,
          callbacks: {
            onopen: () => {
              if (!isMountedRef.current) return;
              setStatus('connected');
              
              // Setup Input Stream Processing
              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              
              sourceRef.current = source;
              processorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                if (!isMountedRef.current) return;
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                
                // Downsample/Encode to PCM
                const pcmData = floatTo16BitPCM(inputData);
                const base64Data = arrayBufferToBase64(pcmData);

                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                  });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!isMountedRef.current) return;

              // Audio Handling
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              
              if (base64Audio) {
                setIsTalking(true);
                const audioData = base64ToArrayBuffer(base64Audio);
                
                try {
                   const audioBuffer = await decodeAudioData(
                        audioData, 
                        outputAudioContext, 
                        24000, 
                        1
                   );
                   
                   const source = outputAudioContext.createBufferSource();
                   source.buffer = audioBuffer;
                   source.connect(outputAudioContext.destination);
                   
                   // Simple scheduling
                   const currentTime = outputAudioContext.currentTime;
                   const startTime = Math.max(currentTime, nextStartTimeRef.current);
                   source.start(startTime);
                   nextStartTimeRef.current = startTime + audioBuffer.duration;
                   
                   sourcesRef.current.add(source);
                   source.onended = () => {
                       sourcesRef.current.delete(source);
                       if (sourcesRef.current.size === 0 && isMountedRef.current) {
                           setIsTalking(false);
                           // Reset time if gap is too large
                           if (outputAudioContext.currentTime > nextStartTimeRef.current + 0.5) {
                               nextStartTimeRef.current = outputAudioContext.currentTime;
                           }
                       }
                   };

                } catch (e) {
                    console.error("Audio decode error", e);
                }
              }

              // Transcription Handling
              if (message.serverContent?.inputTranscription) {
                  const text = message.serverContent.inputTranscription.text;
                  inputBufferRef.current += text;
                  // If user interrupts, clear output buffer
                  if (outputBufferRef.current) {
                      outputBufferRef.current = ''; 
                  }
                  setCurrentLiveText({ role: 'user', text: inputBufferRef.current });
              }
              
              if (message.serverContent?.outputTranscription) {
                  const text = message.serverContent.outputTranscription.text;
                  outputBufferRef.current += text;
                  setCurrentLiveText({ role: 'model', text: outputBufferRef.current });
              }

              // Handle turn completion to commit to history
              if (message.serverContent?.turnComplete) {
                  const userInput = inputBufferRef.current;
                  const modelOutput = outputBufferRef.current;

                  setTranscriptionHistory(prev => {
                      const newItems = [];
                      if (userInput) newItems.push({ role: 'user' as const, text: userInput });
                      if (modelOutput) newItems.push({ role: 'model' as const, text: modelOutput });
                      return [...prev, ...newItems];
                  });

                  inputBufferRef.current = '';
                  outputBufferRef.current = '';
                  setCurrentLiveText(null);
              }
            },
            onclose: () => {
              if (isMountedRef.current) setStatus('closed');
            },
            onerror: (err) => {
              console.error(err);
              if (isMountedRef.current) setStatus('error');
            }
          }
        });

      } catch (err) {
        console.error("Failed to initialize Live API", err);
        if (isMountedRef.current) setStatus('error');
      }
    };

    startSession();

    return () => {
        // Cleanup
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        // Stop all currently playing sources
        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        sourcesRef.current.clear();
    };
  }, [docContent.fullText]);

  // Helper functions for Audio Processing
  function floatTo16BitPCM(output: Float32Array) {
    const buffer = new ArrayBuffer(output.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < output.length; i++) {
      let s = Math.max(-1, Math.min(1, output[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(i * 2, s, true);
    }
    return buffer;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64: string) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function decodeAudioData(
      data: ArrayBuffer, 
      ctx: AudioContext, 
      sampleRate: number,
      numChannels: number
    ): Promise<AudioBuffer> {
      const dataInt16 = new Int16Array(data);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
           // Convert int16 to float
           channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }
      return buffer;
    }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden relative">
        
        {/* Visualizer Header */}
        <div className="p-8 text-center relative flex-shrink-0">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-purple-500 to-brand-red transition-opacity duration-500 ${isTalking ? 'opacity-100' : 'opacity-20'}`}></div>

            <div className="mb-4 relative">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${isTalking ? 'bg-brand-blue bg-opacity-20 scale-110' : 'bg-gray-800'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-blue to-blue-600 shadow-lg ${isTalking ? 'animate-pulse' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
            </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Talk to your Document</h2>
            {status === 'connecting' && <p className="text-sm text-gray-400 animate-pulse">Connecting to Gemini Live...</p>}
            {status === 'connected' && <p className="text-sm text-green-400">Online • Listening</p>}
            {status === 'error' && <p className="text-sm text-red-400">Connection failed.</p>}
            {status === 'closed' && <p className="text-sm text-gray-500">Session ended.</p>}
        </div>

        {/* Transcript Area */}
        <div className="flex-1 bg-gray-950 border-t border-gray-800 p-4 overflow-y-auto space-y-4 min-h-[300px]">
             {transcriptionHistory.map((item, idx) => (
                 <div key={idx} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                         item.role === 'user' 
                         ? 'bg-brand-blue text-white rounded-tr-none'
                         : 'bg-gray-800 text-gray-200 rounded-tl-none'
                     }`}>
                         {item.text}
                     </div>
                 </div>
             ))}
             {currentLiveText && (
                 <div className={`flex ${currentLiveText.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm opacity-80 ${
                         currentLiveText.role === 'user' 
                         ? 'bg-brand-blue text-white rounded-tr-none'
                         : 'bg-gray-800 text-gray-200 rounded-tl-none'
                     }`}>
                         {currentLiveText.text}
                         <span className="inline-block w-1 h-4 ml-1 align-middle bg-current animate-pulse"></span>
                     </div>
                 </div>
             )}
             <div ref={historyEndRef} />
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold transition-colors border border-red-500/50"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceReviewPanel;


import React, { useState, useCallback } from 'react';
import {
  getDocumentContent,
} from '../services/googleApiService';
import {
  generateSuggestionsForAddressingComments,
  generateSuggestionsForNewComments,
  verifyDocumentFacts,
  generateDeepPolish,
  suggestVisualEnhancements,
  generateNanoBananaImage
} from '../services/geminiService';
import type {
  GoogleDoc,
  AddressedCommentSuggestion,
  NewCommentSuggestion,
  DocContent,
  FactCheckResult,
  DeepPolishResult,
  ImageSuggestion
} from '../types';
import { ReviewMode } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ResultsDisplay from './ResultsDisplay';
import ChatPanel from './ChatPanel';
import VoiceReviewPanel from './VoiceReviewPanel';

interface ReviewDashboardProps {
  doc: GoogleDoc;
  onBack: () => void;
  accessToken: string;
}

const AddressCommentsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const AddCommentsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const FactCheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const DeepPolishIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const NanoBananaIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);


const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ doc, onBack, accessToken }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [suggestions, setSuggestions] = useState<
    (AddressedCommentSuggestion | NewCommentSuggestion)[] | null
  >(null);
  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  const [deepPolishResult, setDeepPolishResult] = useState<DeepPolishResult | null>(null);
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestion[] | null>(null);
  
  const [reviewMode, setReviewMode] = useState<ReviewMode | null>(null);
  const [activeChatContext, setActiveChatContext] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [docContentForVoice, setDocContentForVoice] = useState<DocContent | null>(null);
  
  const [currentReviewDocContent, setCurrentReviewDocContent] = useState<DocContent | null>(null);

  const handleReview = useCallback(async (mode: ReviewMode) => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setFactCheckResult(null);
    setDeepPolishResult(null);
    setImageSuggestions(null);
    setReviewMode(mode);
    setActiveChatContext(null);
    setCurrentReviewDocContent(null);

    try {
      // 1. Fetch document content
      const docContent: DocContent = await getDocumentContent(doc.id, accessToken);
      setCurrentReviewDocContent(docContent);
      
      if (mode === ReviewMode.AddressComments && docContent.comments.length === 0) {
        setError("This document has no comments to review. Try 'Suggest New Comments' instead.");
        setLoading(false);
        return;
      }

      // 2. Call Gemini service based on the selected mode
      if (mode === ReviewMode.AddressComments) {
        const result = await generateSuggestionsForAddressingComments(docContent);
        setSuggestions(result);
      } else if (mode === ReviewMode.AddNewComments) {
        const result = await generateSuggestionsForNewComments(docContent);
        setSuggestions(result);
      } else if (mode === ReviewMode.FactCheck) {
        const result = await verifyDocumentFacts(docContent);
        setFactCheckResult(result);
      } else if (mode === ReviewMode.DeepPolish) {
        const result = await generateDeepPolish(docContent);
        setDeepPolishResult(result);
      } else if (mode === ReviewMode.VisualEnhancements) {
          // Step 1: Suggest
          const suggestions = await suggestVisualEnhancements(docContent);
          setImageSuggestions(suggestions);
          
          // Step 2: Generate images concurrently (Nano Banana)
          // We don't await this here so the UI can show the placeholders immediately
          suggestions.forEach(async (s) => {
              try {
                  // Update status to loading
                  setImageSuggestions(prev => prev ? prev.map(p => p.id === s.id ? {...p, status: 'loading'} : p) : null);
                  
                  // Generate
                  const base64Data = await generateNanoBananaImage(s.suggestedPrompt);
                  
                  // Update with image
                  setImageSuggestions(prev => prev ? prev.map(p => p.id === s.id ? {...p, imageData: base64Data, status: 'generated'} : p) : null);
              } catch (e) {
                   setImageSuggestions(prev => prev ? prev.map(p => p.id === s.id ? {...p, status: 'error'} : p) : null);
              }
          });
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while generating suggestions. Please ensure you have access to this document.');
    } finally {
      setLoading(false);
    }
  }, [doc.id, accessToken]);

  const handleStartVoice = async () => {
      setLoading(true);
      try {
        const content = await getDocumentContent(doc.id, accessToken);
        setDocContentForVoice(content);
        setIsVoiceActive(true);
      } catch (e) {
        setError("Could not load document for voice session.");
      } finally {
        setLoading(false);
      }
  };
  
  const resetState = () => {
    setSuggestions(null);
    setFactCheckResult(null);
    setDeepPolishResult(null);
    setImageSuggestions(null);
    setError(null);
    setReviewMode(null);
    setActiveChatContext(null);
    setCurrentReviewDocContent(null);
  }

  const handleAcceptSuggestion = (id: string) => {
    if (!suggestions) return;
    const updated = suggestions.map(s => 
        s.id === id ? { ...s, status: 'accepted' as const } : s
    );
    setSuggestions(updated);
  };

  const handleDismissSuggestion = (id: string) => {
    if (!suggestions) return;
    const updated = suggestions.map(s => 
        s.id === id ? { ...s, status: 'dismissed' as const } : s
    );
    setSuggestions(updated);
  };

  const handleDiscussSuggestion = (id: string) => {
    let item: any = null;
    if (suggestions) {
        item = suggestions.find(s => s.id === id);
    } else if (imageSuggestions) {
        item = imageSuggestions.find(s => s.id === id);
    }

    if (item) {
        const context = JSON.stringify(item, null, 2);
        setActiveChatContext(context);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)]">
        {/* Main Content Area */}
        <div className={`flex-1 overflow-y-auto pr-2 ${activeChatContext ? 'w-2/3' : 'w-full'}`}>
            <div className="space-y-6 pb-10">
                <div className="flex items-center justify-between">
                    <div>
                        <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-brand-blue mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to documents
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">{doc.name}</h1>
                        <p className="text-gray-500">Ready to review with Gemini 2.5</p>
                    </div>
                    <button 
                        onClick={handleStartVoice}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-brand-red to-brand-yellow text-white font-bold rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        Talk to Doc
                    </button>
                </div>

                {/* Selection Grid */}
                {!reviewMode && !loading && (
                    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Choose a Review Option</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <button
                                onClick={() => handleReview(ReviewMode.AddressComments)}
                                className="p-6 border rounded-lg text-left hover:shadow-xl hover:border-brand-blue transition-all duration-200 flex flex-col items-center text-center group bg-gray-50 hover:bg-white"
                            >
                                <div className="transform group-hover:scale-110 transition-transform duration-200">
                                    <AddressCommentsIcon />
                                </div>
                                <h3 className="font-semibold text-lg text-gray-800 mt-3">Address Comments</h3>
                                <p className="text-gray-600 mt-1 text-sm">
                                    Resolve existing comments.
                                </p>
                            </button>
                            <button
                                onClick={() => handleReview(ReviewMode.AddNewComments)}
                                className="p-6 border rounded-lg text-left hover:shadow-xl hover:border-brand-blue transition-all duration-200 flex flex-col items-center text-center group bg-gray-50 hover:bg-white"
                            >
                                <div className="transform group-hover:scale-110 transition-transform duration-200">
                                    <AddCommentsIcon />
                                </div>
                                <h3 className="font-semibold text-lg text-gray-800 mt-3">Suggest New Comments</h3>
                                <p className="text-gray-600 mt-1 text-sm">
                                    Critique tone & structure.
                                </p>
                            </button>
                            <button
                                onClick={() => handleReview(ReviewMode.FactCheck)}
                                className="p-6 border rounded-lg text-left hover:shadow-xl hover:border-brand-blue transition-all duration-200 flex flex-col items-center text-center group bg-gray-50 hover:bg-white"
                            >
                                <div className="transform group-hover:scale-110 transition-transform duration-200">
                                    <FactCheckIcon />
                                </div>
                                <h3 className="font-semibold text-lg text-gray-800 mt-3">Fact Check</h3>
                                <p className="text-gray-600 mt-1 text-sm">
                                    Verify claims with Google Search.
                                </p>
                            </button>
                             <button
                                onClick={() => handleReview(ReviewMode.DeepPolish)}
                                className="p-6 border rounded-lg text-left hover:shadow-xl hover:border-purple-500 transition-all duration-200 flex flex-col items-center text-center group bg-purple-50 hover:bg-white border-purple-100"
                            >
                                <div className="transform group-hover:scale-110 transition-transform duration-200">
                                    <DeepPolishIcon />
                                </div>
                                <h3 className="font-semibold text-lg text-purple-900 mt-3">Deep Polish</h3>
                                <p className="text-purple-700 mt-1 text-sm">
                                    World-class rewrite using <strong>Thinking</strong>.
                                </p>
                            </button>
                             <button
                                onClick={() => handleReview(ReviewMode.VisualEnhancements)}
                                className="p-6 border rounded-lg text-left hover:shadow-xl hover:border-yellow-500 transition-all duration-200 flex flex-col items-center text-center group bg-yellow-50 hover:bg-white border-yellow-100 col-span-1 md:col-span-2 lg:col-span-1"
                            >
                                <div className="transform group-hover:scale-110 transition-transform duration-200">
                                    <NanoBananaIcon />
                                </div>
                                <h3 className="font-semibold text-lg text-yellow-800 mt-3">Nano Banana</h3>
                                <p className="text-yellow-700 mt-1 text-sm">
                                    Generate relevant images with <strong>Flash Image</strong>.
                                </p>
                            </button>
                        </div>
                        {error && <div className="mt-6 text-center p-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-xl shadow-lg h-64">
                        <LoadingSpinner />
                        <p className="mt-6 text-gray-700 font-medium text-lg">Gemini is working...</p>
                        <p className="text-sm text-gray-500 mt-2">Analyzing document content and context</p>
                    </div>
                )}
                
                {/* Result Views */}
                {(suggestions || factCheckResult || deepPolishResult || imageSuggestions) && reviewMode !== null && (
                    <ResultsDisplay
                        suggestions={suggestions || []}
                        factCheckResult={factCheckResult}
                        deepPolishResult={deepPolishResult}
                        imageSuggestions={imageSuggestions}
                        reviewMode={reviewMode}
                        docContent={currentReviewDocContent}
                        onStartNewReview={resetState}
                        onAccept={handleAcceptSuggestion}
                        onDismiss={handleDismissSuggestion}
                        onDiscuss={handleDiscussSuggestion}
                    />
                )}
            </div>
        </div>

        {/* Slide-over Chat Panel */}
        {activeChatContext && (
            <div className="fixed inset-y-0 right-0 pt-16 sm:relative sm:pt-0 sm:inset-auto z-20 h-full">
                <ChatPanel 
                    contextData={activeChatContext} 
                    onClose={() => setActiveChatContext(null)} 
                />
            </div>
        )}
        
        {/* Voice Agent Overlay */}
        {isVoiceActive && docContentForVoice && (
            <VoiceReviewPanel 
                docContent={docContentForVoice} 
                onClose={() => { setIsVoiceActive(false); setDocContentForVoice(null); }}
            />
        )}
    </div>
  );
};

export default ReviewDashboard;

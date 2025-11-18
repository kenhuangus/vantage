
import React, { useState } from 'react';
import type { AddressedCommentSuggestion, NewCommentSuggestion, FactCheckResult, DeepPolishResult, ImageSuggestion, DocContent } from '../types';
import { ReviewMode } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ResultsDisplayProps {
  suggestions: (AddressedCommentSuggestion | NewCommentSuggestion)[];
  factCheckResult: FactCheckResult | null;
  deepPolishResult: DeepPolishResult | null;
  imageSuggestions: ImageSuggestion[] | null;
  reviewMode: ReviewMode;
  docContent: DocContent | null;
  onStartNewReview: () => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onDiscuss: (id: string) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    suggestions, 
    factCheckResult,
    deepPolishResult,
    imageSuggestions,
    reviewMode, 
    docContent,
    onStartNewReview,
    onAccept,
    onDismiss,
    onDiscuss
}) => {
    const [insertedImageIds, setInsertedImageIds] = useState<Set<string>>(new Set());
    const [showFullDocPreview, setShowFullDocPreview] = useState(false);

    let title = '';
    let description = '';

    switch (reviewMode) {
        case ReviewMode.AddressComments:
            title = 'Suggestions for Addressing Comments';
            description = 'Gemini has analyzed the existing comments and provided actionable suggestions.';
            break;
        case ReviewMode.AddNewComments:
            title = 'Suggested New Comments';
            description = 'Gemini has reviewed the document and suggested the following new comments for improvement.';
            break;
        case ReviewMode.FactCheck:
            title = 'Fact Check Results';
            description = 'Gemini has verified the document claims using Google Search.';
            break;
        case ReviewMode.DeepPolish:
            title = 'Deep Polish & Rewrite';
            description = 'Gemini 3.0 Pro has re-imagined your document with deep reasoning.';
            break;
        case ReviewMode.VisualEnhancements:
            title = 'Nano Banana Visuals';
            description = 'Gemini 2.5 Flash Image has generated visual assets to enhance engagement.';
            break;
    }

    const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
    const resolvedCount = suggestions.length - pendingSuggestions.length;

    const handleInsertImage = (id: string) => {
        setInsertedImageIds(prev => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    };

    const generateFullDocumentPreview = () => {
        if (!docContent) return null;
        
        // Start with full text
        let contentElements: React.ReactNode[] = [docContent.fullText];

        // Iteratively split and insert images
        insertedImageIds.forEach(imgId => {
            const img = imageSuggestions?.find(i => i.id === imgId);
            if (!img || !img.imageData) return;
            
            const newElements: React.ReactNode[] = [];
            let inserted = false;

            contentElements.forEach(elem => {
                if (typeof elem === 'string' && !inserted) {
                    const parts = elem.split(img.placementContext);
                    if (parts.length > 1) {
                        // Found the context. Insert after the first occurrence.
                        newElements.push(parts[0]);
                        
                        // Highlight the context text
                        newElements.push(<span key={`ctx-${imgId}`} className="bg-yellow-100 border-b-2 border-yellow-300 px-1">{img.placementContext}</span>);
                        
                        // Insert the image
                        newElements.push(
                            <div key={`img-block-${imgId}`} className="my-8 flex flex-col items-center bg-gray-50 p-4 rounded-lg border border-gray-100 w-full">
                                 <img src={`data:image/png;base64,${img.imageData}`} className="max-w-full h-auto max-h-[500px] rounded shadow-md object-contain" alt="AI Generated" />
                                 <p className="text-sm text-gray-500 mt-2 italic text-center max-w-lg">{img.rationale}</p>
                            </div>
                        );
                        
                        // Rejoin the rest
                        newElements.push(parts.slice(1).join(img.placementContext));
                        inserted = true;
                    } else {
                        newElements.push(elem);
                    }
                } else {
                    newElements.push(elem);
                }
            });
            contentElements = newElements;
        });

        return (
            <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-800">
                {contentElements}
            </div>
        );
    };

  return (
    <>
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg relative">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-gray-500 mt-1">{description}</p>
            {resolvedCount > 0 && (
                <p className="text-xs font-medium text-green-600 mt-2 bg-green-50 inline-block px-2 py-1 rounded-full">
                    {resolvedCount} suggestions resolved
                </p>
            )}
             {reviewMode === ReviewMode.VisualEnhancements && insertedImageIds.size > 0 && (
                 <button 
                    onClick={() => setShowFullDocPreview(true)}
                    className="mt-4 flex items-center px-5 py-2 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Whole Document ({insertedImageIds.size} images)
                 </button>
            )}
        </div>
        <button onClick={onStartNewReview} className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-lg hover:bg-gray-200 focus:outline-none">
            Start Over
        </button>
      </div>

      <div className="space-y-6">
        {/* FACT CHECK VIEW */}
        {reviewMode === ReviewMode.FactCheck && factCheckResult && (
             <div className="space-y-4">
                 <div className="prose prose-blue max-w-none text-gray-800 bg-gray-50 p-6 rounded-lg border border-gray-100 whitespace-pre-wrap">
                     {factCheckResult.text}
                 </div>
                 
                 {factCheckResult.groundingChunks && factCheckResult.groundingChunks.length > 0 && (
                     <div className="mt-6">
                         <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Sources Verified</h3>
                         <ul className="grid grid-cols-1 gap-3">
                             {factCheckResult.groundingChunks.map((chunk, idx) => (
                                 chunk.web ? (
                                    <li key={idx} className="bg-white border rounded p-3 hover:border-brand-blue transition-colors">
                                        <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-start">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-blue mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                            <div>
                                                <div className="text-sm font-medium text-blue-600 hover:underline">{chunk.web.title}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-md">{chunk.web.uri}</div>
                                            </div>
                                        </a>
                                    </li>
                                 ) : null
                             ))}
                         </ul>
                     </div>
                 )}
             </div>
        )}

        {/* DEEP POLISH VIEW */}
        {reviewMode === ReviewMode.DeepPolish && deepPolishResult && (
            <div className="space-y-6">
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                    <h3 className="text-sm font-bold text-purple-800 uppercase tracking-wider mb-3">Critique & Reasoning</h3>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed italic">
                        {deepPolishResult.critique}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4 bg-gray-50 opacity-70">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b">Original Text</h3>
                        <div className="text-sm text-gray-600 whitespace-pre-wrap font-serif">
                            {deepPolishResult.originalText}
                        </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-white border-brand-blue shadow-sm">
                        <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-4 pb-2 border-b">Polished Rewrite</h3>
                        <div className="text-sm text-gray-900 whitespace-pre-wrap font-serif leading-relaxed">
                            {deepPolishResult.rewrittenText}
                        </div>
                         <button 
                            className="mt-4 w-full py-2 bg-brand-blue text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                            onClick={() => { navigator.clipboard.writeText(deepPolishResult.rewrittenText) }}
                         >
                             Copy Rewrite
                         </button>
                    </div>
                </div>
            </div>
        )}

        {/* VISUAL ENHANCEMENTS (NANO BANANA) VIEW */}
        {reviewMode === ReviewMode.VisualEnhancements && imageSuggestions && (
            <div className="grid grid-cols-1 gap-8">
                {imageSuggestions.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Context & Rationale */}
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Placement Context</span>
                                    <p className="mt-1 p-3 bg-yellow-50 text-gray-800 text-sm font-serif border-l-4 border-yellow-400 rounded-r-md">
                                        "...{item.placementContext}..."
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Rationale</span>
                                    <p className="text-sm text-gray-600 mt-1">{item.rationale}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Prompt Used</span>
                                    <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded mt-1 border">
                                        {item.suggestedPrompt}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Right: Generated Image */}
                            <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg min-h-[250px] relative overflow-hidden group">
                                {item.status === 'loading' && (
                                    <div className="text-center">
                                        <LoadingSpinner />
                                        <p className="text-xs text-gray-500 mt-2">Generating Image...</p>
                                    </div>
                                )}
                                {item.status === 'error' && (
                                    <div className="text-center text-red-500 p-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm">Generation Failed</p>
                                    </div>
                                )}
                                {item.status === 'generated' && item.imageData && (
                                    <>
                                        <img 
                                            src={`data:image/png;base64,${item.imageData}`} 
                                            alt="AI Generated" 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 space-y-2">
                                            <button 
                                                className="bg-white text-gray-800 px-4 py-2 rounded-full font-medium shadow-lg hover:bg-gray-100 transform hover:scale-105 transition-all w-40"
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `data:image/png;base64,${item.imageData}`;
                                                    link.download = `vantage-generated-${item.id}.png`;
                                                    link.click();
                                                }}
                                            >
                                                Download
                                            </button>
                                            <button 
                                                className="bg-brand-blue text-white px-4 py-2 rounded-full font-medium shadow-lg hover:bg-blue-600 transform hover:scale-105 transition-all w-40"
                                                onClick={() => onDiscuss(item.id!)}
                                            >
                                                Discuss
                                            </button>
                                            {!insertedImageIds.has(item.id!) ? (
                                                <button 
                                                    className="bg-green-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:bg-green-600 transform hover:scale-105 transition-all w-40 flex items-center justify-center"
                                                    onClick={() => handleInsertImage(item.id!)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                    </svg>
                                                    Insert
                                                </button>
                                            ) : (
                                                <div className="bg-green-700 text-white px-4 py-2 rounded-full font-medium shadow-lg w-40 text-center flex items-center justify-center cursor-default">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    Inserted
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* SUGGESTIONS LIST */}
        {(reviewMode === ReviewMode.AddressComments || reviewMode === ReviewMode.AddNewComments) && pendingSuggestions.map((suggestion, index) => (
          <div key={suggestion.id || index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            {reviewMode === ReviewMode.AddressComments ? (
              <AddressCommentCard 
                suggestion={suggestion as AddressedCommentSuggestion} 
                onAccept={() => onAccept(suggestion.id!)}
                onDismiss={() => onDismiss(suggestion.id!)}
                onDiscuss={() => onDiscuss(suggestion.id!)}
              />
            ) : (
              <NewCommentCard 
                suggestion={suggestion as NewCommentSuggestion} 
                onAccept={() => onAccept(suggestion.id!)}
                onDismiss={() => onDismiss(suggestion.id!)}
                onDiscuss={() => onDiscuss(suggestion.id!)}
              />
            )}
          </div>
        ))}
        
        {(reviewMode === ReviewMode.AddressComments || reviewMode === ReviewMode.AddNewComments) && pendingSuggestions.length === 0 && suggestions.length > 0 && (
            <div className="text-center py-10 px-4 bg-green-50 rounded-lg border border-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">All Suggestions Resolved!</h3>
                <p className="mt-1 text-sm text-gray-500">Great job reviewing the document.</p>
            </div>
        )}
      </div>
    </div>

    {/* Full Document Preview Modal */}
    {showFullDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFullDocPreview(false)}></div>
            <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Document Preview
                    </h3>
                    <button onClick={() => setShowFullDocPreview(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 sm:p-12 bg-white">
                    {generateFullDocumentPreview()}
                </div>
            </div>
        </div>
    )}
    </>
  );
};

interface CardActionsProps {
    onAccept: () => void;
    onDismiss: () => void;
    onDiscuss: () => void;
}

const CardActions: React.FC<CardActionsProps> = ({ onAccept, onDismiss, onDiscuss }) => (
    <div className="bg-white px-4 py-3 border-t flex justify-between items-center">
        <button 
            onClick={onDiscuss}
            className="text-brand-blue text-sm font-medium hover:text-blue-800 flex items-center"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Discuss
        </button>
        <div className="flex space-x-3">
            <button 
                onClick={onDismiss}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Dismiss suggestion"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <button 
                onClick={onAccept}
                className="flex items-center px-3 py-1.5 bg-brand-green text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Accept
            </button>
        </div>
    </div>
);

const AddressCommentCard: React.FC<{ suggestion: AddressedCommentSuggestion } & CardActionsProps> = ({ suggestion, ...actions }) => {
  const { originalComment, suggestion: geminiSuggestion } = suggestion;
  return (
    <div>
        <div className="bg-gray-50 p-4 border-b grid grid-cols-12 gap-4">
            <div className="col-span-1">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {originalComment.author.charAt(0)}
                </div>
            </div>
            <div className="col-span-11">
                <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-gray-700">{originalComment.author}</p>
                </div>
                <p className="text-gray-800 mt-1 text-sm">"{originalComment.text}"</p>
                <div className="mt-2 text-xs text-gray-500 bg-white border p-2 rounded inline-block">
                    <span className="font-medium">Selected text:</span> {originalComment.associatedText}
                </div>
            </div>
        </div>
        <div className="bg-green-50 p-4 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
            <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2 flex items-center">
                Gemini Resolution
            </p>
            <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{geminiSuggestion}</p>
        </div>
        <CardActions {...actions} />
    </div>
  );
};

const NewCommentCard: React.FC<{ suggestion: NewCommentSuggestion } & CardActionsProps> = ({ suggestion, ...actions }) => {
  const { originalText, suggestedComment } = suggestion;
  return (
    <div>
        <div className="bg-gray-50 p-4 border-b">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Document Context</p>
            <p className="text-gray-600 bg-white border p-3 rounded-md font-serif text-sm border-l-4 border-l-yellow-400">{originalText}</p>
        </div>
        <div className="bg-yellow-50 p-4">
             <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-2 flex items-center">
                Suggested Comment
            </p>
            <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-yellow-200 flex-shrink-0 flex items-center justify-center mr-3 mt-0.5">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-700" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                </div>
                <p className="text-gray-800 italic text-sm">"{suggestedComment}"</p>
            </div>
        </div>
        <CardActions {...actions} />
    </div>
  );
};


export default ResultsDisplay;
